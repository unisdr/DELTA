
export function ListLegend() {
  return (
    <>
        <div className="dts-legend">
            <span className="dts-body-label">Record status</span>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--draft"
                    aria-labelledby="legend1"
                ></span>
                <span id="legend1">Draft</span>
            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--waiting-for-validation"
                    aria-labelledby="legend2"
                ></span>
                <span id="legend2">Waiting for validation</span>
            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--needs-revision"
                    aria-labelledby="legend3"
                ></span>
                <span id="legend3">Needs revision</span>
            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--validated"
                    aria-labelledby="legend4"
                ></span>
                <span id="legend4">Validated</span>
            </div>
            <div className="dts-legend__item">
                <span
                    className="dts-status dts-status--published"
                    aria-labelledby="legend5"
                ></span>
                <span id="legend5">Published</span>
            </div>
        </div>
    </>
  );
}
