import { useLoaderData, useRouteLoaderData } from "react-router";
import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { DataScreen } from "~/frontend/data_screen";
import { ActionLinks } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { Tooltip } from "primereact/tooltip";
import { DisasterEventsFilter } from "~/frontend/components/list-page-disasterevents-filters";
import { formatDateDisplay } from "~/utils/date";
import { LangLink } from "~/utils/link";
import { approvalStatusKeyToLabel } from "../approval";

interface ListViewProps {
	ctx?: any;
	titleOverride?: string;
	hideMainLinks?: boolean;
	linksNewTab?: boolean;
	actions?: (item: any) => React.ReactNode;
}

export function ListView(props: ListViewProps) {
	const ld = useLoaderData<Awaited<ReturnType<typeof disasterEventsLoader>>>();
	const ctx = props.ctx || { t: (message: { msg: string }) => message.msg, lang: "en", url: (path: string) => path, user: undefined };

	const { filters } = ld;
	const { items, pagination } = ld.data;
	const rootData = useRouteLoaderData("root") as any; // Get user data from root loader

	// Get user data with role from root loader
	const user = {
		...rootData?.user,
		role: rootData?.userRole || rootData?.user?.role, // Use userRole from root data if available
	};

	const columns = [
		"Disaster event name",
		...(!ld.isPublic
			? [
				"Record status",
			]
			: []),
		"Disaster event UUID",
		"Records affiliated",
		"Created",
		"Updated",
		...(!ld.isPublic
			? [
				"Actions",
			]
			: []),
	];

	return DataScreen({
		hideMainLinks: props.hideMainLinks,
		isPublic: ld.isPublic,
		title:
			props.titleOverride ??
			"Disaster events",
		baseRoute: route,
		columns: columns,
		listName: "disaster events",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,

		countHeader: "{total} disaster events in {instance_name}",
		addNewLabel: "Add new event",

		beforeListElement: (
			<>
				<DisasterEventsFilter
					clearFiltersUrl={('/' + String(route).replace(/^\/+/, ''))}
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
									{"Showing {filtered} of {total} disaster event(s)"}
								</p>
							</div>
						)}
					</div>
				</section>

				<Tooltip
					target=".custom-target-icon"
					pt={{
						root: { style: { marginTop: "-10px" } },
					}}
				/>
			</>
		),
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					{item.nameNational.length == 0
						? item.nameGlobalOrRegional
						: item.nameNational}
				</td>
				{!ld.isPublic && (
					<td>
						<span
							className={`dts-status dts-status--${item.approvalStatus} custom-target-icon`}
							data-pr-tooltip={item.approvalStatus}
							data-pr-position="top"
						></span>
						{ } {approvalStatusKeyToLabel(item.approvalStatus)}
					</td>
				)}
				<td>
					<LangLink
						lang={'en'}
						to={`${route}/${item.id}`}
						target={props.linksNewTab ? "_blank" : undefined}
					>
						{item.id.slice(0, 5)}
					</LangLink>
				</td>

				<td>
					{item.recordCount > 0 ? (
						<LangLink
							lang={'en'}
							to={`/disaster-record?disasterEventUUID=${item.id}`}
						>
							{item.recordCount}
						</LangLink>
					) : (
						item.recordCount
					)}
				</td>
				<td>{formatDateDisplay(item.createdAt, "dd-MM-yyyy")}</td>
				<td>{formatDateDisplay(item.updatedAt, "dd-MM-yyyy")}</td>

				<td className="dts-table__actions">
					{props.actions ? (
						props.actions(item)
					) : ld.isPublic ? null : (
						<ActionLinks
							deleteTitle="Are you sure you want to delete this event?"
							deleteMessage="This data cannot be recovered after being deleted."
							confirmDeleteLabel="Delete permanently"
							cancelDeleteLabel="Do not delete"
							route={route}
							id={item.id}
							user={user}
							approvalStatus={item.approvalStatus}
						/>
					)}
				</td>
			</tr>
		),
	});
}

