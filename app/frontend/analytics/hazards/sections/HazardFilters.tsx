import { Form, useNavigation } from 'react-router';
import { TreeNode } from 'primereact/treenode';
import { TreeSelect, TreeSelectChangeEvent } from 'primereact/treeselect';
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { PartialDivision } from '~/backend.server/models/division';
import { ViewContext } from '~/frontend/context';
import { buildPrimeReactTreeNodes } from '~/util/PrimeReactUtil';

interface HazardType {
	id: string;
	name: string;
}

interface HazardCluster {
	id: string;
	name: string;
	typeId: string;
}

interface SpecificHazard {
	id: string;
	name: string;
	clusterId: string;
}

interface FiltersProps {
	ctx: ViewContext;
	hazardTypes: HazardType[];
	hazardClusters: HazardCluster[];
	specificHazards: SpecificHazard[];
	geographicLevels: PartialDivision[];
	onClearFilters: () => void;
	selectedHazardClusterId: string | null;
	selectedSpecificHazardId: string | null;
	selectedGeographicLevelId: string | null;
}

const HazardFilters: React.FC<FiltersProps> = ({
	ctx,
	hazardTypes,
	hazardClusters,
	specificHazards,
	geographicLevels,
	onClearFilters,
	selectedHazardClusterId,
	selectedSpecificHazardId,
	selectedGeographicLevelId,
}) => {
	const [hazardTypeId, setHazardTypeId] = useState<string | null>(null);
	const [hazardClusterId, setHazardClusterId] = useState<string | null>(selectedHazardClusterId);
	const [specificHazardId, setSpecificHazardId] = useState<string | null>(selectedSpecificHazardId);
	const [fromDate, setFromDate] = useState<string | null>(null);
	const [toDate, setToDate] = useState<string | null>(null);
	const [geographicLevelId, setGeographicLevelId] = useState<string | null>(
		selectedGeographicLevelId
	);
	const [nodes, setNodes] = useState<TreeNode[] | null>(null);

	const navigation = useNavigation();
	const isSubmitting = navigation.state === 'submitting';

	useEffect(() => {
		setHazardClusterId(null);
		setSpecificHazardId(null);
	}, [hazardTypeId]);

	useEffect(() => {
		setSpecificHazardId(null);
	}, [hazardClusterId]);

	useEffect(() => {
		setNodes(buildPrimeReactTreeNodes(geographicLevels));
	}, [geographicLevels]);

	const handleApply = (e: React.FormEvent) => {
		if (!hazardTypeId) {
			Swal.fire({
				icon: 'warning',
				text: ctx.t({
					"code": "analysis.select_hazard_type_first",
					"msg": "Please select a hazard type first."
				}),
				confirmButtonText: 'OK',
			});
			e.preventDefault();
			return;
		}

		if (fromDate && toDate) {
			const from = new Date(fromDate);
			const to = new Date(toDate);
			if (to < from) {
				Swal.fire({
					icon: 'warning',
					text: ctx.t({
						"code": "common.to_date_cannot_be_earlier_than_from_date",
						"msg": "The 'To' date cannot be earlier than the 'From' date."
					}),
					confirmButtonText: 'OK',
				});
				e.preventDefault();
				return;
			}
		}
	};

	const handleClear = () => {
		setHazardTypeId(null);
		setHazardClusterId(null);
		setSpecificHazardId(null);
		setGeographicLevelId(null);
		setFromDate(null);
		setToDate(null);
		onClearFilters();
	};

	const filteredClusters = hazardTypeId
		? hazardClusters.filter((cluster) => cluster.typeId === hazardTypeId)
		: [];

	const filteredSpecificHazards = hazardClusterId
		? specificHazards.filter((hazard) => hazard.clusterId === hazardClusterId)
		: [];

	return (
		<div className="relative">
			<Form
				method="post"
				onSubmit={handleApply}
				className={isSubmitting ? 'opacity-60 pointer-events-none' : ''}
			>
				{/* First Row */}
				<div className="formgrid grid">
					<div className="field col-4 dts-form-component">
						<label htmlFor="hazard-type">
							{ctx.t({
								"code": "hip.hazard_type",
								"msg": "Hazard type"
							})} *
						</label>
						<select
							id="hazard-type"
							name="hazardTypeId"
							value={hazardTypeId || ''}
							onChange={(e) => setHazardTypeId(e.target.value || null)}
						>
							<option value="">
								{ctx.t({
									"code": "hip.select_hazard_type",
									"msg": "Select a hazard type"
								})}
							</option>
							{hazardTypes.map((type) => (
								<option key={type.id} value={type.id}>
									{type.name}
								</option>
							))}
						</select>
					</div>

					<div className="field col-4 dts-form-component">
						<label htmlFor="hazard-cluster">
							{ctx.t({
								"code": "hip.hazard_cluster",
								"msg": "Hazard cluster"
							})}
						</label>
						<select
							id="hazard-cluster"
							name="hazardClusterId"
							value={hazardClusterId || ''}
							onChange={(e) => setHazardClusterId(e.target.value || null)}
							disabled={!hazardTypeId}
						>
							<option value="">
								{ctx.t({
									"code": "analysis.select_hazard_cluster",
									"msg": "Select a hazard cluster"
								})}
							</option>
							{filteredClusters.map((cluster) => (
								<option key={cluster.id} value={cluster.id}>
									{cluster.name}
								</option>
							))}
						</select>
					</div>

					<div className="field col-4 dts-form-component">
						<label htmlFor="specific-hazard">
							{ctx.t({
								"code": "analysis.specific_hazard",
								"msg": "Specific hazard"
							})}
						</label>
						<select
							id="specific-hazard"
							name="specificHazardId"
							value={specificHazardId || ''}
							onChange={(e) => setSpecificHazardId(e.target.value || null)}
							disabled={!hazardClusterId}
						>
							<option value="">
								{ctx.t({
									"code": "analysis.select_specific_hazard",
									"msg": "Select a specific hazard"
								})}
							</option>
							{filteredSpecificHazards.map((hazard) => (
								<option key={hazard.id} value={hazard.id}>
									{hazard.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Second Row */}
				<div className="formgrid grid">
					<div className="field col-4">
						<label htmlFor="geographicLevelId" className="mb-4">
							{ctx.t({
								"code": "analysis.geographic_level",
								"msg": "Geographic level"
							})}
						</label>
						<TreeSelect
							id="geographicLevelId"
							value={geographicLevelId}
							options={nodes ?? []}
							onChange={(e: TreeSelectChangeEvent) =>
								setGeographicLevelId(e.target.value as string | null)
							}
							className="w-full"
							placeholder={ctx.t({
								"code": "common.select_item_placeholder",
								"msg": "Select Item"
							})}
						/>
					</div>
					<input type="hidden" name="geographicLevelId" value={geographicLevelId ?? ''} />

					<div className="field col-4 dts-form-component">
						<label htmlFor="from-date">
							{ctx.t({
								"code": "common.from_date",
								"desc": "From date",
								"msg": "From"
							})}
						</label>
						<input
							type="date"
							id="from-date"
							name="fromDate"
							value={fromDate || ''}
							onChange={(e) => setFromDate(e.target.value || null)}
						/>
					</div>

					<div className="field col-4 dts-form-component">
						<label htmlFor="to-date">
							{ctx.t({
								"code": "common.to_date",
								"desc": "To date",
								"msg": "To"
							})}
						</label>
						<input
							type="date"
							id="to-date"
							name="toDate"
							value={toDate || ''}
							onChange={(e) => setToDate(e.target.value || null)}
						/>
					</div>
				</div>

				{/* Buttons */}
				<div className="flex justify-content-end">
					<button
						className="mg-button mg-button--small mg-button-outline m-2"
						type="button"
						onClick={handleClear}
						disabled={isSubmitting}
					>
						{ctx.t({
							"code": "common.clear",
							"msg": "Clear"
						})}
					</button>

					<button
						className="mg-button mg-button--small mg-button-primary m-2"
						type="submit"
						disabled={isSubmitting}
					>
						{isSubmitting
							? ctx.t({
								"code": "analysis.applying_filters",
								"desc": "Button label while filters are being applied",
								"msg": "Applying..."
							})
							: ctx.t({
								"code": "common.apply_filters",
								"msg": "Apply filters"
							})}
					</button>
				</div>
			</Form>
		</div>
	);
};

export default HazardFilters;
