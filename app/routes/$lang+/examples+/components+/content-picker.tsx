import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config.js";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";

// Loader to Fetch & Transform Data
export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	return {
		common: await getCommonData(loaderArgs),
	}
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
						<h1 className="dts-heading-1">ContentPicker Example</h1>
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
										<ContentPicker
											ctx={ctx}

											{...contentPickerConfig} value="10ce015c-9461-4641-bb6f-0024d8393f47" displayName="Disaster 4 (7 to 9 Feb 2025) - 3b37b" />
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
