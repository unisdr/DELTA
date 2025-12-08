import { disasterRecordLoader } from '~/backend.server/handlers/disaster_record';

import { DataScreen } from '~/frontend/data_screen';
import { ActionLinks } from '~/frontend/form';

import { useLoaderData, MetaFunction } from '@remix-run/react';

import { authLoaderPublicOrWithPerm } from '~/util/auth';

import { route } from '~/frontend/disaster-record/form';
import { format } from 'date-fns';
import { DisasterRecordsFilter } from '~/frontend/components/DisasterRecordsFilter';
import { getUserFromSession, getUserRoleFromSession } from '~/util/session';
import { ViewContext } from '~/frontend/context';
import { LangLink } from "~/util/link";
import { Tooltip } from 'primereact/tooltip';

export const loader = authLoaderPublicOrWithPerm('ViewData', async (loaderArgs) => {
	const { request } = loaderArgs;
	const loggedInUser = await getUserFromSession(request);
	const userRole = await getUserRoleFromSession(request);

	const user = {
		id: loggedInUser?.user.id,
		role: userRole,
	};

	const data = await disasterRecordLoader({ loaderArgs });

	return {
		...data,
		user
	};
});

export const meta: MetaFunction = () => {
	return [
		{ title: 'Disaster Records - DELTA Resilience' },
		{ name: 'description', content: 'Disaster Records Repository.' },
	];
};

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	const { items, pagination } = ld.data;

	const columns = [
		ctx.t({
			"code": "common.related_disaster_event",
			"msg": "Related disaster event"
		}),
		...(!ld.isPublic
			? [
				ctx.t({
					"code": "record.status",
					"msg": "Record status"
				}),
				ctx.t({
					"code": "record.uuid",
					"desc": "Record UUID (UUID is specific type of ID)",
					"msg": "Record UUID"
				})
			]
			: []),
		...(ld.isPublic
			? [
				ctx.t({
					"code": "disaster_event",
					"msg": "Disaster event"
				})
			]
			: []),
		ctx.t({
			"code": "common.created",
			"desc": "Creation date",
			"msg": "Created"
		}),
		ctx.t({
			"code": "common.updated",
			"desc": "Last updated date",
			"msg": "Updated"
		}),
		...(!ld.isPublic
			? [
				ctx.t({
					"code": "common.actions",
					"msg": "Actions"
				})
			]
			: []),
	];

	return DataScreen({
		ctx,
		isPublic: ld.isPublic,
		plural: ctx.t({
			"code": "disaster_records",
			"msg": "Disaster records"
		}),
		countHeader: ctx.t({
			"code": "disaster_record.count_header",
			"desc": "Header text showing total number of disaster records and instance name. {total_items} is the number of records, {instance_name} is the name of the current instance.",
			"msg": "{total_items} disaster records in {instance_name}"
		}, {
			total_items: pagination.totalItems,
			instance_name: ld.instanceName
		}),
		addNewLabel: ctx.t({
			"code": "disaster_record.add",
			"msg": "Add new disaster record"
		}),

		resourceName: 'record',
		baseRoute: route,
		columns: columns,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,
		beforeListElement: (<>
			<DisasterRecordsFilter
				ctx={ctx}
				clearFiltersUrl={ctx.url(route)}
				disasterEventName={ld.filters.disasterEventName}
				disasterRecordUUID={ld.filters.disasterRecordUUID}
				fromDate={ld.filters.fromDate}
				toDate={ld.filters.toDate}
				recordStatus={ld.filters.recordStatus}
				sectors={ld.sectors}
				sectorId={ld.filters.sectorId}
				subSectorId={ld.filters.subSectorId}
			/>

			<section className="dts-page-section">
				<div className="dts-heading-4">
					{pagination.totalItems > 0 && (
						<div>
							<p>
								{ctx.t({
									"code": "disaster_records.showing_filtered_of_total",
									"desc": "Shows how many disaster events are displayed. {filtered} is the number of matching events, {total} is the total number of events.",
									"msg": "Showing {filtered} of {total} disaster record(s)"
								}, {
									"filtered": items.length !== undefined ? items.length : pagination.totalItems,
									"total": pagination.totalItems
								})}
							</p>
						</div>
					)}
				</div>
			</section>

			<Tooltip target=".custom-target-icon" pt={{
				root: { style: { marginTop: '-10px' } }
			}} />
		</>),
		listName: 'disaster records',
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>{item.nameNational && item.nameNational}</td>

				{!ld.isPublic && (
					<td>
						<span className={`dts-status dts-status--${item.approvalStatus} custom-target-icon`}
							data-pr-tooltip={item.approvalStatus}
							data-pr-position="top"
						></span>
						{} {item.approvalStatus}
					</td>
				)}
				<td>
					<LangLink lang={ctx.lang} to={`${route}/${item.id}`}>{item.id.slice(0, 5)}</LangLink>
				</td>
				<td>{format(new Date(item.createdAt), 'dd-MM-yyyy')}</td>
				<td>{item.updatedAt ? format(new Date(item.updatedAt), 'dd-MM-yyyy') : ''}</td>
				<td className="dts-table__actions">
					{ld.isPublic ? null : (
						<ActionLinks
							ctx={ctx}
							route={route}
							id={item.id}
							deleteMessage={ctx.t({
								"code": "record.no_recovery_after_delete_warning",
								"msg": "This data cannot be recovered after being deleted."
							})}
							deleteTitle={ctx.t({
								"code": "record.confirm_delete",
								"msg": "Are you sure you want to delete this record?" })}
							confirmDeleteLabel="Delete permanently"
							cancelDeleteLabel="Do not delete"
							user={ld.user}
							approvalStatus={item.approvalStatus}
						/>
					)}
				</td>
			</tr>
		),
	});
}
