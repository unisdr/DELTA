import React from "react";
import {
	formatCurrencyWithCode,
	formatNumber,
} from "~/frontend/utils/formatters";
import "~/frontend/styles/analytics/sectors/effect-details.css";
import {
	typeEnumAgriculture,
	typeEnumNotAgriculture,
} from "~/frontend/losses_enums";
import { ClientOnly } from "./ClientOnly";
import { ViewContext } from "~/frontend/context";

interface Props {
	ctx: ViewContext;
	filters: {
		sectorId: string | null;
		subSectorId: string | null;
		hazardTypeId: string | null;
		hazardClusterId: string | null;
		specificHazardId: string | null;
		geographicLevelId: string | null;
		fromDate: string | null;
		toDate: string | null;
		disasterEventId: string | null;
	};
	currency: string;
	// New props to receive data from loader instead of fetching via API
	effectDetailsData?: EffectDetailsResponse | null;
	sectorsData?: { sectors: Sector[] | null };
}

interface Sector {
	id: string;
	sectorname: string;
	subsectors?: Sector[];
}

interface EffectDetailsResponse {
	success: boolean;
	data: {
		damages: DamageRecord[];
		losses: LossRecord[];
		disruptions: DisruptionRecord[];
	};
}

interface DamageRecord {
	id: string;
	type: string;
	assetName: string;
	unit: string;
	totalDamageAmount: number;
	totalRepairReplacement: string;
	totalRecovery: string;
	sectorId: number;
	attachments: Array<{ url: string; type: string }>;
	spatialFootprint: any;
}

interface LossRecord {
	id: string;
	type: string;
	description: string;
	publicUnit: string | null;
	publicUnits: number | null;
	publicCostTotal: string | null;
	privateUnit: string | null;
	privateUnits: number | null;
	privateCostTotal: string | null;
	sectorId: number;
	attachments: Array<{ url: string; type: string }>;
	spatialFootprint: any;
}

interface DisruptionRecord {
	id: string;
	type: string;
	durationDays: number | null;
	durationHours: number | null;
	usersAffected: number | null;
	peopleAffected: number | null;
	responseCost: number | null;
	comment: string;
	sectorId: number;
	attachments: Array<{ url: string; type: string }>;
	spatialFootprint: any;
}

interface TableColumn {
	key: string;
	label: string;
}

interface TableData {
	[key: string]: string | number | null;
}

interface TableProps {
	title: string;
	columns: TableColumn[];
	data: TableData[];
	currency: string;
}

