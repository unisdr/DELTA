import {
	organizationById,
	fieldsDefView,
} from "~/backend.server/models/organization";

import { OrganizationView } from "~/frontend/organization";

// import { dr } from "~/db.server";
// import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";

import { getItem2 } from "~/backend.server/handlers/view";
import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm(
	"ManageOrganizations",
	async (loaderArgs) => {
		//const { request, params } = loaderArgs;
		const { params } = loaderArgs;
		//const countryAccountsId = await getCountryAccountsIdFromSession(request);
		const ctx = new BackendContext(loaderArgs);

		const item = await getItem2(ctx, params, organizationById);
		if (!item) {
			throw new Response("Not Found", { status: 404 });
		}

		return {
			item,
			def: await fieldsDefView(ctx),
		};
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	if (!ld.item) {
		throw "invalid";
	}
	if (!ld.def) {
		throw "def missing";
	}
	return <OrganizationView ctx={ctx} item={ld.item} def={ld.def} />;
}
