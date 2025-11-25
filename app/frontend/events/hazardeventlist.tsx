import { useEffect, useRef } from "react";
import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { Pagination } from "~/frontend/pagination/view";
import { HazardousEventFilters } from "~/frontend/events/hazardevent-filters";
import { HazardousEventDeleteButton } from "~/frontend/components/delete-dialog";
import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";
import { formatDateDisplay } from "~/util/date";
import { route } from "~/frontend/events/hazardeventform";
import { ViewContext } from "../context";
import { LangLink } from "~/util/link";
import { Tooltip } from 'primereact/tooltip';
import { ListLegend } from '~/components/ListLegend';

// Permission check functions will be defined below

function roleHasPermission(role: any, permission: string): boolean {
	// Basic role check - can be enhanced later
	return role && role.permissions?.includes(permission);
}

/**
 * Specialized ActionLinks component for hazardous events that uses the
 * HazardousEventDeleteButton with the required confirmation dialog
 */
function HazardousEventActionLinks(props: {
	ctx: ViewContext;
	route: string;
	id: string | number;
	hideViewButton?: boolean;
	hideEditButton?: boolean;
	hideDeleteButton?: boolean;
}) {
	const ctx = props.ctx
	return (
		<>
			{!props.hideEditButton && (
				<LangLink lang={ctx.lang} to={`${props.route}/edit/${props.id}`}>
					<button
						type="button"
						className="mg-button mg-button-table"
						aria-label={ctx.t({
							"code": "record.edit",
							"desc": "Label for edit action",
							"msg": "Edit"
						})}
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/edit.svg#edit" />
						</svg>
					</button>
				</LangLink>
			)}
			{!props.hideViewButton && (
				<LangLink lang={ctx.lang} to={`${props.route}/${props.id}`}>
					<button
						type="button"
						className="mg-button mg-button-table"
						aria-label={ctx.t({
							"code": "record.view",
							"desc": "Label for view action",
							"msg": "View"
						})}
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/eye-show-password.svg#eye-show" />
						</svg>
					</button>
				</LangLink>
			)}
			{!props.hideDeleteButton && (
				<HazardousEventDeleteButton
					ctx={ctx}
					action={ctx.url(`${props.route}/delete/${props.id}`)}
					useIcon
				/>
			)}
		</>
	);
}

interface ListViewArgs {
	ctx: ViewContext;
	isPublic: boolean;
	basePath: string;
	linksNewTab?: boolean;
	actions?: (item: any) => React.ReactNode;
}

/**
 * Helper function to get the appropriate hazard name based on hierarchy
 * Shows specific hazard if available, otherwise cluster, otherwise type
 */
function getHazardDisplayName(item: any): string {
	if (item.hipHazard?.nameEn) {
		return item.hipHazard.nameEn;
	} else if (item.hipCluster?.nameEn) {
		return item.hipCluster.nameEn;
	} else if (item.hipType?.nameEn) {
		return item.hipType?.nameEn || "";
	}
	return "";
}

/**
 * Determines if a user can edit a hazardous event
 * Based on business rules:
 * - Data-viewers cannot edit any records
 * - Data collectors can edit their own records when status is Draft or Waiting for validation
 * - Data validators/Admins can edit their own created records under same statuses
 */
function canEdit(item: any, user: any): boolean {
	if (!user) return false;

	// Data-viewers cannot edit any records
	if (user.role === "data-viewer") return false;

	// Admin users should always be able to edit draft and waiting for validation records
	if (user.role === "admin" || user.role === "super_admin") {
		// Check record status - only Draft or Waiting for validation can be edited
		const editableStatuses = ["draft", "waiting-for-validation"];
		return editableStatuses.includes(item.approvalStatus.toLowerCase());
	}

	// For non-admin users
	// Check if user has edit permission
	const hasEditPermission = roleHasPermission(user.role, "EditData");
	if (!hasEditPermission) return false;

	// Check record status - only Draft or Waiting for validation can be edited
	const editableStatuses = ["draft", "waiting-for-validation"];
	if (!editableStatuses.includes(item.approvalStatus.toLowerCase()))
		return false;

	// Check if user created the record (simplified check - would need actual user ID comparison)
	// This is a placeholder - actual implementation would need to check item.createdBy against user.id
	return true;
}

/**
 * Determines if a user can delete a hazardous event
 * Based on business rules:
 * - Data-viewers cannot delete any records
 * - Only Data validators/Admins who are assigned to validate or have already validated a record can delete
 * - Records that are Published or Validated by someone else cannot be deleted
 */
