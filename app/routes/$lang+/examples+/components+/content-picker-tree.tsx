import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config-tree";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { useLoaderData } from "@remix-run/react";
import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { BackendContext } from "~/backend.server/context";


const defaultIds = "12,120405,1103,110101";

// Loader to Fetch & Transform Data
export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	// disable example for now, since it does not check if responses belong to correct instance
	throw new Response("Unauthorized", { status: 401 })

	const ctx = new BackendContext(loaderArgs);

	const selectedDisplay = await contentPickerConfig.selectedDisplay(ctx, dr, defaultIds);
	//console.log('selectedDisplay:', selectedDisplay);
	return {
		common: await getCommonData(loaderArgs),
		selectedDisplay
	};
};

// React Component to Render Tree
export default function Page() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">ContentPicker using TreeView Example</h1>
					</div>
				</header>
			</div>
			<section>
				<div className="mg-container">
					<form>
						<div className="fields">
							<div className="form-field">
								<label>
									<div>
										<ContentPicker ctx={ctx} {...contentPickerConfig} value={defaultIds} displayName={ld.selectedDisplay} />
									</div>
								</label>
							</div>
						</div>
					</form>
				</div>
			</section>
		</>
	);
}
