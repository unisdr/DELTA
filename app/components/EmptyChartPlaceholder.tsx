import React from "react";

const ctx: any = { t: (message: { msg: string }) => message.msg, lang: 'en', url: (path: string) => path, user: undefined };
import { ViewContext } from "~/frontend/context";

const EmptyChartPlaceholder: React.FC<{
	ctx?: ViewContext;
	height?: number;
}> = ({ height = 300 }) => {
	return (
		<div className="dts-chart-empty-state" style={{ height }}>
			<img
				src="/assets/images/empty.png"
				alt="No data"
				style={{ width: "48px", marginBottom: "0.5rem" }}
			/>
			<span className="dts-body-text text-gray-600">
				{ctx.t({
					code: "common.no_data_available",
					msg: "No data available",
				})}
			</span>
		</div>
	);
};

export default EmptyChartPlaceholder;

