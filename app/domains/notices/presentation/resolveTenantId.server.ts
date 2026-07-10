import { redirect } from "react-router";
import { getRequestContext } from "~/utils/requestContext.server";
import { getCountryAccountsIdFromSession } from "~/utils/session";

/**
 * Resolves the current tenant 
 */
export async function resolveTenantId(
	request: Request,
	lang: string,
): Promise<string> {
	const tenantId =
		getRequestContext()?.tenantId ??
		(await getCountryAccountsIdFromSession(request));
	if (!tenantId) throw redirect(`/${lang}/user/select-instance`);
	return tenantId;
}
