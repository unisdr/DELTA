import {
	authLoaderWithPerm,
} from "~/util/auth";
import { useLoaderData } from "@remix-run/react";
import { ensureValidLanguage } from "~/util/lang.backend";
import { BackendContext } from "~/backend.server/context";
import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";



export const loader = authLoaderWithPerm("ViewData", async (routeArgs) => {
	ensureValidLanguage(routeArgs)
	let ctx = new BackendContext(routeArgs)

	return {
		common: await getCommonData(routeArgs),
		example: ctx.t({
			"code": "translations.example",
			"desc": "Example message",
			"msg": "Example message"
		}),
		examplePlurals: Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
			ctx.t(
				{
					"code": "translations.example_counter",
					"desc": "Example counter. {n} is replaced with a number.",
					"msgs": {
						"one": "We have {n} record",
						"other": "We have {n} records"
					},
				},
				{ n }
			)
		)
	}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	let ctx = new ViewContext(ld);
	return (
		<div>
			<ul>
				<li>Language: {ld.common.lang}</li>
				<li>From backend: {ld.example}</li>
				<li>From frontend: {ctx.t({
					"code": "translations.example",
					"desc": "Example message",
					"msg": "Example message"
				})}
				</li>
				<li>From frontend with parameter: {ctx.t({
					"code": "translations.example_hello_user",
					"desc": "Example greeting. {user} is replaced with user name",
					"msg": "Hello {user}"
				}, { "user": "User1" })}
				</li>
				<li>
					From frontend with multiple lines:<br />
					<pre>
						{ctx.t({
							"code": "translations.example_multiple_lines",
							"desc": "multiple lines",
							"msg": [
								"line1",
								"line2"
							]
						})}
					</pre>
				</li>
				<li>
					From backend pluralization:
					<ul>
						{ld.examplePlurals.map((msg, i) => (
							<li key={i}>{msg}</li>
						))}
					</ul>
				</li>
				<li>
					From frontend pluralization:
					<ul>
						{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
							<li key={n}>
								{ctx.t({
									"code": "translations.example_counter",
									"desc": "Example counter. {n} is replaced with a number.",
									"msgs": {
										"one": "We have {n} record",
										"other": "We have {n} records"
									}
								}, { n })}
							</li>
						))}
					</ul></li>
			</ul>
		</div>
	)
}
