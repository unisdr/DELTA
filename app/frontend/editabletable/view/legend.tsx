// Table legend component - displays color legend for cell states.
// Part of the editable table UI - shows meaning of cell colors (unsaved, warnings, errors).
import { ViewContext } from "../../context";

interface TableLegendProps {
	ctx: ViewContext;
}

export function TableLegend(props: TableLegendProps) {
	const ctx = props.ctx;

	return (
		<div className="dts-editable-table-legend">
			<span>
				{ctx.t({
					code: "human_effects.cell_color_legend",
					msg: "Cell color legend",
				})}
			</span>
			<ul>
				<li className="dts-new-or-update">
					{ctx.t({
						code: "human_effects.unsaved_changes",
						msg: "Unsaved changes",
					})}
				</li>
				<li className="dts-warning">
					{ctx.t({
						code: "human_effects.totals_do_not_match",
						msg: "Totals do not match",
					})}
				</li>
				<li className="dts-error">
					{ctx.t({ code: "human_effects.data_errors", msg: "Data errors" })}
				</li>
			</ul>
		</div>
	);
}


