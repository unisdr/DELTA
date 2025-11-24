import {
	authLoaderWithPerm,
} from "~/util/auth";
import { useLoaderData } from "@remix-run/react";
import { ensureValidLanguage, getLanguage } from "~/util/lang.backend";



export const loader = authLoaderWithPerm("ViewData", async (routeArgs) => {
	ensureValidLanguage(routeArgs)
	let lang = getLanguage(routeArgs)
	// @ts-ignore
	let t = globalThis.createTranslationGetter(lang)
	return {
		lang: lang,
		example: t({
			code: "example",
			desc: "Example description",
			msg: "Example message"
		})
	}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	// @ts-ignore
	let t = globalThis.createTranslationGetter(ld.lang)
	return (
		<div>
			<ul>
				<li>Language: {ld.lang}</li>
				<li>From backend: {ld.example}</li>
				<li>From frontend: {t({
						code: "example",
						desc: "Example description",
						msg: "Example message"
					})}
				</li>
			</ul>
		</div>
	)
}
