import { sectorDisasterRecordsRelationTable } from "~/drizzle/schema/sectorDisasterRecordsRelationTable";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";

import { authLoaderIsPublic } from "~/utils/auth";

import { dr } from "~/db.server";

import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";

import { and, eq, desc, sql, ilike, or } from "drizzle-orm";

import { LoaderFunctionArgs } from "react-router";
import { approvalStatusIds } from "~/frontend/approval";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
	getUserIdFromSession,
	getUserRoleFromSession,
} from "~/utils/session";
import { getSectorByLevel } from "~/db/queries/sector";

import { BackendContext } from "../context";
import { entityValidationAssignmentTable } from "~/drizzle/schema/entityValidationAssignmentTable";

interface disasterRecordLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function disasterRecordLoader(args: disasterRecordLoaderArgs) {
	const { loaderArgs } = args;
	const ctx = new BackendContext(loaderArgs);
	const { request } = loaderArgs;
	const userId = (await getUserIdFromSession(request)) as string;
	const userRole = await getUserRoleFromSession(request);
	const url = new URL(request.url);
	const extraParams = [
		"disasterEventUUID",
		"disasterRecordUUID",
		"recordStatus",
		"viewMyRecords",
		"pendingMyAction",
	];
	const filters: {
		approvalStatus?: approvalStatusIds;
		disasterEventUUID?: string;
		disasterEventName: string;
		disasterRecordUUID: string;
		recordStatus: string;
		fromDate: string;
		toDate: string;
		sectorId: string;
		subSectorId: string;
		viewMyRecords?: boolean;
		pendingMyAction?: boolean;
		userId?: string; // For user-specific filters
	} = {
		approvalStatus: "published",
		disasterEventUUID: url.searchParams.get("disasterEventUUID") || "",
		disasterEventName: url.searchParams.get("disasterEventName") || "",
		disasterRecordUUID: url.searchParams.get("disasterRecordUUID") || "",
		recordStatus: url.searchParams.get("recordStatus") || "",
		fromDate: url.searchParams.get("fromDate") || "",
		toDate: url.searchParams.get("toDate") || "",
		sectorId: url.searchParams.get("sectorId") || "",
		subSectorId: url.searchParams.get("subSectorId") || "",
		viewMyRecords: url.searchParams.get("viewMyRecords") === "on",
		pendingMyAction: url.searchParams.get("pendingMyAction") === "on",
	};
	const isPublic = authLoaderIsPublic(loaderArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "DELTA Resilience";
	if (countryAccountsId) {
		const settigns = await getCountrySettingsFromSession(request);
		instanceName = settigns.websiteName;
	}

	const sectors = await getSectorByLevel(ctx, 2);

	if (!isPublic) {
		filters.approvalStatus = undefined;
	}

	filters.userId = userId;

	filters.disasterEventName = filters.disasterEventName.trim();

	let searchDisasterEventName = "%" + filters.disasterEventName + "%";
	let searchDisasterRecordUIID = "%" + filters.disasterRecordUUID + "%";
	let searchRecordStatus = "%" + filters.recordStatus + "%";

	// build base condition
	let baseCondition = and(
		countryAccountsId
			? eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			: undefined,
		filters.approvalStatus
			? eq(disasterRecordsTable.approvalStatus, filters.approvalStatus)
			: undefined,
		filters.disasterEventUUID
			? eq(disasterRecordsTable.disasterEventId, filters.disasterEventUUID)
			: undefined,
		filters.disasterRecordUUID !== ""
			? sql`${disasterRecordsTable.id}::text ILIKE ${searchDisasterRecordUIID}`
			: undefined,
		filters.recordStatus !== ""
			? sql`${disasterRecordsTable.approvalStatus}::text ILIKE ${searchRecordStatus}`
			: undefined,

		// User-specific filters - Note: These fields may need to be added to schema
		// For now, commenting out until proper user tracking fields are available
		filters.viewMyRecords && filters.userId
			? or(
					eq(disasterRecordsTable.createdByUserId, filters.userId),
					eq(disasterRecordsTable.validatedByUserId, filters.userId),
					eq(disasterRecordsTable.publishedByUserId, filters.userId),
				)
			: undefined,

		// Pending action filter - simplified for now
		filters.pendingMyAction && filters.userId
			? or(
					and(
						eq(disasterRecordsTable.approvalStatus, "needs-revision"),
						eq(disasterRecordsTable.submittedByUserId, filters.userId),
					),
					and(
						eq(disasterRecordsTable.approvalStatus, "waiting-for-validation"),
						sql`EXISTS (
						SELECT 1 FROM ${entityValidationAssignmentTable}
						WHERE (
							entity_validation_assignment.entity_Id = ${disasterRecordsTable.id}
							AND entity_validation_assignment.entity_type = 'disaster_records'
							AND entity_validation_assignment.assigned_to_user_id = ${filters.userId}
						)
					)`,
					),
				)
			: undefined,

		filters.fromDate
			? and(
					sql`${disasterRecordsTable.startDate} != ''`,
					sql`
					CASE
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY') >= TO_DATE(${filters.fromDate}, 'YYYY')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM') >= TO_DATE(${filters.fromDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM') >= TO_DATE(${filters.fromDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD') >= TO_DATE(${filters.fromDate}, 'YYYY-MM-DD')
					ELSE 
						${disasterRecordsTable.startDate} >= ${filters.fromDate}
					END
				`,
				)
			: undefined,
		filters.toDate
			? and(
					sql`${disasterRecordsTable.endDate} != ''`,
					sql`
					CASE
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY') <= TO_DATE(${filters.toDate}, 'YYYY')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM') <= TO_DATE(${filters.toDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM') <= TO_DATE(${filters.toDate}, 'YYYY-MM')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{1}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{1}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
						WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD') <= TO_DATE(${filters.toDate}, 'YYYY-MM-DD')
					ELSE 
						${disasterRecordsTable.endDate} <= ${filters.toDate}
					END
				`,
				)
			: undefined,
		filters.subSectorId
			? sql`${sectorDisasterRecordsRelationTable.sectorId} = ANY(
    			ARRAY[${filters.subSectorId}]::uuid[]
				||
				(
				SELECT ARRAY(
					SELECT (elem->>'id')::uuid
					FROM jsonb_array_elements(dts_get_sector_descendants(${ctx.lang}, ${filters.subSectorId})::jsonb) AS elem
				)
				)
  			)`
			: filters.sectorId
				? sql`${sectorDisasterRecordsRelationTable.sectorId} = ANY(
    			ARRAY[${filters.sectorId}]::uuid[]
				||
				(
				SELECT ARRAY(
					SELECT (elem->>'id')::uuid
					FROM jsonb_array_elements(dts_get_sector_descendants(${ctx.lang}, ${filters.sectorId})::jsonb) AS elem
				)
				)
  			)`
				: undefined,
	);

	// in case of data viewer role, force the filter on approvalStatus to validated and published
	if (userRole === 'data-viewer') {
		baseCondition = and(baseCondition, or(
			eq(disasterRecordsTable.approvalStatus, "validated"),
			eq(disasterRecordsTable.approvalStatus, "published")
		));
	}

	// count and select must now join the disasterEventTable
	const countResult = await dr
		.select({ count: sql<number>`COUNT(DISTINCT ${disasterRecordsTable.id})` })
		.from(disasterRecordsTable)
		.leftJoin(
			disasterEventTable,
			eq(disasterRecordsTable.disasterEventId, disasterEventTable.id),
		)
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(
				disasterRecordsTable.id,
				sectorDisasterRecordsRelationTable.disasterRecordId,
			),
		)
		.where(
			and(
				baseCondition,
				filters.disasterEventName !== ""
					? ilike(disasterEventTable.nameNational, searchDisasterEventName)
					: undefined,
			),
		);

