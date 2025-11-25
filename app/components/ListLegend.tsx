import { ViewContext } from "~/frontend/context";

interface ListLegendProps {
    ctx: ViewContext;
}

export function ListLegend({ ctx }: ListLegendProps) {
  return (
    <>
        <div className="dts-legend">
            <span className="dts-body-label">
                {ctx.t({
                    "code": "record.status_label",
                    "desc": "Label for record status, used across different record types",
                    "msg": "Record status"
                })}
            </span>

            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--draft"
                    aria-labelledby="legend1"
                ></span>
                <span id="legend1">
                    {ctx.t({
                        "code": "record.legend.draft",
                        "desc": "Label for draft status in legend, used across record types",
                        "msg": "Draft"
                    })}
                </span>

            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--waiting-for-validation"
                    aria-labelledby="legend2"
                ></span>
                <span id="legend2">
                    {ctx.t({
                        "code": "record.legend.waiting_for_validation",
                        "desc": "Label for waiting for validation status in legend, used across record types",
                        "msg": "Waiting for validation"
                    })}
                </span>

            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--needs-revision"
                    aria-labelledby="legend3"
                ></span>
                <span id="legend3">
                    {ctx.t({
                        "code": "record.legend.needs_revision",
                        "desc": "Label for needs revision status in legend, used across record types",
                        "msg": "Needs revision"
                    })}
                </span>

            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--validated"
                    aria-labelledby="legend4"
                ></span>
                <span id="legend4">
                    {ctx.t({
                        "code": "record.legend.validated",
                        "desc": "Label for validated status in legend, used across record types",
                        "msg": "Validated"
                    })}
                </span>
            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--published"
                    aria-labelledby="legend5"
                ></span>
                <span id="legend5">
                    {ctx.t({
                        "code": "record.legend.published",
                        "desc": "Label for published status in legend, used across record types",
                        "msg": "Published"
                    })}
                </span>
            </div>
        </div>
    </>
  );
}
