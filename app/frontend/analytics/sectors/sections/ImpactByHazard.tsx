import { useState, useCallback, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { LoadingSpinner } from "~/frontend/components/LoadingSpinner";
import { ErrorMessage } from "~/frontend/components/ErrorMessage";
import { formatCurrencyWithCode } from "~/frontend/utils/formatters";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";
import { ViewContext } from "~/frontend/context";

// Types
interface Sector {
	id: string;
	sectorname: string;
	subsectors?: Sector[];
}

// Colors for the pie chart slices
const COLORS = [
	"#205375", // A dark blue from UNDRR Blue (corporate blue)
	"#FAA635", // A vivid orange from Target C (loss)
	"#F45D01", // A deeper orange from Target C
	"#68B3C8", // A light blue from UNDRR Teal (secondary shades)
	"#F7B32B", // A bright yellow from Target C
];

interface ImpactByHazardProps {
	ctx: ViewContext;
	filters: {
		disasterEventId: any;
		sectorId: string | null;
		hazardTypeId: string | null;
		hazardClusterId: string | null;
		specificHazardId: string | null;
		geographicLevelId: string | null;
		fromDate: string | null;
		toDate: string | null;
		subSectorId: string | null;
	};
	currency: string;
	hazardImpactData: HazardImpactResponse | null;
	// New prop to receive sectors data from loader instead of fetching via API
	sectorsData?: { sectors: Sector[] | null };
}

interface HazardImpactResponse {
	success: boolean;
	data: {
		eventsCount: Array<{
			hazardId: string;
			hazardName: string;
			value: string;
			percentage: number;
		}>;
		damages: Array<{
			hazardId: string;
			hazardName: string;
			value: string;
			percentage: number;
		}>;
		losses: Array<{
			hazardId: string;
			hazardName: string;
			value: string;
			percentage: number;
		}>;
	};
}

interface Sector {
	id: string;
	sectorname: string;
	subsectors?: Sector[];
}

const CustomTooltip = ({ active, payload, title, currency }: any) => {
	const defaultCurrency = currency;

	if (active && payload && payload.length) {
		const data = payload[0].payload;
		const formattedPercentage = `${Math.round(data.value)}%`;

		// Get color using the payload's index
		const segmentIndex = data.index || 0;
		const segmentColor = COLORS[segmentIndex % COLORS.length];

		const isLightColor = (color: string) => {
			try {
				const hex = color.replace('#', '');
				const r = parseInt(hex.substr(0, 2), 16);
				const g = parseInt(hex.substr(2, 2), 16);
				const b = parseInt(hex.substr(4, 2), 16);
				const brightness = (r * 299 + g * 587 + b * 114) / 1000;
				return brightness > 128;
			} catch (error) {
				return false;
			}
		};
		const textColor = isLightColor(segmentColor) ? '#000000' : '#FFFFFF';

		// Check if formatting as currency or count is needed
		let formattedValue = data.rawValue;
		if (title === "Number of disaster events") {
			formattedValue = `${data.rawValue}`;
		} else {
			// Use formatCurrencyWithCode for damages and losses
			const numericValue = typeof data.rawValue === 'string' ? parseFloat(data.rawValue) : Number(data.rawValue);
			formattedValue = formatCurrencyWithCode(
				numericValue,
				defaultCurrency,
				{},
				numericValue >= 1_000_000_000 ? 'billions' :
					numericValue >= 1_000_000 ? 'millions' :
						numericValue >= 1_000 ? 'thousands' :
							undefined
			);
		}

		return (
			<div className="custom-tooltip" style={{
				backgroundColor: segmentColor,
				padding: '10px',
				border: `2px solid ${segmentColor}`,
				borderRadius: '6px',
				boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
				color: textColor,
				transition: 'all 0.2s ease',
				minWidth: '150px'
			}}>
				<p style={{
					margin: '0 0 4px 0',
					fontWeight: 'bold',
					fontSize: '14px'
				}}>{`${data.name}: ${formattedPercentage}`}</p>
				{formattedValue && (
					<p style={{
						margin: 0,
						fontSize: '13px',
						opacity: 0.9
					}}>
						{title === "Number of disaster events"
							? `Count: ${formattedValue}`
							: `Value: ${formattedValue}`}
					</p>
				)}
			</div>
		);
	}
	return null;
};

const CustomPieChart = ({ ctx, data, title, currency }: { ctx: ViewContext, data: any[], title: string, currency: string }) => {
	const [activeIndex, setActiveIndex] = useState(-1);

	const onPieEnter = useCallback(
		(_: any, index: number) => {
			setActiveIndex(index);
		},
		[setActiveIndex]
	);

	const onPieLeave = useCallback(() => {
		setActiveIndex(-1);
	}, [setActiveIndex]);

	const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value, index }: any) => {
		const RADIAN = Math.PI / 180;
		// Increase radius to push labels further out consistently
		const radius = outerRadius * 1.4; // Increased from 1.1 to 1.4 for more spacing
		const x = cx + radius * Math.cos(-midAngle * RADIAN);
		const y = cy + radius * Math.sin(-midAngle * RADIAN);

		// Only show if percentage is significant enough
		if (percent < 0.03) return null;

		// Format the percentage - round to whole number
		const formattedPercentage = `${Math.round(value)}%`;

		// Get the segment color
		const segmentColor = COLORS[index % COLORS.length];

		// Handle long names by splitting into multiple lines
		const words = name.split(' ');
		const lines = [];
		let currentLine = '';

		for (const word of words) {
			if (currentLine && (currentLine.length + word.length + 1) > 15) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = currentLine ? `${currentLine} ${word}` : word;
			}
		}
		if (currentLine) {
			lines.push(currentLine);
		}

		// Calculate vertical offset based on number of lines
		const lineHeight = 1.2;
		const totalHeight = lines.length * lineHeight;
		const initialDY = -(totalHeight / 2) + (lineHeight / 2);

		return (
			<text
				x={x}
				y={y}
				fill={segmentColor}
				textAnchor={x > cx ? 'start' : 'end'}
				style={{
					fontSize: '12px',
					fontWeight: 'normal',
				}}
			>
				{lines.map((line, i) => (
					<tspan
						key={i}
						x={x}
						dy={i === 0 ? `${initialDY}em` : `${lineHeight}em`}
					>
						{line}
					</tspan>
				))}
				<tspan
					x={x}
					dy={`${lineHeight}em`}
				>
					({formattedPercentage})
				</tspan>
			</text>
		);
	};

	const renderLegendText = (value: string, entry: any) => {
		return (
			<span style={{
				color: activeIndex === entry.index ? '#000' : '#666',
				fontWeight: activeIndex === entry.index ? 'bold' : 'normal'
			}}>
				{`${value}`}
			</span>
		);
	};

	if (!data || data.length === 0) {
		return (
			<div className="dts-data-box">
				<h3 className="dts-body-label">
					<span>{title}</span>
				</h3>
				<div className="flex items-center justify-center h-[300px]">
					<p className="text-gray-500">
						{ctx.t({
							"code": "common.no_data_available",
							"msg": "No data available"
						})}
					</p>
				</div>
			</div>
		);
	}

	// Add index to the data
	const dataWithIndex = data.map((item, index) => ({
		...item,
		index
	}));

	return (
		<div className="dts-data-box">
			<h3 className="dts-body-label">
				<span>{title}</span>
			</h3>
			<div style={{ height: "300px" }}>
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={dataWithIndex}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							outerRadius={80}
							innerRadius={50}
							startAngle={90}
							endAngle={-270}
							label={renderCustomizedLabel}
							labelLine={true}
							onMouseEnter={onPieEnter}
							onMouseLeave={onPieLeave}
							animationBegin={0}
							animationDuration={1000}
							animationEasing="ease-out"
						>
							{dataWithIndex.map((_item, index) => (
								<Cell
									key={index}
									fill={COLORS[index % COLORS.length]}
									opacity={activeIndex === index ? 1 : 0.8}
									strokeWidth={activeIndex === index ? 2 : 0}
									stroke={COLORS[index % COLORS.length]}
								/>
							))}
						</Pie>
						<Tooltip content={<CustomTooltip title={title} currency={currency} />} />
						<Legend
							verticalAlign="bottom"
							align="center"
							layout="horizontal"
							formatter={renderLegendText}
							onMouseEnter={(_, index) => setActiveIndex(index)}
							onMouseLeave={() => setActiveIndex(-1)}
						/>
					</PieChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

function ImpactByHazardComponent({ ctx, filters, currency, hazardImpactData, sectorsData }: ImpactByHazardProps) {
	const enabled = !!filters.sectorId;
	const targetSectorId = filters.subSectorId || filters.sectorId;

	// Use sectors data from props
	const sectors = sectorsData?.sectors || [];

	// Debug output for hazard impact data
	useEffect(() => {
		if (hazardImpactData) {
		}
	}, [hazardImpactData]);

	if (!enabled) {
		return (
			<div className="text-gray-500">
				{ctx.t({
					"code": "analysis.select_sector_to_view_hazard_impact",
					"msg": "Please select a sector to view hazard impact data."
				})}
			</div>
		);
	}

	if (!hazardImpactData) {
		return <LoadingSpinner />;
	}

	if (!hazardImpactData.success) {
		console.error('Failed to load hazard impact data', {
			targetSectorId,
			hasFilters: Object.values(filters).some(value => value !== null)
		});
		return (
			<ErrorMessage
				message={ctx.t({
					"code": "analysis.failed_to_load_hazard_impact_data",
					"msg": "Failed to load hazard impact data"
				})}
			/>
		);
	}

	if (!hazardImpactData.data?.eventsCount || !hazardImpactData.data?.damages || !hazardImpactData.data?.losses) {
		console.error('Invalid data structure received from loader', {
			hasData: !!hazardImpactData,
			hasSuccess: hazardImpactData.success,
			hasDataProperty: !!(hazardImpactData.data),
			expectedProperties: ['eventsCount', 'damages', 'losses'],
			receivedProperties: hazardImpactData.data ? Object.keys(hazardImpactData.data) : [],
			dataStructure: typeof hazardImpactData
		});
		return (
			<ErrorMessage
				message={ctx.t({
					"code": "analysis.invalid_data_structure",
					"msg": "Invalid data structure received from server"
				})}
			/>
		);
	}

	// Find the current sector and its parent
	const findSectorWithParent = (sectors: Sector[], targetId: string): { sector: Sector | undefined; parent: Sector | undefined } => {
		for (const sector of sectors) {
			// Check if this is the main sector
			if (sector.id.toString() === targetId) {
				return { sector, parent: undefined };
			}
			// Check subsectors
			if (sector.subsectors) {
				const subsector = sector.subsectors.find(sub => sub.id.toString() === targetId);
				if (subsector) {
					return { sector: subsector, parent: sector };
				}

				// Recursively check deeper subsectors
				for (const sub of sector.subsectors) {
					if (sub.subsectors && sub.subsectors.length > 0) {
						const result = findSectorWithParent(sub.subsectors, targetId);
						if (result.sector) {
							return { sector: result.sector, parent: sub };
						}
					}
				}
			}
		}
		return { sector: undefined, parent: undefined };
	};

	// Construct title based on sector/subsector selection
	const sectionTitle = () => {
		if (!sectors || sectors.length === 0) {
			return ctx.t({
				"code": "analysis.impact_by_hazard_type",
				"msg": "Impact by hazard type"
			});
		}

		if (filters.sectorId) {
			const { sector } = findSectorWithParent(sectors, filters.sectorId);

			if (filters.subSectorId && sector) {
				// Case: Subsector is selected
				const { sector: subsector, parent: mainSector } = findSectorWithParent(sectors, filters.subSectorId);
				if (subsector && mainSector) {
					return ctx.t(
						{
							"code": "analysis.impact_in_subsector_by_hazard_type",
							"desc": "Title for impact analysis in a subsector under a main sector, broken down by hazard type. {subsector} is the subsector name, {sector} is the main sector name.",
							"msg": "Impact in {subsector} ({sector} Sector) by Hazard type"
						},
						{ subsector: subsector.sectorname, sector: mainSector.sectorname }
					);
				}
			}

			// Case: Only sector is selected
			if (sector) {
				return ctx.t(
					{
						"code": "analysis.impact_in_sector_by_hazard_type",
						"desc": "Title for impact analysis in a sector, broken down by hazard type. {sector} is the name of the sector.",
						"msg": "Impact in {sector} Sector by Hazard type"
					},
					{ sector: sector.sectorname }
				);
			}
		}
		return ctx.t({
			"code": "analysis.impact_by_hazard_type",
			"msg": "Impact by hazard type"
		});
	};

	const formatChartData = (rawData: any[] | null) => {
		if (!Array.isArray(rawData) || rawData.length === 0) {
			return { data: [], dataAvailability: 'no_data' };
		}

		// Check if all values are zero
		const allZero = rawData.every(item => {
			// Ensure proper parsing of string values
			const value = typeof item.value === 'string' ? parseFloat(item.value) : Number(item.value);
			return !isNaN(value) && value === 0;
		});

		if (allZero) {
			return { data: [], dataAvailability: 'zero' };
		}

		// Filter out null values and undefined names, but keep non-zero values
		const filteredData = rawData
			.filter(item => {
				// Ensure proper parsing of string values
				const value = typeof item.value === 'string' ? parseFloat(item.value) : Number(item.value);
				return !isNaN(value) && value > 0 && item.hazardName != null;
			})
			.map((item, index) => ({
				name: item.hazardName || 'Unknown or no hazard type',
				value: item.percentage || 0,
				rawValue: item.value || '0',
				// Add index to help with color assignment in the chart
				index
			}));

		return {
			data: filteredData.length > 0 ? filteredData : [],
			dataAvailability: filteredData.length > 0 ? 'available' : 'no_data'
		};
	};

	// Process the data with performance tracking
	const eventsResult = formatChartData(hazardImpactData?.data?.eventsCount ?? []);
	const damagesResult = formatChartData(hazardImpactData?.data?.damages ?? []);
	const lossesResult = formatChartData(hazardImpactData?.data?.losses ?? []);

	if (!hazardImpactData?.success || !hazardImpactData?.data) {
		console.error('Invalid data structure after processing', {
			hasData: !!hazardImpactData,
			hasSuccess: !!hazardImpactData?.success,
			hasDataProperty: !!(hazardImpactData?.data),
			processingResults: {
				events: eventsResult.dataAvailability,
				damages: damagesResult.dataAvailability,
				losses: lossesResult.dataAvailability
			}
		});
		return (
			<ErrorMessage
				message={ctx.t({
					"code": "analysis.invalid_data_structure",
					"msg": "Invalid data structure received from server"
				})}
			/>
		);
	}

	return (
		<section className="dts-page-section" style={{ maxWidth: "100%", overflow: "hidden" }}>
			<div className="mg-container" style={{ maxWidth: "100%", overflow: "hidden" }}>
				<h2 className="dts-heading-2">{sectionTitle()}</h2>
				<p className="dts-body-text mb-6">
					{ctx.t({
						"code": "analysis.hazard_impact_description",
						"msg": "Analysis of how different hazards affect this sector"
					})}
				</p>
				<div className="mg-grid mg-grid__col-3">
					{/* Number of disaster events */}
					<div className="dts-data-box">
						{eventsResult.dataAvailability === 'available' ? (
							<CustomPieChart
								ctx={ctx}
								data={eventsResult.data}
								title={ctx.t({
									"code": "analysis.number_of_disaster_events",
									"msg": "Number of disaster events"
								})}
								currency={currency}
							/>
						) : eventsResult.dataAvailability === 'zero' ? (
							<>
								<h3 className="dts-body-label mb-2">
									{ctx.t({
										"code": "analysis.number_of_disaster_events",
										"msg": "Number of disaster events"
									})}
								</h3>
								<p className="text-gray-500 text-center mt-4">
									{ctx.t({
										"code": "analysis.zero_impact_confirmed",
										"msg": "Zero Impact (Confirmed)"
									})}
								</p>
							</>
						) : (
							<>
								<h3 className="dts-body-label mb-2">
									{ctx.t({
										"code": "analysis.number_of_disaster_events",
										"msg": "Number of disaster events"
									})}
								</h3>
								<EmptyChartPlaceholder ctx={ctx} height={300} />
							</>
						)}
					</div>

					{/* Damages by hazard type */}
					<div className="dts-data-box">
						{damagesResult.dataAvailability === 'available' ? (
							<CustomPieChart
								ctx={ctx}
								data={damagesResult.data}
								title={ctx.t({
									"code": "analysis.damages_by_hazard_type",
									"msg": "Damages by hazard type"
								})}
								currency={currency}
							/>

						) : damagesResult.dataAvailability === 'zero' ? (
							<>
								<h3 className="dts-body-label mb-2">
									{ctx.t({
										"code": "analysis.damages_by_hazard_type",
										"msg": "Damages by hazard type"
									})}
								</h3>
								<p className="text-gray-500 text-center mt-4">
									{ctx.t({
										"code": "analysis.zero_impact_confirmed",
										"msg": "Zero Impact (Confirmed)"
									})}
								</p>
							</>
						) : (
							<>
								<h3 className="dts-body-label mb-2">
									{ctx.t({
										"code": "analysis.damages_by_hazard_type",
										"msg": "Damages by hazard type"
									})}
								</h3>
								<EmptyChartPlaceholder ctx={ctx} height={300} />
							</>
						)}
					</div>

					{/* Losses by hazard type */}
					<div className="dts-data-box">
						{lossesResult.dataAvailability === 'available' ? (
							<CustomPieChart
								ctx={ctx}
								data={lossesResult.data}
								title={ctx.t({
									"code": "analysis.losses_by_hazard_type",
									"msg": "Losses by hazard type"
								})}
								currency={currency}
							/>
						) : lossesResult.dataAvailability === 'zero' ? (
							<>
								<h3 className="dts-body-label mb-2">
									{ctx.t({
										"code": "analysis.losses_by_hazard_type",
										"msg": "Losses by hazard type"
									})}
								</h3>
								<p className="text-gray-500 text-center mt-4">
									{ctx.t({
										"code": "analysis.zero_impact_confirmed",
										"msg": "Zero Impact (Confirmed)"
									})}
								</p>
							</>
						) : (
							<>
								<h3 className="dts-body-label mb-2">
									{ctx.t({
										"code": "analysis.losses_by_hazard_type",
										"msg": "Losses by hazard type"
									})}
								</h3>
								<EmptyChartPlaceholder ctx={ctx} height={300} />
							</>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}

export default function ImpactByHazard(props: ImpactByHazardProps) {
	return <ImpactByHazardComponent {...props} />;
}
