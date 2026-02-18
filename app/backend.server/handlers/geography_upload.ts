import { parseFormData } from "@mjackson/form-data-parser";

import { UserError, importZip } from "~/backend.server/models/division";

export async function handleRequest(
	request: Request,
	countryAccountsId: string,
) {
	try {
		// Parse multipart form data (files stored in memory by default)
		const formData = await parseFormData(request, {
			maxFileSize: 50 * 1024 * 1024,
		});

		const file = formData.get("file");

		if (!(file instanceof File)) {
			throw new UserError("File was not set");
		}

		// Convert File → Uint8Array
		const arrayBuffer = await file.arrayBuffer();
		const fileBytes = new Uint8Array(arrayBuffer);

		const res = await importZip(fileBytes, countryAccountsId);

		if (!res.success) {
			throw new UserError(res.error || "Import failed");
		}

		return {
			ok: true,
			imported: res.data.imported,
			failed: res.data.failed,
			failedDetails: res.data.failedDetails || {},
		};
	} catch (err) {
		if (err instanceof UserError) {
			return { ok: false, error: err.message };
		} else if (err instanceof Error) {
			console.error("Could not import divisions zip", err.message);

			if (err.name === "MaxFileSizeExceededError") {
				return {
					ok: false,
					error:
						"Server error: File upload aborted file larger than allowed 50MB",
				};
			}

			return { ok: false, error: "Server error: " + err.name };
		} else {
			console.error("Could not import divisions zip", String(err));
			return { ok: false, error: "Server error" };
		}
	}
}
