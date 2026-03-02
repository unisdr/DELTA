import { Outlet, useLoaderData, useNavigate } from "react-router";
import { LoaderFunctionArgs } from "react-router";

import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";

export async function loader(args: LoaderFunctionArgs) {
	let { params } = args;
	let parent = params.parent || "unknown";
	return {
		parent,
	};
}

export default function Parent() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	const navigate = useNavigate();

	const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		navigate(event.target.value);
	};

	return (
		<div>
			<h1>Parent</h1>
			<div>
				<h2>Using HTML form select</h2>
				<label htmlFor="parent-select">Select Parent:</label>
				<select id="parent-select" onChange={handleSelectChange}>
					<option
						value={ctx.url("/examples/multiple-loaders/parent/parent1/child")}
					>
						Parent 1
					</option>
					<option
						value={ctx.url("/examples/multiple-loaders/parent/parent2/child")}
					>
						Parent 2
					</option>
				</select>
			</div>

			<div>
				<h2>Using Link to</h2>
				<LangLink
					lang={ctx.lang}
					to="/examples/multiple-loaders/parent/parent1/child"
				>
					Parent 1
				</LangLink>
				<LangLink
					lang={ctx.lang}
					to="/examples/multiple-loaders/parent/parent2/child"
				>
					Parent 2
				</LangLink>
			</div>
			<p>{ld.parent}</p>
			<hr />
			<Outlet context="example1" />
		</div>
	);
}
