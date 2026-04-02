import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { DISASTER_RECORDS_UPLOAD_PATH } from "~/utils/paths";
import { getCountryAccountsIdFromSession } from "~/utils/session";

const ALLOWED_LOCS = new Set(["disruptions", "losses", "damages", "record"]);

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async ({ request, userSession }: any) => {
		// Enable debug logging
		const debug = true;
		const url = new URL(request.url);
		const loc = url.searchParams.get("loc");
		const download = url.searchParams.get("download") === "true";

		if (!loc || !ALLOWED_LOCS.has(loc)) {
			return new Response("Invalid loc parameter", { status: 400 });
		}

		// Get tenant ID from URL or user session
		let tenantPath = url.searchParams.get("tenantPath");

		// Get the country accounts ID directly from the session
		// This is a workaround for the issue where userSession.countryAccountsId is undefined
		const directCountryAccountsId =
			await getCountryAccountsIdFromSession(request);

		// Create a proper userSession object if it's missing data
		const effectiveUserSession = {
			id: userSession?.id,
			countryAccountsId:
				userSession?.countryAccountsId || directCountryAccountsId,
			role: userSession?.role,
		};

		if (debug) {
			console.log("DEBUG - Disaster Record File viewer request:", {
				url: request.url,
				loc,
				tenantPath,
				fileNameParam: url.searchParams.get("name"),
				directCountryAccountsId,
				userSession: userSession
					? {
						id: userSession.id,
						countryAccountsId: userSession.countryAccountsId,
						role: userSession.role,
					}
					: null,
				effectiveUserSession,
			});
		}

		// Security check: If tenant path is specified in URL, verify it matches the user's tenant
		if (tenantPath && effectiveUserSession.countryAccountsId) {
			const urlTenantId = tenantPath.match(/tenant-([\w-]+)/);
			if (
				urlTenantId &&
				urlTenantId[1] !== effectiveUserSession.countryAccountsId
			) {
				console.warn(
					`Tenant mismatch: URL tenant ${urlTenantId[1]} doesn't match user tenant ${effectiveUserSession.countryAccountsId}. Rewriting to session tenant.`,
				);
				tenantPath = `/tenant-${effectiveUserSession.countryAccountsId}`;
				url.searchParams.set("tenantPath", tenantPath);
				request = new Request(url.toString(), request);
			}
		} else if (debug) {
			console.log("DEBUG - No tenant path check performed:", {
				tenantPath,
				userCountryAccountsId: effectiveUserSession.countryAccountsId,
			});
		}

		// If no tenant path in URL but we have a country accounts ID in the session, use that
		if (!tenantPath && effectiveUserSession.countryAccountsId) {
			tenantPath = `/tenant-${effectiveUserSession.countryAccountsId}`;

			// Add the tenant path to the URL for the file handler
			url.searchParams.set("tenantPath", tenantPath);

			// Always add the required tenant ID for security enforcement
			url.searchParams.set(
				"requiredTenantId",
				effectiveUserSession.countryAccountsId,
			);

			request = new Request(url.toString(), request);
		} else if (effectiveUserSession.countryAccountsId) {
			// If we already have a tenant path but also have a country accounts ID, add it as required tenant ID
			url.searchParams.set(
				"requiredTenantId",
				effectiveUserSession.countryAccountsId,
			);
			request = new Request(url.toString(), request);
		}

		// Access enforcement is performed by handleFileRequest using the session tenant
		// and tenant-scoped upload directory boundaries.

		// Determine the upload path based on location
		const uploadPath =
			loc === "record"
				? DISASTER_RECORDS_UPLOAD_PATH
				: `${DISASTER_RECORDS_UPLOAD_PATH}/${loc}`;

		// Pass the modified request with tenant path to the handler, INCLUDING the userSession
		return await handleFileRequest(
			request,
			uploadPath,
			download,
			effectiveUserSession,
		);
	},
);
