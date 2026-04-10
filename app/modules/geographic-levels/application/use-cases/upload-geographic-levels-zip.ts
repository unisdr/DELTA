import { handleRequest } from "~/backend.server/handlers/geography_upload";

interface UploadGeographicLevelsZipInput {
	request: Request;
	countryAccountsId: string;
}

export class UploadGeographicLevelsZipUseCase {
	async execute(input: UploadGeographicLevelsZipInput) {
		return handleRequest(input.request, input.countryAccountsId);
	}
}
