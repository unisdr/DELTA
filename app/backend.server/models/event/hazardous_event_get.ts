import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { dr, Tx } from "~/db.server";
import { eq, and } from "drizzle-orm";
import type { BackendContext } from "../../context";
import { getHazardById, getClusterById, getTypeById } from "~/backend.server/models/hip";

export async function hazardousEventIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: hazardousEventTable.id,
		})
		.from(hazardousEventTable)
		.where(eq(hazardousEventTable.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}
export async function hazardousEventIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string,
) {
	const res = await tx
		.select({
			id: hazardousEventTable.id,
		})
		.from(hazardousEventTable)
		.where(
			and(
				eq(hazardousEventTable.apiImportId, importId),
				eq(hazardousEventTable.countryAccountsId, countryAccountsId),
			),
		);
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}

export type HazardousEventBasicInfoViewModel = Exclude<
	Awaited<ReturnType<typeof hazardousEventBasicInfoById>>,
	undefined
>;

export async function hazardousEventBasicInfoById(
	ctx: BackendContext,
	id: string,
	countryAccountsId?: string,
) {
	const whereClause = countryAccountsId
		? and(
				eq(hazardousEventTable.id, id),
				eq(hazardousEventTable.countryAccountsId, countryAccountsId),
			)
		: eq(hazardousEventTable.id, id); // For public/system access

	const event = await dr.query.hazardousEventTable.findFirst({
		where: whereClause,
		with: {
			countryAccount: {
				with: {
					country: true,
				},
			},
			userSubmittedBy: true,
		},
	});

	if (!event) return null;

	const hazard = event.hipHazardId
		? await getHazardById(ctx, event.hipHazardId)
		: null;

	const cluster = event.hipClusterId
		? await getClusterById(ctx, event.hipClusterId)
		: null;

	const type = await getTypeById(ctx, event.hipTypeId);

	return {
		...event,
		hipHazard: hazard ?? undefined,
		hipCluster: cluster ?? undefined,
		hipType: type ?? undefined,
	};
}

export type HazardousEventViewModel = Exclude<
	Awaited<ReturnType<typeof hazardousEventById>>,
	undefined
>;

export async function hazardousEventById(
	ctx: BackendContext,
	id: string,
	countryAccountsId?: string,
) {
	const whereClause = countryAccountsId
		? and(
				eq(hazardousEventTable.id, id),
				eq(hazardousEventTable.countryAccountsId, countryAccountsId),
			)
		: eq(hazardousEventTable.id, id); // For public/system access

	const hazardousEvent = await dr.query.hazardousEventTable.findFirst({
		where: whereClause,
		with: {
			event: {
				with: {
					// ps (event table parents) -> p (parent)-> he (hazardous events) (
					ps: {
						with: {
							p: {
								columns: { id: true },
							},
						},
					},
					// cs (event table children) -> c (child)-> he (hazardous events) (
					cs: {
						with: {
							c: {
								columns: { id: true },
							},
						},
					},
				},
			},
		},
	});

	const basicInfo = (id: string) =>
		hazardousEventBasicInfoById(ctx, id, countryAccountsId);

	if (!hazardousEvent) {
		throw new Error("hazardous event not found");
	}
	const event = hazardousEvent.event;
	if (!event) {
		const selfInfo = await basicInfo(id);
		if (!selfInfo) {
			throw new Error("hazardous event not found");
		}
		return {
			...selfInfo,
			parent: null,
			children: [],
		};
	}

	const parentHazardId: string | null =
		event.ps && event.ps.length > 0 ? (event.ps[0].p.id ?? null) : null;

	const childHazardIds: string[] = event.cs ? event.cs.map((c) => c.c.id) : [];

	const [selfInfo, parentInfo, ...childrenInfo] = await Promise.all([
		basicInfo(id),
		parentHazardId ? basicInfo(parentHazardId) : null,
		...childHazardIds.map((id) => basicInfo(id)).filter((info) => info != null),
	]);
	if (!selfInfo) {
		throw new Error("hazardous event not found");
	}

	return {
		...selfInfo,
		parent: parentInfo,
		children: childrenInfo.filter((info) => info !== null),
	};
}


