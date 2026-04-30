// Category presence selector component - toggles whether each metric category is present.
// Part of the editable table UI - controls which disaggregation categories are active.
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Def, etLocalizedStringForLang } from "~/frontend/editabletable/base";
import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import { ViewContext } from "../../context";

interface TableCategoryPresenceProps {
	ctx: ViewContext;
	tblId: HumanEffectsTable;
	defs: Def[];
	data: Record<string, any>;
}

export function TableCategoryPresence(props: TableCategoryPresenceProps) {
	const ctx = props.ctx;
	let fetcher = useFetcher();
	const [localData, setLocalData] = useState(props.data);

	useEffect(() => {
		setLocalData(props.data);
	}, [props.data]);

	const handleChange = (
		e: React.ChangeEvent<HTMLSelectElement>,
		key: string,
	) => {
		let newValue =
			e.target.value === "1" ? true : e.target.value === "0" ? false : null;
		setLocalData((prev) => ({ ...prev, [key]: newValue }));
		fetcher.submit(e.target.form);
	};

	return (
		<fetcher.Form method="post">
			<input type="hidden" name="tblId" value={props.tblId} />
			<h3 className="font-bold">
				{ctx.t({
					code: "human_effects.category_presence",
					msg: "Category presence",
				})}
			</h3>
			{props.defs
				.filter((d) => d.role == "metric")
				.map((d) => {
					let v = localData[d.jsName];
					let vStr = v === true ? "1" : v === false ? "0" : "";
					return (
						<p key={d.jsName}>
							<label>
								{etLocalizedStringForLang(d.uiName, ctx.lang)}&nbsp;
								<select
									name={d.jsName}
									value={vStr}
									className="border border-gray-300 rounded-md px-3 py-2 mb-2 inline-block"
									onChange={(e) => handleChange(e, d.jsName)}
								>
									<option value="">
										{ctx.t({
											code: "common.not_specified",
											msg: "Not Specified",
										})}
									</option>
									<option value="1">
										{ctx.t({ code: "common.yes", msg: "Yes" })}
									</option>
									<option value="0">
										{ctx.t({ code: "common.no", msg: "No" })}
									</option>
								</select>
							</label>
						</p>
					);
				})}
		</fetcher.Form>
	);
}

