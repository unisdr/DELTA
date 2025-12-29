import {
	disruptionById,
} from "~/backend.server/models/disruption"

import {
	DisruptionView,
} from "~/frontend/disruption"

import {useLoaderData} from "@remix-run/react"
import {authLoaderWithPerm} from "~/util/auth";
import {getItem1} from "~/backend.server/handlers/view";

import {
	getFieldsDefView
} from "~/backend.server/models/disruption"

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const {params} = loaderArgs;
	const item = await getItem1(ctx, params, disruptionById);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}
	return {
		common: await getCommonData(loaderArgs),
		item,
		fieldDef: await getFieldsDefView()
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}
	const ctx = new ViewContext(ld);
	return <DisruptionView ctx={ctx} fieldDef={ld.fieldDef} item={ld.item} />;
}


