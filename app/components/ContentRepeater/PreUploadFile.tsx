import { MaxFileSizeExceededError, parseFormData } from "@mjackson/form-data-parser";
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

	static async action({ request, params }: { request: Request; params: { lang?: string } }) {
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

			const savePathTemp = formData.get("save_path_temp");
			const tempFilename = formData.get("temp_filename");
			const originalFilename = formData.get("filename");
			const uploadedFile = formData.get("file");
			const tempFilenamePrev = formData.get("temp_filename_prev");
			const fileViewerTempUrl = formData.get("file_viewer_temp_url");

			if (
				typeof savePathTemp !== "string" ||
				typeof tempFilename !== "string" ||
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
						error: `File size exceeds the limit of ${
							ContentRepeaterFileValidator.maxFileSize / 1_000_000
						} MB`,
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			let tenantPath = BASE_UPLOAD_PATH;
			if (countryAccountsId) {
				tenantPath = path.join(BASE_UPLOAD_PATH, `tenant-${countryAccountsId}`);
			}

			const tempDirectory = path.resolve(tenantPath, savePathTemp);
			const tempFilePath = path.join(tempDirectory, tempFilename);

			if (typeof tempFilenamePrev === "string") {
				const prevFilePath = path.resolve(`./${tempFilenamePrev}`);
				if (fs.existsSync(prevFilePath)) {
					try {
						fs.unlinkSync(prevFilePath);
					} catch (e) {
						console.warn("Failed to delete previous temp file", e);
					}
				}
			}

			fs.mkdirSync(tempDirectory, { recursive: true });

			const buffer = Buffer.from(await uploadedFile.arrayBuffer());
			fs.writeFileSync(tempFilePath, buffer);

			return new Response(
				JSON.stringify({
					name: path
						.join(tenantPath, savePathTemp, tempFilename)
						.replace(/\\/g, "/"),
					view: fileViewerTempUrl
						? `${fileViewerTempUrl}/?name=${tempFilename}&tenantPath=${encodeURIComponent(
								tenantPath,
							)}`
						: `${tenantPath}${savePathTemp}/${tempFilename}`,
					content_type: uploadedFile.type,
					tenantPath,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		} catch (error) {
			if (error instanceof MaxFileSizeExceededError) {
				return new Response(
					JSON.stringify({
						error: ctx.t(
							{
								code: "content_repeater.file_upload_max_size_error",
								desc: "{maxSizeMB} is replaced with the max file size in MB.",
								msg: "An error occurred while processing the file upload, the file is more than {maxSizeMB}MB size limit",
							},
							{ maxSizeMB: ContentRepeaterFileValidator.maxFileSize / (1024 * 1024) },
						),
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}
			console.error("File upload error:", error);
			return new Response(
				JSON.stringify({
					error: "An error occurred while processing the file upload.",
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}
	}
}
