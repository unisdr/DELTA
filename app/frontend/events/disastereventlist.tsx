import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { DataScreen } from "~/frontend/data_screen";
import { ActionLinks } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { formatDateDisplay } from "~/util/date";
import { DisasterEventsFilter } from "~/frontend/components/list-page-disasterevents-filters";
import { ViewContext } from "../context";
import { LangLink } from "~/util/link";
import { Tooltip } from 'primereact/tooltip';
import { approvalStatusKeyToLabel } from "../approval";

interface ListViewProps {
	ctx: ViewContext;
	titleOverride?: string
	hideMainLinks?: boolean
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(props: ListViewProps) {
	const ld = useLoaderData<Awaited<ReturnType<typeof disasterEventsLoader>>>()
	const ctx = new ViewContext();

	const { filters } = ld
	const { items, pagination } = ld.data;
	const rootData = useRouteLoaderData("root") as any; // Get user data from root loader

	// Get user data with role from root loader
	const user = {
		...rootData?.user,
		role: rootData?.userRole || rootData?.user?.role // Use userRole from root data if available
	};

	const columns = [
		ctx.t({
			"code": "disaster_event.name",
			"msg": "Disaster event name"
		}),
		...(!ld.isPublic
			? [
				ctx.t({
					"code": "record.status",
					"msg": "Record status"
				})
			]
			: []),
		ctx.t({
			"code": "disaster_event.uuid",
			"msg": "Disaster event UUID"
		}),
		ctx.t({
			"code": "disaster_event.records_affiliated",
			"msg": "Records affiliated"
		}),
		ctx.t({
			"code": "common.created",
			"desc": "Label for creation date",
			"msg": "Created"
		}),
		ctx.t({
			"code": "common.updated",
			"desc": "Label for last update date",
			"msg": "Updated"
		}),
		...(!ld.isPublic
			? [
				ctx.t({
					"code": "common.actions",
					"desc": "Label for action links/buttons",
					"msg": "Actions"
				})
			]
			: []),
	];

	return DataScreen({
		ctx: props.ctx,
		hideMainLinks: props.hideMainLinks,
		isPublic: ld.isPublic,
		title: props.titleOverride ?? ctx.t({
			"code": "disaster_events",
			"msg": "Disaster events"
		}),
		baseRoute: route,
		columns: columns,
		listName: "disaster events",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,

		countHeader: ctx.t({
			"code": "disaster_event.count_header",
			"desc": "Header text showing total number of disaster events and instance name. {total} is the number of events, {instance_name} is the name of the current instance.",
			"msg": "{total} disaster events in {instance_name}"
		}, {
			total: pagination.totalItems,
			instance_name: ld.instanceName
		}),
		addNewLabel: ctx.t({
			"code": "event.add_new",
			"msg": "Add new event"
		}),

		beforeListElement: <>
			<DisasterEventsFilter
				ctx={ctx}
				clearFiltersUrl={ctx.url(route)}
				sectors={[]}
				disasterEventName={filters.disasterEventName}
				recordingInstitution={filters.recordingInstitution}
				fromDate={filters.fromDate}
				toDate={filters.toDate}
				recordStatus={filters.recordStatus}
			/>

			<section className="dts-page-section">
				<div className="dts-heading-4">
					{pagination.totalItems > 0 && (
						<div>
							<p>
								{ctx.t({
									"code": "disaster_events.showing_filtered_of_total",
									"desc": "Shows how many disaster events are displayed. {filtered} is the number of matching events, {total} is the total number of events.",
									"msg": "Showing {filtered} of {total} disaster event(s)"
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
		</>,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>{item.nameNational.length == 0 ? item.nameGlobalOrRegional : item.nameNational}</td>
				{!ld.isPublic && (
					<td>
						<span
							className={`dts-status dts-status--${item.approvalStatus} custom-target-icon`}
							data-pr-tooltip={item.approvalStatus}
							data-pr-position="top"
						></span>
						{} {approvalStatusKeyToLabel(ctx, item.approvalStatus)}
					</td>
				)}
				<td>
					<LangLink
						lang={ctx.lang}
						to={`${route}/${item.id}`}
						target={props.linksNewTab ? "_blank" : undefined}
					>
						{item.id.slice(0, 5)}
					</LangLink>
				</td>

				<td>
					{item.recordCount > 0 ?
						<LangLink
							lang={ctx.lang}
							to={`/disaster-record?disasterEventUUID=${item.id}`}
						>
							{item.recordCount}
						</LangLink>
						:
						(item.recordCount)
					}
				</td>
				<td>{formatDateDisplay(item.createdAt, "dd-MM-yyyy")}</td>
				<td>{formatDateDisplay(item.updatedAt, "dd-MM-yyyy")}</td>

				<td className="dts-table__actions">
					{props.actions ?
						props.actions(item) :
						(ld.isPublic ? null : <ActionLinks
							ctx={props.ctx}
							deleteTitle="Are you sure you want to delete this event?"
							deleteMessage="This data cannot be recovered after being deleted."
							confirmDeleteLabel="Delete permanently"
							cancelDeleteLabel="Do not delete"
							route={route} id={item.id}
							user={user}
							approvalStatus={item.approvalStatus}
						/>)
					}
				</td>
			</tr>
		),
	});

}
