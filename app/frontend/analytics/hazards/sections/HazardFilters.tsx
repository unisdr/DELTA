
import { Form, useNavigation } from "react-router";
import { TreeNode } from "primereact/treenode";
import { TreeSelect, TreeSelectChangeEvent } from "primereact/treeselect";
import React, { useState, useEffect } from "react";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { PartialDivision } from "~/backend.server/models/division";

import { buildPrimeReactTreeNodes } from "~/utils/PrimeReactUtil";
import { Button } from "primereact/button";

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
	hazardTypes: HazardType[];
	hazardClusters: HazardCluster[];
	specificHazards: SpecificHazard[];
	geographicLevels: PartialDivision[];
	onClearFilters: () => void;
	selectedHazardClusterId: string | null;
	selectedSpecificHazardId: string | null;
	selectedGeographicLevelId: string | null;
}

const HazardFilters: React.FC<FiltersProps> = ({ hazardTypes, hazardClusters, specificHazards, geographicLevels, onClearFilters, selectedHazardClusterId, selectedSpecificHazardId, selectedGeographicLevelId }) => {
	const [hazardTypeId, setHazardTypeId] = useState<string | null>(null);
	const [hazardClusterId, setHazardClusterId] = useState<string | null>(
		selectedHazardClusterId,
	);
	const [specificHazardId, setSpecificHazardId] = useState<string | null>(
		selectedSpecificHazardId,
	);
	const [fromDate, setFromDate] = useState<string | null>(null);
	const [toDate, setToDate] = useState<string | null>(null);
	const [geographicLevelId, setGeographicLevelId] = useState<string | null>(
		selectedGeographicLevelId,
	);
	const [nodes, setNodes] = useState<TreeNode[] | null>(null);

	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

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
			confirmDialog({
				message: "Please select a hazard type first.",
				header: "Warning",
				icon: "pi pi-exclamation-triangle",
				rejectClassName: "hidden",
				acceptLabel: "OK",
			});
			e.preventDefault();
			return;
		}

		if (fromDate && toDate) {
			const from = new Date(fromDate);
			const to = new Date(toDate);
			if (to < from) {
				confirmDialog({
					message: "The 'To' date cannot be earlier than the 'From' date.",
					header: "Warning",
					icon: "pi pi-exclamation-triangle",
					rejectClassName: "hidden",
					acceptLabel: "OK",
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
			<ConfirmDialog />
			<Form
				method="post"
				onSubmit={handleApply}
				className={isSubmitting ? "opacity-60 pointer-events-none" : ""}
			>
				{/* First Row */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

					<div className="dts-form-component">
						<label htmlFor="hazard-type" className="block mb-0.5">
							{"Hazard type"} *
						</label>

						<select
							id="hazard-type"
							name="hazardTypeId"
							value={hazardTypeId || ""}
							onChange={(e) => setHazardTypeId(e.target.value || null)}
							className="w-full"
						>
							<option value="">
								{"Select a hazard type"}
							</option>

							{hazardTypes.map((type) => (
								<option key={type.id} value={type.id}>
									{type.name}
								</option>
							))}
						</select>
					</div>

					<div className="dts-form-component">
						<label htmlFor="hazard-cluster" className="block mb-0.5">
							{"Hazard cluster"}
						</label>

						<select
							id="hazard-cluster"
							name="hazardClusterId"
							value={hazardClusterId || ""}
							onChange={(e) => setHazardClusterId(e.target.value || null)}
							disabled={!hazardTypeId}
							className="w-full"
						>
							<option value="">
								{"Select a hazard cluster"}
							</option>

							{filteredClusters.map((cluster) => (
								<option key={cluster.id} value={cluster.id}>
									{cluster.name}
								</option>
							))}
						</select>
					</div>

					<div className="dts-form-component">
						<label htmlFor="specific-hazard" className="block mb-0.5">
							{"Specific hazard"}
						</label>

						<select
							id="specific-hazard"
							name="specificHazardId"
							value={specificHazardId || ""}
							onChange={(e) => setSpecificHazardId(e.target.value || null)}
							disabled={!hazardClusterId}
							className="w-full"
						>
							<option value="">
								{"Select a specific hazard"}
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
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">

					<div className="dts-form-component">
						<label htmlFor="geographicLevelId" className="block mb-0.5">
							{"Geographic level"}
						</label>

						<TreeSelect
							id="geographicLevelId"
							value={geographicLevelId}
							options={nodes ?? []}
							onChange={(e: TreeSelectChangeEvent) =>
								setGeographicLevelId(e.target.value as string | null)
							}
							className="w-full"
							placeholder={"Select Item"}
						/>
					</div>

					<div className="dts-form-component">
						<label htmlFor="from-date" className="block mb-0.5">
							{"From"}
						</label>

						<input
							type="date"
							id="from-date"
							name="fromDate"
							value={fromDate || ""}
							onChange={(e) => setFromDate(e.target.value || null)}
							className="w-full"
						/>
					</div>

					<div className="dts-form-component">
						<label htmlFor="to-date" className="block mb-0.5">
							{"To"}
						</label>

						<input
							type="date"
							id="to-date"
							name="toDate"
							value={toDate || ""}
							onChange={(e) => setToDate(e.target.value || null)}
							className="w-full"
						/>
					</div>

				</div>

				{/* Hidden Input */}
				<input
					type="hidden"
					name="geographicLevelId"
					value={geographicLevelId ?? ""}
				/>

				{/* Buttons */}
				<div className="flex justify-end gap-2 mt-6">

					<Button
						type="button"
						onClick={handleClear}
						disabled={isSubmitting}
						label={"Clear"}
						outlined
					/>

					<Button
						type="submit"
						disabled={isSubmitting}
						label={isSubmitting ? "Applying..." : "Apply filters"}
					/>

				</div>

			</Form>
		</div>
	);
};

export default HazardFilters;
