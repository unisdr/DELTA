import { Form } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { ViewContext } from '../context';
import { canAddNewRecord } from '../user/roles';

interface Organization {
	id: string;
	name: string;
}

interface HazardousEventFiltersProps {
	ctx: ViewContext;

	// Filter values
	hipHazardId?: string;
	hipClusterId?: string;
	hipTypeId?: string;
	fromDate?: string;
	toDate?: string;
	recordingOrganization?: string;
	hazardousEventStatus?: string;
	recordStatus?: string;
	viewMyRecords?: boolean;
	pendingMyAction?: boolean;
	search?: string;

	// Data for dropdowns
	hip: any;
	organizations: Organization[];

	// URL for clearing filters
	clearFiltersUrl: string;
}

export function getEventStatusOptions(ctx: ViewContext) {
	return [
		{ value: "forecasted", label: ctx.t({
			"code": "hazardous_event.status.forecasted",
			"desc": "Label for forecasted hazardous event status",
			"msg": "Forecasted"
		}) },
		{ value: "ongoing", label: ctx.t({
			"code": "hazardous_event.status.ongoing",
			"desc": "Label for ongoing hazardous event status",
			"msg": "Ongoing"
		}) },
		{ value: "passed", label: ctx.t({
			"code": "hazardous_event.status.passed",
			"desc": "Label for passed hazardous event status",
			"msg": "Passed"
		}) }
	];
}

export function getRecordStatusOptions(ctx: ViewContext) {
	return [
		{ value: "draft", label: ctx.t({
			"code": "hazardous_event.record_status.draft",
			"desc": "Label for draft record status",
			"msg": "Draft"
		}) },
		{ value: "waiting-for-validation", label: ctx.t({
			"code": "hazardous_event.record_status.waiting_for_validation",
			"desc": "Label for waiting for validation record status",
			"msg": "Waiting for validation"
		}) },
		{ value: "needs-revision", label: ctx.t({
			"code": "hazardous_event.record_status.needs_revision",
			"desc": "Label for needs revision record status",
			"msg": "Needs revision"
		}) },
		{ value: "validated", label: ctx.t({
			"code": "hazardous_event.record_status.validated",
			"desc": "Label for validated record status",
			"msg": "Validated"
		}) },
		{ value: "published", label: ctx.t({
			"code": "hazardous_event.record_status.published",
			"desc": "Label for published record status",
			"msg": "Published"
		}) }
	];
}

/**
 * Specialized filter component for hazardous events
 * Implements all required filters based on business requirements
 */
