import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { Form, useActionData, useLoaderData } from "react-router";
import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

export const loader = authLoaderWithPerm(
	"ViewData",
	async (_args: LoaderFunctionArgs) => {
		return {
			a: "From loader",
		};
	},
);

export const action = authActionWithPerm(
	"ViewData",
	async (_args: ActionFunctionArgs) => {
		return {
			b: "From action",
		};
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();
	return (
		<div>
			<p>Loader data: {JSON.stringify(ld)}</p>
			<p>Action data: {JSON.stringify(ad)}</p>
			<h3>Form (uppercase)</h3>
			<Form method="post">
				<textarea name="text"></textarea>
				<button type="submit">Submit</button>
			</Form>
			<h3>Form (lowercase)</h3>
			<form method="post">
				<textarea name="text"></textarea>
				<button type="submit">Submit</button>
			</form>
		</div>
	);
}
