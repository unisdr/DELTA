import {
	lossesById,
} from "~/backend.server/models/losses"

import {
	LossesView,
} from "~/frontend/losses"

import {useLoaderData} from "@remix-run/react"
import {authLoaderWithPerm} from "~/util/auth"
import {getItem1} from "~/backend.server/handlers/view"

import {
	fieldsDefView
} from "~/backend.server/models/losses"
import { getCountrySettingsFromSession,  } from "~/util/session"

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const {params, request} = loaderArgs
	const settings = await getCountrySettingsFromSession(request)
	let currencies = [""]
	if (settings) {
		currencies = [settings.currencyCode];
	}
	const item = await getItem1(params, lossesById)
	if (!item) {
		throw new Response("Not Found", {status: 404})
	}
	return {
		common: await getCommonData(loaderArgs),
		item,
		fieldDef: await fieldsDefView(currencies)
	}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>()
	if (!ld.item) {
		throw "invalid"
	}
	const ctx = new ViewContext(ld);
	return <LossesView ctx={ctx} fieldDef={ld.fieldDef} item={ld.item} />
}




