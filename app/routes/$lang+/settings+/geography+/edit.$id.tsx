import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/utils/auth";

import {
	fromForm,
	update
} from "~/backend.server/models/division";

import { divisionTable, InsertDivision } from "~/drizzle/schema";

import { divisionBreadcrumb, DivisionBreadcrumbRow, divisionById } from "~/backend.server/models/division";


import { useLoaderData, useActionData } from "react-router";

import { dr } from "~/db.server";

import {
	eq,
	and
} from "drizzle-orm";
import { DivisionForm } from "~/frontend/division";
import { formStringData } from "~/utils/httputil";
import { NavSettings } from "~/routes/$lang+/settings/nav";

import { MainContainer } from "~/frontend/container";
import { getCountryAccountsIdFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";


export const loader = authLoaderWithPerm("ManageCountrySettings", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	const { request } = loaderArgs;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	// Get query parameter "view"
	const url = new URL(loaderArgs.request.url);
	const viewParam = url.searchParams.get("view");

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const res = await dr.select().from(divisionTable).where(
		and(
			eq(divisionTable.id, id),
			eq(divisionTable.countryAccountsId, countryAccountsId)
		)
	);

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	const item = res[0];

	let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
	if (item.parentId) {
		breadcrumbs = await divisionBreadcrumb(["en"], item.parentId, countryAccountsId)
	}

	return {

		data: item,
		breadcrumbs: breadcrumbs,
		view: viewParam,
	};

});

export const action = authActionWithPerm("ManageCountrySettings", async (actionArgs) => {
	const { request, params } = actionArgs;

	const id = params.id;
	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const formData = formStringData(await request.formData());
	let recordDivision: any = {};
	let data = fromForm(formData);

	// Ensure the division belongs to the user's tenant
	data.countryAccountsId = countryAccountsId;

	if (data.parentId) {
		recordDivision = await divisionById(data.parentId, countryAccountsId);
		data.level = recordDivision && recordDivision.level ? recordDivision.level + 1 : 1;
	}
	else {
		data.level = 1;
	}

	const res = await update(id, data, countryAccountsId);

	if (!res.ok) {
		return {
			ok: false,
			data: data,
			errors: res.errors,
		};
	}

	return {
		ok: true,
		data: data,
	};
});


export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	let fields: InsertDivision
	fields = loaderData.data;
	let errors = {};
	let changed = false;
	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok) {
			throw new Error("TODO: error handling")
			//		errors = actionData.errors;
		} else {
			changed = true;
		}
	}

	const dataForm = DivisionForm({
		ctx,
		edit: true,
		fields: fields,
		errors: errors,
		breadcrumbs: loaderData.breadcrumbs,
	})

	const navSettings = <NavSettings ctx={ctx} userRole={ctx.user?.role} />;

	return (
		<MainContainer
			title={ctx.t({ "code": "geographies.geographic_levels", "msg": "Geographic levels" })}
			headerExtra={navSettings}
		>
			<>
				{changed ? (
					<p>
						{ctx.t({
							"code": "common.data_updated",
							"msg": "The data was updated."
						})}
					</p>
				) : null}
				{dataForm}
			</>
		</MainContainer>
	)
}
