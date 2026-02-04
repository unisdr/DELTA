import {
	disruptionById,
} from "~/backend.server/models/disruption"

import {
	DisruptionView,
} from "~/frontend/disruption"

import { useLoaderData } from "react-router";
import {authLoaderWithPerm} from "~/util/auth";
import {getItem1} from "~/backend.server/handlers/view";

import {
	getFieldsDefView
} from "~/backend.server/models/disruption"

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const {params} = loaderArgs;
	const item = await getItem1(ctx, params, disruptionById);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}
	return {
		
		item,
		fieldDef: await getFieldsDefView(ctx)
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


