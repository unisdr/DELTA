import {
	organizationCreate,
	organizationUpdate,
	organizationById,
	organizationByIdTx,
	getFieldsDef,
} from "~/backend.server/models/organization";

import { OrganizationForm, route } from "~/frontend/organization";

import { formScreen } from "~/frontend/form";

import { createOrUpdateAction } from "~/backend.server/handlers/form/form";
import { getTableName } from "drizzle-orm";
import { organizationTable } from "~/drizzle/schema";
import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/util/auth";

import { ActionFunctionArgs } from "react-router";
import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	let ctx = new BackendContext(args);

	return createOrUpdateAction(
		{
			fieldsDef: () => getFieldsDef(ctx),
			create: organizationCreate,
			update: organizationUpdate,
			getById: organizationByIdTx,
			redirectTo: (id) => `${route}/${id}`,
			tableName: getTableName(organizationTable),
			action: (isCreate) => (isCreate ? "Create organization" : "Update organization"),
			countryAccountsId
		},
	)(args).catch((err) => {
		let message:string = "Unknown error";
		if (err instanceof Response) return err;
		
		if (err.code && err.code === '23505') {
			message = `An organization with the same name already exists.`;
			//throw new Response(message, { status: 400 });
			return new Response(JSON.stringify({ error: message }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}
 
		message = err instanceof Error ? err.message : "Unknown error";
		//throw new Response(message, { status: 400 });
		return new Response(JSON.stringify({ error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});	
	});
};

export const loader = authLoaderWithPerm("ManageOrganizations", async (args) => {
	const { request, params } = args;
	if (!params.id) throw new Error("Missing id param");
	const countryAccountsId = await getCountryAccountsIdFromSession(request)
	if (!countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}
	let ctx = new BackendContext(args);
	let url = new URL(request.url);
	let sectorId = url.searchParams.get("sectorId") || null;
	let extra = {
		fieldsDef: await getFieldsDef(ctx),
		sectorId,
	};
	if (params.id === "new") return {
		
		item: null,
		...extra
	};

	let item = await organizationById(ctx, params.id);
	if (!item) throw new Response("Not Found", { status: 404 });
	if (item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	return {
		
		item,
		...extra
	};
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let ctx = new ViewContext()

	let fieldsInitial = ld.item ? { ...ld.item } : {};
	if ("sectorId" in fieldsInitial && !fieldsInitial.sectorId && ld.sectorId) {
		fieldsInitial.sectorId = ld.sectorId;
	}

	// @ts-ignore
	const selectedDisplay = ld?.selectedDisplay || {};

	return formScreen({
		ctx,
		extraData: {
			fieldDef: ld.fieldsDef,
			selectedDisplay,
		},
		fieldsInitial,
		form: OrganizationForm,
		edit: !!ld.item,
		id: ld.item?.id || undefined,
	});
}