export function EffectDetails({
	ctx,
	filters,
	currency,
	effectDetailsData,
	sectorsData,
}: Props) {
	// Function to find a sector and its parent by ID
	const findSectorWithParent = (
		sectors: Sector[] | null,
		targetId: string,
	): { sector: Sector | null; parent: Sector | null } => {
		if (!sectors) return { sector: null, parent: null };

		for (const sector of sectors) {
			if (sector.subsectors) {
				for (const subsector of sector.subsectors) {
					if (subsector.id.toString() === targetId) {
						return { sector: subsector, parent: sector };
					}
				}
			}
			if (sector.id.toString() === targetId) {
				return { sector, parent: null };
			}
		}
		return { sector: null, parent: null };
	};

	// Function to generate section title
	const sectionTitle = () => {
		if (!sectorsData?.sectors) {
			return ctx.t({
				code: "analysis.effect_details",
				msg: "Effect details",
			});
		}

		if (filters.subSectorId) {
			const { sector: subsector, parent: mainSector } = findSectorWithParent(
				sectorsData.sectors,
				filters.subSectorId,
			);
			if (subsector && mainSector) {
				return ctx.t(
					{
						code: "analysis.effect_details_in_subsector_and_sector",
						desc: "Title for effect details in a subsector under a main sector. {subsector} is the subsector name, {sector} is the main sector name.",
						msg: "Effect details in {subsector} ({sector} Sector)",
					},
					{ subsector: subsector.sectorname, sector: mainSector.sectorname },
				);
			}
		}

		if (filters.sectorId) {
			const { sector } = findSectorWithParent(
				sectorsData.sectors,
				filters.sectorId,
			);
			if (sector) {
				return ctx.t(
					{
						code: "analysis.effect_details_in_sector",
						desc: "Title for effect details in a specific sector. {sector} is the name of the sector.",
						msg: "Effect details in {sector} Sector",
					},
					{ sector: sector.sectorname },
				);
			}
		}

		return ctx.t({
			code: "analysis.effect_details",
			msg: "Effect details",
		});
	};

	// Check if we have effect details data from the loader
	const isLoading = !effectDetailsData;
	const error =
		effectDetailsData && !effectDetailsData.success
			? new Error("Failed to load effect details data")
			: null;

	const getTypeLabel = (type: string | null) => {
		if (!type) return "-";

		// First check agriculture types
		const agricultureType = typeEnumAgriculture(ctx).find(
			(t) => t.type === type,
		);
		if (agricultureType)
			return agricultureType.type
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");

		// Then check non-agriculture types
		const nonAgricultureType = typeEnumNotAgriculture(ctx).find(
			(t) => t.type === type,
		);
		if (nonAgricultureType)
			return nonAgricultureType.type
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");

		return type;
	};

	return (
		<ClientOnly>
			{() => (
				<section className="dts-page-section">
					<div className="mg-container">
						<h2 className="dts-heading-2">{sectionTitle()}</h2>
						<p className="dts-body-text mb-6">
							{ctx.t({
								code: "analysis.effect_details_description",
								msg: "View detailed information about damages, losses, and disruptions in the selected sector.",
							})}
						</p>

						{isLoading && (
							<div className="dts-data-box">
								<h3 className="dts-body-label">
									{ctx.t({
										code: "analysis.loading_data",
										msg: "Loading data",
									})}
								</h3>
								<div
									className="skeleton-loader"
									role="progressbar"
									aria-label={ctx.t({
										code: "analysis.aria_label_loading_data",
										msg: "Loading data",
									})}
								/>
							</div>
						)}

						{error && (
							<div className="dts-data-box" role="alert">
								<h3 className="dts-body-label">
									{ctx.t({
										code: "common.error",
										msg: "Error",
									})}
								</h3>
								<div className="flex items-center justify-center h-[300px]">
									<p className="text-gray-500">
										{error instanceof Error
											? error.message
											: ctx.t({
													code: "common.failed_to_load_data",
													msg: "Failed to load data",
												})}
									</p>
								</div>
							</div>
						)}

						{effectDetailsData && effectDetailsData.success && (
							<div>
								<div className="dts-data-box">
									<h3 className="dts-body-label">
										<span>
											{ctx.t({
												code: "analysis.damages",
												msg: "Damages",
											})}
										</span>
									</h3>
									{effectDetailsData.data.damages &&
									effectDetailsData.data.damages.length > 0 ? (
										<SortableTable
											title={ctx.t({
												code: "analysis.damages",
												msg: "Damages",
											})}
											columns={[
												{
													key: "assetName",
													label: ctx.t({
														code: "analysis.asset",
														msg: "Asset",
													}),
												},
												{
													key: "totalDamageAmount",
													label: ctx.t({
														code: "analysis.total_damage",
														msg: "Total damage",
													}),
												},
												{
													key: "totalRepairReplacement",
													label: ctx.t({
														code: "analysis.repair_replacement",
														msg: "Repair/Replacement",
													}),
												},
												{
													key: "totalRecovery",
													label: ctx.t({
														code: "analysis.recovery",
														msg: "Recovery",
													}),
												},
											]}
											data={effectDetailsData.data.damages.map((damage) => ({
												assetName: damage.assetName,
												totalDamageAmount: damage.totalDamageAmount,
												totalRepairReplacement: damage.totalRepairReplacement,
												totalRecovery: damage.totalRecovery,
											}))}
											currency={currency}
										/>
									) : (
										<div
											className="flex items-center justify-center h-[300px]"
											role="status"
										>
											<p className="text-gray-500">
												{ctx.t({
													code: "analysis.no_damage_records_details",
													msg: "No damage records details available for the selected criteria.",
												})}
											</p>
										</div>
									)}
								</div>

								<div className="dts-data-box">
									<h3 className="dts-body-label">
										<span>
											{ctx.t({
												code: "analysis.losses",
												msg: "Losses",
											})}
										</span>
									</h3>
									{effectDetailsData.data.losses &&
									effectDetailsData.data.losses.length > 0 ? (
										<SortableTable
											title={ctx.t({
												code: "analysis.losses",
												msg: "Losses",
											})}
											columns={[
												{
													key: "type",
													label: ctx.t({
														code: "analysis.type",
														msg: "Type",
													}),
												},
												{
													key: "description",
													label: ctx.t({
														code: "analysis.description",
														msg: "Description",
													}),
												},
												{
													key: "publicCostTotal",
													label: ctx.t({
														code: "analysis.public_cost",
														msg: "Public cost",
													}),
												},
												{
													key: "privateCostTotal",
													label: ctx.t({
														code: "analysis.private_cost",
														msg: "Private cost",
													}),
												},
											]}
											data={effectDetailsData.data.losses.map((loss) => ({
												type: getTypeLabel(loss.type),
												description: loss.description,
												publicCostTotal: loss.publicCostTotal || "-",
												privateCostTotal: loss.privateCostTotal || "-",
											}))}
											currency={currency}
										/>
									) : (
										<div
											className="flex items-center justify-center h-[300px]"
											role="status"
										>
											<p className="text-gray-500">
												{ctx.t({
													code: "analysis.no_loss_records_details",
													msg: "No loss records details available for the selected criteria.",
												})}
											</p>
										</div>
									)}
								</div>

								<div className="dts-data-box">
									<h3 className="dts-body-label">
										<span>
											{ctx.t({
												code: "analysis.disruptions",
												msg: "Disruptions",
											})}
										</span>
									</h3>
									{effectDetailsData.data.disruptions &&
									effectDetailsData.data.disruptions.length > 0 ? (
										<SortableTable
											title={ctx.t({
												code: "analysis.disruptions",
												msg: "Disruptions",
											})}
											columns={[
												{
													key: "comment",
													label: ctx.t({
														code: "analysis.description",
														msg: "Description",
													}),
												},
												{
													key: "durationDays",
													label: ctx.t({
														code: "analysis.duration_days",
														msg: "Duration (days)",
													}),
												},
												{
													key: "usersAffected",
													label: ctx.t({
														code: "analysis.users_affected",
														msg: "Users affected",
													}),
												},
												{
													key: "peopleAffected",
													label: ctx.t({
														code: "analysis.people_affected",
														msg: "People affected",
													}),
												},
												{
													key: "responseCost",
													label: ctx.t({
														code: "analysis.response_cost",
														msg: "Response cost",
													}),
												},
											]}
											data={effectDetailsData.data.disruptions.map(
												(disruption) => ({
													comment: disruption.comment,
													durationDays: disruption.durationDays || "-",
													usersAffected: disruption.usersAffected || "-",
													peopleAffected: disruption.peopleAffected || "-",
													responseCost: disruption.responseCost || "-",
												}),
											)}
											currency={currency}
										/>
									) : (
										<div
											className="flex items-center justify-center h-[300px]"
											role="status"
										>
											<p className="text-gray-500">
												{ctx.t({
													code: "analysis.no_disruption_records_details",
													msg: "No disruption records details available for the selected criteria.",
												})}
											</p>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</section>
			)}
		</ClientOnly>
	);
}

const SortableTable: React.FC<TableProps> = ({
	title,
	columns,
	data,
	currency,
}) => {
	const [sortConfig, setSortConfig] = React.useState<{
		key: string;
		direction: "ascending" | "descending";
	} | null>(null);

	const sortedData = React.useMemo(() => {
		if (!sortConfig) return data;

		return [...data].sort((a, b) => {
			if (a[sortConfig.key] === null) return 1;
			if (b[sortConfig.key] === null) return -1;
			if (a[sortConfig.key] === b[sortConfig.key]) return 0;

			const aValue = a[sortConfig.key];
			const bValue = b[sortConfig.key];

			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortConfig.direction === "ascending"
					? aValue - bValue
					: bValue - aValue;
			}

			return sortConfig.direction === "ascending"
				? String(aValue) > String(bValue)
					? 1
					: -1
				: String(bValue) > String(aValue)
					? 1
					: -1;
		});
	}, [data, sortConfig]);

	const requestSort = (key: string) => {
		let direction: "ascending" | "descending" = "ascending";
		if (
			sortConfig &&
			sortConfig.key === key &&
			sortConfig.direction === "ascending"
		) {
			direction = "descending";
		}
		setSortConfig({ key, direction });
	};

	const formatValue = (value: string | number | null, key: string): string => {
		if (value === null || value === undefined) return "-";

		// Convert string numbers to actual numbers for currency fields
		if (
			typeof value === "string" &&
			!isNaN(Number(value)) &&
			[
				"totalDamage",
				"repairReplacement",
				"recovery",
				"publicCost",
				"privateCost",
				"totalDamageAmount",
				"totalRepairReplacement",
				"totalRecovery",
				"publicCostTotal",
				"privateCostTotal",
				"responseCost",
			].includes(key)
		) {
			value = Number(value);
		}

		// Format all currency fields consistently
		if (
			[
				"totalDamage",
				"repairReplacement",
				"recovery",
				"publicCost",
				"privateCost",
				"totalDamageAmount",
				"totalRepairReplacement",
				"totalRecovery",
				"publicCostTotal",
				"privateCostTotal",
				"responseCost",
			].includes(key) &&
			typeof value === "number"
		) {
			return formatCurrencyWithCode(
				value,
				currency,
				{},
				value >= 1_000_000_000
					? "billions"
					: value >= 1_000_000
						? "millions"
						: value >= 1_000
							? "thousands"
							: undefined,
			);
		}

		// Format other numeric values with proper grouping
		if (typeof value === "number") {
			return formatNumber(value);
		}

		return String(value);
	};

	return (
		<div className="table-wrapper">
			<table className="dts-table" role="grid" aria-label={title}>
				<thead>
					<tr>
						{columns.map((column) => (
							<th
								key={column.key}
								onClick={() => requestSort(column.key)}
								aria-sort={
									sortConfig?.key === column.key
										? sortConfig.direction
										: undefined
								}
								role="columnheader"
								aria-label={`${column.label}, click to sort`}
								tabIndex={0}
								onKeyPress={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										requestSort(column.key);
									}
								}}
							>
								{column.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{sortedData.map((item, index) => (
						<tr key={index} role="row">
							{columns.map((column) => (
								<td key={column.key} role="gridcell">
									{formatValue(item[column.key], column.key)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default EffectDetails;
