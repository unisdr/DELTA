import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { DataScreen } from "~/frontend/data_screen";
import { ActionLinks } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { formatDateDisplay } from "~/util/date";
import { EventCounter } from "~/components/EventCounter";
import { DisasterEventsFilter } from "~/frontend/components/list-page-disasterevents-filters";
import { ViewContext } from "../context";

import { LangLink } from "~/util/link";

interface ListViewProps {
	ctx: ViewContext;
	titleOverride?: string
	hideMainLinks?: boolean
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(props: ListViewProps) {
	const ld = useLoaderData<Awaited<ReturnType<typeof disasterEventsLoader>>>()
	const ctx = new ViewContext(ld);

	const { filters } = ld
	const { items, pagination } = ld.data;
	const rootData = useRouteLoaderData("root") as any; // Get user data from root loader

	// Get user data with role from root loader
	const user = {
		...rootData?.user,
		role: rootData?.userRole || rootData?.user?.role // Use userRole from root data if available
	};

	return DataScreen({
		ctx: props.ctx,
		hideMainLinks: props.hideMainLinks,
		isPublic: ld.isPublic,
		plural: props.titleOverride ?? "Disaster events",
		resourceName: "event",
		baseRoute: route,
		columns: ld.isPublic ? [
			"Disaster Event Name",
			"Disaster Event UUID",
			"Records Affiliated",
			"Created",
			"Updated",
		] : [
			"Disaster Event Name",
			"Record Status",
			"Disaster Event UUID",
			"Records Affiliated",
			"Created",
			"Updated",
			"Actions",
		],
		listName: "disaster events",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,
		beforeListElement: <>
			<DisasterEventsFilter
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
					<EventCounter filteredEvents={items.length} totalEvents={pagination.totalItems} description="disaster events" />
				</div>
			</section>
		</>,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>{item.nameNational.length == 0 ? item.nameGlobalOrRegional : item.nameNational}</td>
				{!ld.isPublic && (
					<td>
						<span
							title={`${item.approvalStatus}`}
							className={`dts-status dts-status--${item.approvalStatus}`}
						></span>
						{` ${item.approvalStatus}`}
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
					{ item.recordCount > 0 ?
						<LangLink
						lang={ctx.lang}
						to={`/disaster-record?disasterEventUUID=${item.id}`}
						>
							{ item.recordCount }
						</LangLink>
						:
						( item.recordCount )
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
