import {
	MaxFileSizeExceededError,
	parseFormData,
} from "@mjackson/form-data-parser";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import ContentRepeaterFileValidator from "./FileValidator";
import { BackendContext } from "~/backend.server/context";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { BASE_UPLOAD_PATH } from "~/utils/paths";

export default class ContentRepeaterPreUploadFile {
	static async loader() {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	static async action({
		request,
		params,
	}: {
		request: Request;
		params: { lang?: string };
	}) {
		if (request.method !== "POST") {
			return new Response(JSON.stringify({ error: "Method not allowed" }), {
				status: 405,
				headers: { "Content-Type": "application/json" },
			});
		}

		const ctx = new BackendContext({ params });

		try {
			const countryAccountsId = await getCountryAccountsIdFromSession(request);

			const formData = await parseFormData(request, {
				maxFileSize: ContentRepeaterFileValidator.maxFileSize,
			});

			const originalFilename = formData.get("filename");
			const uploadedFile = formData.get("file");
			const tempFilenamePrev = formData.get("temp_filename_prev");

			if (
				typeof originalFilename !== "string" ||
				!(uploadedFile instanceof File)
			) {
				return new Response(
					JSON.stringify({ error: "Missing required form data" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			if (!ContentRepeaterFileValidator.isValidExtension(originalFilename)) {
				return new Response(JSON.stringify({ error: "Invalid file type." }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			if (!ContentRepeaterFileValidator.isValidSize(uploadedFile.size)) {
				return new Response(
					JSON.stringify({
						error: ctx.t(
							{
								code: "content_repeater.file_upload_max_size_error",
								desc: "{maxSizeMB} is replaced with the max file size in MB.",
								msg: "An error occurred while processing the file upload, the file is more than {maxSizeMB}MB size limit",
							},
							{
								maxSizeMB:
									ContentRepeaterFileValidator.maxFileSize / (1024 * 1024),
							},
						),
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const safeOriginalFilename = path.basename(originalFilename);
			const extension = path.extname(safeOriginalFilename).toLowerCase();
			const baseName = path.basename(safeOriginalFilename, extension);
			const tempFilename = `${randomUUID()}__${baseName}${extension}`;

			const tenantPath = countryAccountsId
				? path.join(BASE_UPLOAD_PATH, `tenant-${countryAccountsId}`)
				: BASE_UPLOAD_PATH;
			const tenantRoot = path.resolve(tenantPath);
			const tempDirectory = path.resolve(tenantRoot, "temp");
			const tempFilePath = path.resolve(tempDirectory, tempFilename);

			if (
				!(
					tempDirectory === tenantRoot ||
					tempDirectory.startsWith(`${tenantRoot}${path.sep}`)
				) ||
				!(
					tempFilePath === tempDirectory ||
					tempFilePath.startsWith(`${tempDirectory}${path.sep}`)
				)
			) {
				return new Response(JSON.stringify({ error: "Invalid upload path" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			if (typeof tempFilenamePrev === "string") {
				let previousName: string | null = null;
				try {
					const previousUrl = new URL(tempFilenamePrev, request.url);
					previousName = previousUrl.searchParams.get("name");
				} catch {
					previousName = path.basename(tempFilenamePrev);
				}

				if (
					previousName &&
					!previousName.includes("/") &&
					!previousName.includes("\\")
				) {
					const prevFilePath = path.resolve(tempDirectory, previousName);
					const isWithinTempDirectory =
						prevFilePath === tempDirectory ||
						prevFilePath.startsWith(`${tempDirectory}${path.sep}`);
					if (!isWithinTempDirectory) {
						return new Response(
							JSON.stringify({ error: "Invalid previous file path" }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					if (fs.existsSync(prevFilePath)) {
						try {
							fs.unlinkSync(prevFilePath);
						} catch (e) {
							console.warn("Failed to delete previous temp file", e);
						}
					}
				}
			}

			fs.mkdirSync(tempDirectory, { recursive: true });

			const buffer = Buffer.from(await uploadedFile.arrayBuffer());
			fs.writeFileSync(tempFilePath, buffer);

			const baseUrl = new URL(request.url);
			const viewerPath = baseUrl.pathname.replace(
				/\/file-pre-upload$/,
				"/file-temp-viewer",
			);
			const view = `${viewerPath}/?name=${encodeURIComponent(tempFilename)}&tenantPath=${encodeURIComponent(
				tenantPath,
			)}`;

			return new Response(
				JSON.stringify({
					name: path.join(tenantPath, "temp", tempFilename).replace(/\\/g, "/"),
					view,
					content_type: uploadedFile.type,
					tenantPath,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		} catch (error) {
			if (error instanceof MaxFileSizeExceededError) {
				return new Response(
					JSON.stringify({
						error: `An error occurred while processing the file upload, the file is more than ${ContentRepeaterFileValidator.maxFileSize / 1_000_000}MB size limit`,
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}
			console.error("File upload error:", error);
			return new Response(
				JSON.stringify({
					error: ctx.t({
						code: "content_repeater.file_upload_error",
						msg: "An error occurred while processing the file upload.",
					}),
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}
	}
}
