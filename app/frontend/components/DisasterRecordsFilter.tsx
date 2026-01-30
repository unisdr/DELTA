import { useEffect, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import { getRecordStatusOptions } from '../events/hazardevent-filters';
import { Form, useFetcher, useSubmit } from '@remix-run/react';
import { ViewContext } from '../context';
import { Sector } from '~/db/queries/sector';

interface Props {
	ctx: ViewContext;
	clearFiltersUrl: string;
	formStartElement?: React.ReactNode;
	disasterEventName: string;
	disasterRecordUUID: string;
	fromDate: string;
	toDate: string;
	recordStatus: string;
	sectors: Sector[];
	sectorId: string;
	subSectorId: string;
}

interface FilterState {
	disasterEventName: string;
	disasterRecordUUID: string;
	fromDate: string;
	toDate: string;
	recordStatus: string;
	sectorId: string;
	subSectorId: string;
}

export function DisasterRecordsFilter(props: Props) {
	const {
		ctx,
		clearFiltersUrl,
		formStartElement,
		disasterEventName,
		disasterRecordUUID,
		fromDate,
		toDate,
		recordStatus,
		sectorId,
		sectors,
		subSectorId,
	} = props;

	const toast = useRef<Toast>(null);
	const submit = useSubmit();
	const fetcher = useFetcher<{ subSectors: Sector[] }>();

	const [filters, setFilters] = useState<FilterState>({
		disasterEventName,
		disasterRecordUUID,
		fromDate,
		toDate,
		recordStatus,
		sectorId,
		subSectorId,
	});

	const [subSectors, setSubSectors] = useState<Sector[]>([]);

	// Update state when props change (after loader runs)
	useEffect(() => {
		setFilters({
			disasterEventName,
			disasterRecordUUID,
			fromDate,
			toDate,
			recordStatus,
			sectorId,
			subSectorId,
		});
	}, [
		disasterEventName,
		disasterRecordUUID,
		fromDate,
		toDate,
		recordStatus,
		sectorId,
		subSectorId,
	]);

	const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedSectorId = e.target.value;

		setFilters({
			...filters,
			sectorId: selectedSectorId,
			subSectorId: '',
		});

		if (!selectedSectorId) {
			setSubSectors([]);
			return;
		}

		console.log('handleSectorChange called');
		fetcher.load(ctx.url(`/api/subsectors?sectorId=${selectedSectorId}`));
	};

	useEffect(() => {
		if (fetcher.data?.subSectors) {
			setSubSectors(fetcher.data.subSectors);
		}
	}, [fetcher.data]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const { fromDate, toDate } = filters;

		if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
			toast.current?.show({
				severity: 'error',
				summary: ctx.t({
					"code": "common.invalid_date_range",
					"msg": "Invalid date range"
				}),
				detail: ctx.t({
					"code": "common.to_date_before_from_date",
					"desc": "Detail message explaining that 'To' date cannot be earlier than 'From' date",
					"msg": "'To' date cannot be earlier than 'From' date."
				}),
				life: 4000,
			});
			return;
		}

		submit(e.currentTarget, { method: 'get' });
	};

	const handleClear = () => {
		const cleared: FilterState = {
			disasterEventName: '',
			disasterRecordUUID: '',
			fromDate: '',
			toDate: '',
			recordStatus: '',
			sectorId: '',
			subSectorId: '',
		};
		setFilters(cleared);
		submit(new FormData(), { method: 'get', action: clearFiltersUrl });
	};

	useEffect(() => {}, [subSectors, filters.sectorId]);

	return (
		<Form onSubmit={handleSubmit} className="dts-form">
			<Toast ref={toast} />
			{formStartElement}

			<div className="mg-grid mg-grid__col-3">
				{/* Disaster event name */}
				<div className="dts-form-component mg-grid__col--span-2">
					<label>
						<div className="dts-form-component__label">
							{ctx.t({
								"code": "disaster_event.name",
								"msg": "Disaster event name"
							})}
						</div>

						<input
							name="disasterEventName"
							type="text"
							placeholder={ctx.t({
								"code": "disaster_event.all_disaster_events",
								"msg": "All disaster events"
							})}
							value={filters.disasterEventName}
							onChange={(e) => setFilters({ ...filters, disasterEventName: e.target.value })}
						/>
					</label>
				</div>

				{/* Disaster record */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
							{ctx.t({
								"code": "disaster_event.disaster_record",
								"msg": "Disaster record"
							})}
						</div>
						<input
							name="disasterRecordUUID"
							type="text"
							placeholder={ctx.t({
								"code": "common.search_uuid",
								"desc": "Placeholder for search by UUID input (UUID is specific ID type)",
								"msg": "Search for UUID"
							})}
							value={filters.disasterRecordUUID}
							onChange={(e) => setFilters({ ...filters, disasterRecordUUID: e.target.value })}
						/>
					</label>
				</div>

				{/* From date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
							{ctx.t({
								"code": "common.from_date",
								"desc": "From date",
								"msg": "From"
							})}
						</div>
						<input
							name="fromDate"
							type="date"
							placeholder={ctx.t({
								"code": "common.select_date",
								"desc": "Select date",
								"msg": "Select date"
							})}
							value={filters.fromDate}
							onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
						/>
					</label>
				</div>

				{/* To date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
							{ctx.t({
								"code": "common.to",
								"desc": "To date",
								"msg": "To"
							})}
						</div>
						<input
							name="toDate"
							type="date"
							placeholder={ctx.t({
								"code": "common.select_date",
								"desc": "Select date",
								"msg": "Select date"
							})}
							value={filters.toDate}
							onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
						/>
					</label>
				</div>

				<div className="dts-form-component">
					<div className="dts-form-component__label">
						{ctx.t({
							"code": "record.status",
							"msg": "Record status"
						})}
					</div>
					<label>
						<select
							id="recordStatus"
							name="recordStatus"
							value={filters.recordStatus}
							onChange={(e) => setFilters({ ...filters, recordStatus: e.target.value })}
						>
							<option value="">
								{ctx.t({
									"code": "record.select_status",
									"msg": "Select record status"
								})}
							</option>
							{getRecordStatusOptions(ctx).map((recordStatus) => (
								<option key={recordStatus.value} value={recordStatus.value}>
									{recordStatus.label}
								</option>
							))}
						</select>
					</label>
				</div>

				<div className="dts-form-component">
					<div className="dts-form-component__label">
						{ctx.t({
							"code": "sector",
							"msg": "Sector"
						})}
					</div>
					<label>
						<select
							id="sectorId"
							name="sectorId"
							value={filters.sectorId}
							onChange={handleSectorChange}
						>
							<option value="">
								{ctx.t({
									"code": "sectors.all",
									"msg": "All sectors"
								})}
							</option>

							{sectors.map((sector) => (
								<option key={sector.id} value={sector.id}>
									{sector.name}
								</option>
							))}
						</select>
					</label>
				</div>
				<div className="dts-form-component">
					<div className="dts-form-component__label">
						{ctx.t({
							"code": "sectors.sub_sector",
							"msg": "Sub-sector"
						})}
					</div>
					<label>
						<select
							id="subSectorId"
							name="subSectorId"
							value={filters.subSectorId}
							onChange={(e) => setFilters({ ...filters, subSectorId: e.target.value })}
							disabled={!filters.sectorId || subSectors.length === 0}
						>
							<option value="">
								{ctx.t({
									"code": "sectors.select_sub_sector",
									"msg": "Select sub sector"
								})}
							</option>
							{subSectors.map((subSector) => (
								<option key={subSector.id} value={subSector.id}>
									{subSector.name}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>

			{/* Buttons */}
			<div className="dts-form__actions">
				<input
					type="submit"
					value={ctx.t({
						"code": "common.apply_filters",
						"msg": "Apply filters"
					})}
					className="mg-button mg-button-primary"
				/>
				<button type="button" onClick={handleClear} className="mg-button mg-button-outline">
					{ctx.t({
						"code": "common.clear",
						"msg": "Clear"
					})}
				</button>
			</div>
		</Form>
	);
}
