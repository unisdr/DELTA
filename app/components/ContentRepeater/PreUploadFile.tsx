import { parseFormData } from "@mjackson/form-data-parser";
import fs from "fs";
import path from "path";

import ContentRepeaterFileValidator from "./FileValidator";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { BASE_UPLOAD_PATH } from "~/utils/paths";

export default class ContentRepeaterPreUploadFile {
	static async loader() {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	static async action({ request }: { request: Request }) {
		if (request.method !== "POST") {
			return new Response(JSON.stringify({ error: "Method not allowed" }), {
				status: 405,
				headers: { "Content-Type": "application/json" },
			});
		}

		try {
			const countryAccountsId = await getCountryAccountsIdFromSession(request);

			const formData = await parseFormData(request);

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
							ContentRepeaterFileValidator.maxFileSize / (1024 * 1024)
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