	// extract numeric count
	const count = countResult[0]?.count ?? 0;

	// query with the same condition
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr
			.selectDistinct({
				id: disasterRecordsTable.id,
				disasterEventId: disasterRecordsTable.disasterEventId,
				approvalStatus: disasterRecordsTable.approvalStatus,
				startDate: disasterRecordsTable.startDate,
				endDate: disasterRecordsTable.endDate,
				createdAt: disasterRecordsTable.createdAt,
				updatedAt: disasterRecordsTable.updatedAt,
				nameNational: disasterEventTable.nameNational,
			})
			.from(disasterRecordsTable)
			.leftJoin(
				disasterEventTable,
				eq(disasterRecordsTable.disasterEventId, disasterEventTable.id),
			)
			.leftJoin(
				sectorDisasterRecordsRelationTable,
				eq(
					disasterRecordsTable.id,
					sectorDisasterRecordsRelationTable.disasterRecordId,
				),
			)
			.where(
				and(
					baseCondition,
					filters.disasterEventName !== ""
						? ilike(disasterEventTable.nameNational, searchDisasterEventName)
						: undefined,
				),
			)
			.orderBy(desc(disasterRecordsTable.updatedAt))
			.limit(offsetLimit.limit)
			.offset(offsetLimit.offset);
	};

	const res = await executeQueryForPagination3(
		request,
		count,
		events,
		extraParams,
	);

	return {
		isPublic,
		filters,
		data: res,
		instanceName,
		sectors,
	};
}