export function HazardousEventFilters({
	ctx,
	hipHazardId = '',
	hipClusterId = '',
	hipTypeId = '',
	fromDate = '',
	toDate = '',
	recordingOrganization = '',
	hazardousEventStatus = '',
	recordStatus = '',
	viewMyRecords = false,
	pendingMyAction = false,
	search = '',
	hip,
	clearFiltersUrl,
}: HazardousEventFiltersProps) {
	// State for autocomplete functionality
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedHazardId, setSelectedHazardId] = useState(hipHazardId || '');
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedTypeId, setSelectedTypeId] = useState(hipTypeId || '');
	const [selectedClusterId, setSelectedClusterId] = useState(hipClusterId || '');

	// Initialize search term with hazard name if hazard ID is provided
	useEffect(() => {
		if (hipHazardId && hip.hazards) {
			const hazard = hip.hazards.find((h: any) => h.id === hipHazardId);
			if (hazard) {
				setSearchTerm(hazard.name);
			}
		}
	}, [hipHazardId, hip.hazards]);

	// Filter hazards based on search term and selected cluster  (we only have Id, clusterId and name)
	// { id: '78470', clusterId: '1054', name: 'Rinderpest (Animal)' }
	const filteredHazards =
		hip.hazards?.filter((hazard: any) => {
			const matchesSearch =
				hazard.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				hazard.id?.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCluster = !selectedClusterId || hazard.clusterId === selectedClusterId;
			return matchesSearch && matchesCluster;
		}) || [];

	// Filter clusters based on selected type
	const filteredClusters =
		hip.clusters?.filter((cluster: any) => {
			return !selectedTypeId || cluster.typeId === selectedTypeId;
		}) || [];

	// Handle hazard selection from autocomplete
	const handleHazardSelect = (hazard: any) => {
		setSearchTerm(hazard.name);
		setSelectedHazardId(hazard.id); // Store the actual hazard ID
		setShowDropdown(false);

		// Auto-select the related cluster and type
		const relatedCluster = hip.clusters?.find((c: any) => c.id === hazard.clusterId);
		if (relatedCluster) {
			setSelectedClusterId(relatedCluster.id);
			const relatedType = hip.types?.find((t: any) => t.id === relatedCluster.typeId);
			if (relatedType) {
				setSelectedTypeId(relatedType.id);
			}
		}
	};

	return (
		<>
			<Form className="dts-form" method="get">
				<div className="dts-form__body">
					{/* First Row: Hazard Classification - 3 columns */}
					<div className="mg-grid mg-grid__col-3">

						<div className="dts-form-component">
							<label htmlFor="hipTypeId">
								<div className="dts-form-component__label">
									<span>
										{ctx.t({
											"code": "hip.hazard_type",
											"msg": "Hazard type"
										})}
									</span>
								</div>

								<select
									id="hipTypeId"
									name="hipTypeId"
									value={selectedTypeId}
									onChange={(e) => {
										setSelectedTypeId(e.target.value);
										setSelectedClusterId(''); // Reset cluster when type changes
										setSearchTerm(''); // Reset hazard search
									}}
								>
									<option value="">
										{ctx.t({
											"code": "hip.all_hazard_types",
											"msg": "All hazard types"
										})}
									</option>

									{hip.types?.map((type: any) => (
										<option key={type.id} value={type.id}>
											{type.name}
										</option>
									))}
								</select>
							</label>
						</div>

						<div className="dts-form-component">
							<label htmlFor="hipClusterId">
								<div className="dts-form-component__label">
									<span>
										{ctx.t({
											"code": "hip.cluster",
											"msg": "Cluster"
										})}
									</span>
								</div>
								<select
									id="hipClusterId"
									name="hipClusterId"
									value={selectedClusterId}
									onChange={(e) => {
										setSelectedClusterId(e.target.value);
										setSearchTerm(''); // Reset hazard search when cluster changes
									}}
								>
									<option value="">
										{ctx.t({
											"code": "hip.all_clusters",
											"msg": "All clusters"
										})}
									</option>
									{filteredClusters.map((cluster: any) => (
										<option key={cluster.id} value={cluster.id}>
											{cluster.name}
										</option>
									))}
								</select>
							</label>
						</div>

						<div className="dts-form-component" style={{ position: 'relative' }}>
							<label htmlFor="hipHazardId-display">
								<div className="dts-form-component__label"><span>
									{ctx.t({
										"code": "hip.specific_hazard",
										"msg": "Specific hazard"
									})}
								</span></div>
								<input
									type="text"
									id="hipHazardId-display"
									value={searchTerm}
									onChange={(e) => {
										setSearchTerm(e.target.value);
										setSelectedHazardId(''); // Clear selection when typing
										setShowDropdown(true);
									}}
									onFocus={() => setShowDropdown(true)}
									onBlur={() => {
										// Delay hiding dropdown to allow for clicks
										setTimeout(() => setShowDropdown(false), 200);
									}}
									placeholder={ctx.t({
										"code": "hip.enter_hazard_name_or_hips_id",
										"desc": "Placeholder text for hazard search input",
										"msg": "Enter hazard name or HIPS ID ..."
									})}
								/>
								{/* Hidden input that contains the actual hazard ID for form submission */}
								<input type="hidden" name="hipHazardId" value={selectedHazardId} />
								{showDropdown && searchTerm && filteredHazards.length > 0 && (
									<ul
										style={{
											position: 'absolute',
											top: '100%',
											left: 0,
											right: 0,
											backgroundColor: 'white',
											border: '1px solid #ccc',
											borderTop: 'none',
											borderRadius: '0 0 4px 4px',
											maxHeight: '200px',
											overflowY: 'auto',
											zIndex: 1000,
											listStyle: 'none',
											marginTop: '-10px',
											marginBottom: 0,
											marginLeft: 0,
											marginRight: 0,
											padding: 0,
											display: 'inline-block',
											boxShadow: '0 2px 4px rgba(9, 3, 3, 0.1)',
										}}
									>
										{filteredHazards.slice(0, 20).map((hazard: any) => (
											<li
												key={hazard.id}
												onClick={() => handleHazardSelect(hazard)}
												style={{
													padding: '5px 12px',
													margin: 0,
													cursor: 'pointer',
												}}
												onMouseEnter={(e) => {
													(e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
												}}
												onMouseLeave={(e) => {
													(e.target as HTMLElement).style.backgroundColor = 'white';
												}}
											>
												{hazard.name}
											</li>
										))}
									</ul>
								)}
							</label>
						</div>
					</div>

					{/* Second Row: Date Range and Organization - 3 columns */}
					<div className="mg-grid mg-grid__col-3">
						<div className="dts-form-component">
							<label htmlFor="fromDate">
								<div className="dts-form-component__label"><span>
									{ctx.t({
										"code": "common.date_from",
										"desc": "Date from",
										"msg": "From"
									})}
								</span></div>
								<input type="date" id="fromDate" name="fromDate" defaultValue={fromDate} />
							</label>
						</div>

						<div className="dts-form-component">
							<label htmlFor="toDate">
								<div className="dts-form-component__label"><span>
									{ctx.t({
										"code": "common.date_to",
										"desc": "Date to",
										"msg": "To"
									})}
								</span></div>
								<input type="date" id="toDate" name="toDate" defaultValue={toDate} />
							</label>
						</div>

						<div className="dts-form-component">
							<label htmlFor="recordingOrganization">
								<div className="dts-form-component__label"><span>
									{ctx.t({
										"code": "hazardous_event.recording_organization",
										"msg": "Recording organization"
									})}
								</span></div>
								<input
									type="text"
									id="recordingOrganization"
									name="recordingOrganization"
									defaultValue={recordingOrganization}
									placeholder={ctx.t({
										"code": "hazardous_event.search_organization",
										"desc": "Placeholder for searching organizations in filter",
										"msg": "Search organization..."
									})}
								/>
							</label>
						</div>
					</div>

					{/* Third Row: Status Dropdowns - 2 columns */}
					<div className="mg-grid mg-grid__col-2">
						<div className="dts-form-component">
							<label htmlFor="hazardousEventStatus">
								<div className="dts-form-component__label"><span>
									{ctx.t({
										"code": "hazardous_event.filter.hazardous_event_status",
										"msg": "Hazardous event status"
									})}
								</span></div>
								<select
									id="hazardousEventStatus"
									name="hazardousEventStatus"
									defaultValue={hazardousEventStatus}
								>
									<option value="">
										{ctx.t({
											"code": "hazardous_event.filter.all_event_statuses",
											"msg": "All event statuses"
										})}
									</option>
									{getEventStatusOptions(ctx).map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</label>
						</div>

						<div className="dts-form-component">
							<label htmlFor="recordStatus">
								<div className="dts-form-component__label"><span>
									{ctx.t({
										"code": "hazardous_event.record_status",
										"msg": "Record status"
									})}
								</span></div>
								<select id="recordStatus" name="recordStatus" defaultValue={recordStatus}>
									<option value="">
										{ctx.t({
											"code": "hazardous_event.all_record_statuses",
											"msg": "All record statuses"
										})}
									</option>
									{getRecordStatusOptions(ctx).map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</label>
						</div>
					</div >

					{/* <div className="dts-form__actions">
						<input
							type="submit"
							className="mg-button mg-button-primary"
							value={ctx.t({
								"code": "common.apply_filters",
								"msg": "Apply filters"
							})}
						/>
						<a href={clearFiltersUrl} className="mg-button mg-button-outline">
							{ctx.t({
								"code": "common.clear",
								"msg": "Clear"
							})}
						</a>
					</div> */}

					{/* Fourth Row: Checkboxes and Action Buttons*/}
					<div className="dts-form__actions dts-form__actions--standalone" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
						<div className="dts-form-component" style={{
							display:canAddNewRecord(ctx.user?.role ?? null) ? 'block' : 'none'
						}}>
							<label htmlFor="viewMyRecords" className="dts-form-component__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer' }}>
							<input
								type="checkbox"
								id="viewMyRecords"
								name="viewMyRecords"
								defaultChecked={viewMyRecords}
							/>
							{ ctx.t({
									"code": "list.filter.view_my_records",
									"msg": "View my records"
							}) }
							</label>
						</div>

						<div className="dts-form-component" style={{
							display:canAddNewRecord(ctx.user?.role ?? null) ? 'block' : 'none'
						}}>
							<label htmlFor="pendingMyAction" className="dts-form-component__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer' }}>
							<input
								type="checkbox"
								id="pendingMyAction"
								name="pendingMyAction"
								defaultChecked={pendingMyAction}
							/>
							{ ctx.t({
									"code": "list.filter.pending_my_action",
									"msg": "Pending my action"
							}) }
							
							</label>
						</div>
						</div>

						<div style={{ display: 'flex', gap: '0.8rem' }}>
							<a href={clearFiltersUrl} className="mg-button mg-button-outline mg-button--small">
								{ctx.t({
									"code": "common.clear",
									"msg": "Clear"
								})}
							</a>
							<button
								type="submit"
								className="mg-button mg-button--small mg-button-primary"
							>
								{ctx.t({
									"code": "common.apply_filters",
									"msg": "Apply filters"
								})}
							</button>
						</div>
					</div> 

					{/* Hidden search field to maintain compatibility */}
					{search && <input type="hidden" name="search" value={search} />}
				</div >
			</Form >
		</>
	);
}