function canDelete(item: any, user: any): boolean {
	if (!user) return false;

	// Data-viewers cannot delete any records
	if (user.role === "data-viewer") return false;

	// Admin users should be able to delete non-published records
	if (user.role === "admin" || user.role === "super_admin") {
		// Published records cannot be deleted
		return item.approvalStatus.toLowerCase() !== "published";
	}

	// For non-admin users
	// Check if user has delete permission
	const hasDeletePermission = roleHasPermission(
		user.role,
		"DeleteValidatedData"
	);
	if (!hasDeletePermission) return false;

	// Published records cannot be deleted
	if (item.approvalStatus.toLowerCase() === "published") return false;

	// Check if user is assigned to validate or has validated the record
	// This is a placeholder - actual implementation would need to check validation assignments
	return true;
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof hazardousEventsLoader>>>();
	const ctx = args.ctx;

	const rootData = useRouteLoaderData("root") as any; // Get user data from root loader

	// Get user data with role from root loader
	const user = {
		...rootData?.user,
		role: rootData?.userRole || rootData?.user?.role, // Use userRole from root data if available
	};

	const { hip, filters } = ld;
	const { items } = ld.data;

	const pagination = Pagination({
		ctx,
		...ld.data.pagination
	});

	// Store the total count in a ref that persists across renders
	const totalCountRef = useRef(ld.data.pagination.totalItems);

	// Check if this is an unfiltered view
	const isUnfiltered =
		!filters.hipHazardId &&
		!filters.hipClusterId &&
		!filters.hipTypeId &&
		!filters.search;

	// Use effect to update the ref when we see an unfiltered view with a higher count
	useEffect(() => {
		if (isUnfiltered && ld.data.pagination.totalItems > totalCountRef.current) {
			totalCountRef.current = ld.data.pagination.totalItems;
		}
	}, [isUnfiltered, ld.data.pagination.totalItems]);

	// Refs for the status elements
	const statusRefs = useRef(new Map<number, HTMLElement>());

	return (
		<div>
			{/* Enhanced filters component with all required filter options */}
			<HazardousEventFilters
				ctx={ctx}
				hipHazardId={filters.hipHazardId}
				hipClusterId={filters.hipClusterId}
				hipTypeId={filters.hipTypeId}
				fromDate={filters.fromDate}
				toDate={filters.toDate}
				recordingOrganization={filters.recordingOrganization}
				hazardousEventStatus={filters.hazardousEventStatus}
				recordStatus={filters.recordStatus}
				viewMyRecords={filters.viewMyRecords}
				pendingMyAction={filters.pendingMyAction}
				search={filters.search}
				hip={hip}
				organizations={ld.organizations || []}
				clearFiltersUrl={args.basePath}
			/>

			<section className="dts-page-section">
				{!args.isPublic && (
					<>
						<div className="dts-heading-4">
							{totalCountRef.current > 0 && (
								<div className="">
									<p>
										{ctx.t({
											"code": "hazardous_events.showing_filtered_of_total",
											"desc": "Shows how many hazardous events are displayed. {filtered} is the number of matching events, {total} is the total number of events.",
											"msg": "Showing {filtered} of {total} hazardous event(s)"
										}, {
											"filtered": items.length !== undefined ? items.length : totalCountRef.current,
											"total": totalCountRef.current
										})}
									</p>
								</div>
							)}
						</div>

						<ListLegend ctx={ ctx } />
					</>
				)
				}

				{
					ld.data.pagination.totalItems ? (
						<>
							<Tooltip target=".custom-target-icon" pt={{
								root: { style: { marginTop: '-10px' } }
							}} />
							<table className="dts-table width-override-data-collection">
								<thead>
									<tr>
										<th>
											{ctx.t({
												"code": "hip.hazard_type",
												"desc": "Label for hazard type",
												"msg": "Hazard type"
											})}
										</th>
										{!args.isPublic && (
											<th>
												{ctx.t({
													"code": "record.status_label",
													"desc": "Label for record status column in table",
													"msg": "Record Status"
												})}
											</th>
										)}
										<th>
											{ctx.t({
												"code": "hazardous_event.uuid",
												"desc": "Label for the UUID of a hazardous event",
												"msg": "Hazardous Event UUID"
											})}
										</th>
										<th>
											{ctx.t({
												"code": "record.created",
												"desc": "Label for the creation date of a record",
												"msg": "Created"
											})}
										</th>
										<th>
											{ctx.t({
												"code": "record.updated",
												"desc": "Label for the last updated date of a record",
												"msg": "Updated"
											})}
										</th>
										{!args.isPublic && (
											<th className="dts-table__cell-centered">
												{ctx.t({
													"code": "record.table.actions",
													"desc": "Label for the actions column in record tables",
													"msg": "Actions"
												})}
											</th>
										)}

									</tr>
								</thead>
								<tbody>
									{items.map((item, index) => (
										<tr key={index}>
											<td>{getHazardDisplayName(item)}</td>
											{!args.isPublic && (
												<td>
													<span
														ref={(el) => statusRefs.current.set(index, el!)}
														className={`dts-status dts-status--${item.approvalStatus.toLowerCase()} custom-target-icon`}
														data-pr-tooltip={item.approvalStatus}
														data-pr-position="top"
													></span>
													{` ${item.approvalStatus}`}
												</td>
											)}
											<td>
												<LangLink
													lang={ctx.lang}
													to={`/hazardous-event/${item.id}`}
													target={args.linksNewTab ? "_blank" : undefined}
												>
													{item.id.slice(0, 5)}
												</LangLink>
											</td>
											<td>{formatDateDisplay(item.createdAt, "dd-MM-yyyy")}</td>
											<td>{formatDateDisplay(item.updatedAt, "dd-MM-yyyy")}</td>
											{!args.isPublic && (
												<td className="dts-table__actions">
													{args.actions ? (
														args.actions(item)
													) : (
														<HazardousEventActionLinks
															ctx={ctx}
															route={route}
															id={item.id}
															hideEditButton={!canEdit(item, user)}
															hideDeleteButton={!canDelete(item, user)}
														/>
													)}
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
							{pagination}
						</>
					) : (
						<>{ctx.t({
							"code": "record.none_found",
							"desc": "Message displayed when no records are found",
							"msg": "No records found"
						})}</>
					)
				}
			</section >
		</div >
	);
}
