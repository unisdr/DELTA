import { organizationById, fieldsDefView } from "~/backend.server/models/organization";

import { OrganizationView } from "~/frontend/organization";

import { dr } from "~/db.server";

import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

import { getItem2 } from "~/backend.server/handlers/view";
import { useLoaderData } from "@remix-run/react";
import { authLoaderWithPerm } from "~/util/auth";


export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const item = await getItem2(params, organizationById);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}

	
	return {
		common: await getCommonData(loaderArgs),
		item,
		def: await fieldsDefView(),
	}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	if (!ld.item) {
		throw "invalid";
	}
	if (!ld.def) {
		throw "def missing";
	}
	return (
		<OrganizationView
			ctx={ctx}
			item={ld.item}
			def={ld.def}
		/>
	);
}

