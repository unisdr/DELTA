import {
	disruptionByIdAndCountryAccountsId,
	getFieldsDefView,
} from "~/backend.server/models/disruption";

import { DisruptionView } from "~/frontend/disruption";

import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { params, request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!params.id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const item = await disruptionByIdAndCountryAccountsId(ctx, params.id, countryAccountsId);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	return {
		item,
		fieldDef: await getFieldsDefView(ctx),
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}
	const ctx = new ViewContext();
	return <DisruptionView ctx={ctx} fieldDef={ld.fieldDef} item={ld.item} />;
}
