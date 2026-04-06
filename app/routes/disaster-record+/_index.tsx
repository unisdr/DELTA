import { disasterRecordLoader } from "~/backend.server/handlers/disaster_record";

import { DataScreen } from "~/frontend/data_screen";
import { ActionLinks } from "~/frontend/form";

import { useRef, useEffect } from "react";
import { useLoaderData, MetaFunction } from "react-router";

import { authLoaderPublicOrWithPerm } from "~/utils/auth";

import { route } from "~/frontend/disaster-record/form";
import { format } from "date-fns";
import { DisasterRecordsFilter } from "~/frontend/components/DisasterRecordsFilter";
import { getUserFromSession, getUserRoleFromSession } from "~/utils/session";
import { LangLink } from "~/utils/link";
import { Tooltip } from "primereact/tooltip";
import { approvalStatusKeyToLabel } from "~/frontend/approval";
import { htmlTitle } from "~/utils/htmlmeta";

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
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
			user,
		};
	},
);

export const meta: MetaFunction = () => {
	return [
		{
			title: htmlTitle(
				"Disaster records",
			),
		},
		{
			name: "description",
			content: "Disaster records",
		},
	];
};

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const { items, pagination } = ld.data;

	const totalCountRef = useRef(pagination.totalItems);

	const isUnfiltered =
		!ld.filters.disasterEventName &&
		!ld.filters.disasterRecordUUID &&
		!ld.filters.fromDate &&
		!ld.filters.toDate &&
		!ld.filters.recordStatus &&
		!ld.filters.sectorId &&
		!ld.filters.subSectorId;

	useEffect(() => {
		if (isUnfiltered && pagination.totalItems > totalCountRef.current) {
			totalCountRef.current = pagination.totalItems;
		}
	}, [isUnfiltered, pagination.totalItems]);

	const columns = [
		"Related disaster event",
		...(!ld.isPublic
			? [
				"Record status",
				"Record UUID",
			]
			: []),
		...(ld.isPublic
			? [
				"Disaster event",
			]
			: []),
		"Created",
		"Updated",
		...(!ld.isPublic
			? [
				"Actions",
			]
			: []),
	];

	return DataScreen({
		isPublic: ld.isPublic,
		title: "Disaster records",
		countHeader: `${pagination.totalItems} disaster records in ${ld.instanceName}`,
		addNewLabel: "Add new disaster record",
		baseRoute: route,
		columns: columns,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,
		beforeListElement: (
			<>
				<DisasterRecordsFilter
					clearFiltersUrl={route}
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
						{totalCountRef.current > 0 && (
							<div>
								<p>
									{`Showing ${pagination.totalItems} of ${totalCountRef.current} disaster record(s)`}
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
		listName: "disaster records",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>{item.nameNational && item.nameNational}</td>

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
					<LangLink lang="en" to={`${route}/${item.id}`}>
						{item.id.slice(0, 5)}
					</LangLink>
				</td>
				<td>{format(new Date(item.createdAt), "dd-MM-yyyy")}</td>
				<td>
					{item.updatedAt ? format(new Date(item.updatedAt), "dd-MM-yyyy") : ""}
				</td>
				<td className="dts-table__actions">
					{ld.isPublic ? null : (
						<ActionLinks
							route={route}
							id={item.id}
							deleteMessage={"This data cannot be recovered after being deleted."}
							deleteTitle={"Are you sure you want to delete this record?"}
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
