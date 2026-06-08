import { useRef } from "react";
import { ContentRepeater } from "~/components/ContentRepeater";
import { ViewContext } from "./context";

function normalizeMapCoordinateItems(items: any[]): any[] {
	return items
		.filter(
			(item) =>
				item &&
				(!item.map_option || item.map_option === "Map coordinates"),
		)
		.map((item) => ({
			...item,
			map_option: item?.map_option ?? "Map coordinates",
		}));
}

export function SpatialFootprintFormView2({
	ctx,
	divisions = [],
	ctryIso3 = "",
	initialData = [],
	onChange,
}: {
	ctx: ViewContext;
	divisions?: any[];
	ctryIso3?: string;
	initialData: any;
	onChange?: (items: any[]) => void;
}) {
	const contentRepeaterRef = useRef<any>(null);

	const parsedData = (() => {
		try {
			if (Array.isArray(initialData)) {
				return normalizeMapCoordinateItems(initialData);
			}
			if (typeof initialData === "string") {
				return normalizeMapCoordinateItems(JSON.parse(initialData) || []);
			}
			return [];
		} catch {
			return [];
		}
	})();

	return (
		<div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
			<div className="mb-4 flex items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<i className="pi pi-map text-blue-500" />
						<h3 className="text-[18px] font-semibold text-slate-800">
							{ctx.t({
								code: "record.spatial_footprint",
								msg: "Spatial footprint",
							})}
						</h3>
					</div>
					<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
						{ctx.t({
							code: "spatial_footprint.define_specific_geographic_area",
							desc: "Help text for spatial footprint section",
							msg: "Define the specific geographic area affected using interactive map coordinates or manual input.",
						})}
					</p>
				</div>
				<i className="pi pi-chevron-right pt-2 text-slate-400" />
			</div>

			<div className="spatial-footprint-form2">
				<style>{`
					.spatial-footprint-form2 .dts-table thead th {
						font-size: 1.125rem;
						line-height: 1.5rem;
						font-weight: 600;
					}
				`}</style>
				<ContentRepeater
					ctx={ctx}
					divisions={divisions}
					ctryIso3={ctryIso3}
					caption=""
					ref={contentRepeaterRef}
					id="spatialFootprint"
					mapper_preview={true}
					table_columns={[
						{
							type: "dialog_field",
							dialog_field_id: "title",
							caption: ctx.t({
								code: "common.title",
								msg: "Title",
							}),
							width: "80%",
						},
						{
							type: "action",
							caption: ctx.t({
								code: "common.action",
								msg: "Action",
							}),
							width: "20%",
						},
					]}
					dialog_fields={[
						{
							id: "title",
							caption: ctx.t({
								code: "common.title",
								msg: "Title",
							}),
							type: "input",
							required: true,
						},
						{
							id: "map_coords",
							caption: ctx.t({
								code: "spatial_footprint.map_coordinates",
								msg: "Map coordinates",
							}),
							type: "mapper",
							placeholder: "",
							mapperGeoJSONField: "geojson",
						},
						{
							id: "geojson",
							caption: ctx.t({
								code: "spatial_footprint.map_coordinates",
								msg: "Map coordinates",
							}),
							type: "hidden",
							required: true,
						},
					]}
					data={parsedData}
					onChange={(items: any) => {
						try {
							onChange?.(
								normalizeMapCoordinateItems(
									Array.isArray(items) ? items : [],
								),
							);
						} catch {
							console.error("Failed to process items.");
						}
					}}
				/>
			</div>
		</div>
	);
}
