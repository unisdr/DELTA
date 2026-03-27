import { apiAuth } from "~/backend.server/models/api_key";
import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";

export interface ApiContext {
	countryAccountsId: string;
	currencies: string[];
}

// Helper to get API auth context (country account ID and currencies)
// Avoids repetitive code across multiple API endpoints
export async function getApiContext(request: Request): Promise<ApiContext> {
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const settings =
		await InstanceSystemSettingRepository.getByCountryAccountId(
			countryAccountsId,
		);

	const currencies: string[] = settings ? [settings.currencyCode] : [];

	return { countryAccountsId, currencies };
}
