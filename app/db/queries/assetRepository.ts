import { and, eq, or, sql, ilike } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import {
	assetTable,
	InsertAsset,
	SelectAsset,
	assetTableConstraints,
} from "~/drizzle/schema/assetTable";
import { sectorTable } from "~/drizzle/schema/sectorTable";

// Re-export schema types so callers import from one place
export type { InsertAsset, SelectAsset };

type AssetListFilters = {
	search?: string;
	builtIn?: boolean;
};

export type CreateAssetData = Pick<
	InsertAsset,
	"customName" | "customCategory" | "customNotes" | "nationalId" | "sectorIds" | "countryAccountsId"
>;

export type UpdateAssetData = Partial<
	Pick<InsertAsset, "customName" | "customCategory" | "customNotes" | "nationalId" | "sectorIds">
>;

export const AssetRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(assetTable).where(eq(assetTable.id, id));
	},

	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(assetTable)
			.where(eq(assetTable.countryAccountsId, countryAccountsId));
	},

	deleteByCountryAccountIdAndIsBuiltIn: (
		countryAccountsId: string,
		isBuiltIn: boolean,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.delete(assetTable)
			.where(
				and(
					eq(assetTable.countryAccountsId, countryAccountsId),
					eq(assetTable.isBuiltIn, isBuiltIn),
				),
			);
	},

	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(assetTable)
			.where(eq(assetTable.countryAccountsId, countryAccountsId));
	},

	createMany: (data: InsertAsset[], tx?: Tx) => {
		return (tx ?? dr).insert(assetTable).values(data).returning().execute();
	},

	list: async (
		lang: string,
		countryAccountsId: string,
		filters: AssetListFilters,
		page: number,
		pageSize: number,
		tx?: Tx,
	) => {
		let tenantCondition;
		if (filters.builtIn === true) {
			tenantCondition = eq(assetTable.isBuiltIn, true);
		} else if (filters.builtIn === false) {
			tenantCondition = and(
				eq(assetTable.countryAccountsId, countryAccountsId),
				eq(assetTable.isBuiltIn, false),
			);
		} else {
			tenantCondition = or(
				eq(assetTable.isBuiltIn, true),
				eq(assetTable.countryAccountsId, countryAccountsId),
			);
		}

		const searchTerm = filters.search ? `%${filters.search}%` : null;
		const searchCondition = searchTerm
			? or(
					sql`${assetTable.id}::text ILIKE ${searchTerm}`,
					ilike(assetTable.nationalId, searchTerm),
					ilike(assetTable.customName, searchTerm),
					sql`dts_jsonb_localized(${assetTable.builtInName}, ${lang}) ILIKE ${searchTerm}`,
					ilike(assetTable.customCategory, searchTerm),
					sql`dts_jsonb_localized(${assetTable.builtInCategory}, ${lang}) ILIKE ${searchTerm}`,
				)
			: undefined;

		const condition = and(tenantCondition, searchCondition);
		const total = await (tx ?? dr).$count(assetTable, condition);
		const offset = (page - 1) * pageSize;

		const items = await (tx ?? dr).query.assetTable.findMany({
			offset,
			limit: pageSize,
			columns: {
				id: true,
				sectorIds: true,
				isBuiltIn: true,
				nationalId: true,
				customName: true,
				customCategory: true,
				customNotes: true,
			},
			extras: {
				name: sql<string>`CASE WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${lang}) ELSE ${assetTable.customName} END`.as(
					"name",
				),
				sectorData: sql<{ id: string; name: string }[] | null>`(
					SELECT json_agg(json_build_object('id', s.id::text, 'name', dts_jsonb_localized(s.name, ${lang})))
					FROM ${sectorTable} s
					WHERE s.id = ANY(string_to_array(${assetTable.sectorIds}, ',')::uuid[])
				)`.as("sector_data"),
			},
			orderBy: [sql`name`],
			where: condition,
		});

		return { items, total };
	},

	findById: async (
		id: string,
		countryAccountsId: string,
		lang: string,
		tx?: Tx,
	) => {
		const rows = await (tx ?? dr)
			.select({
				id: assetTable.id,
				name: sql<string>`CASE WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${lang}) ELSE ${assetTable.customName} END`.as(
					"name",
				),
				category: sql<string>`CASE WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInCategory}, ${lang}) ELSE ${assetTable.customCategory} END`.as(
					"category",
				),
				notes: sql<string>`CASE WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInNotes}, ${lang}) ELSE ${assetTable.customNotes} END`.as(
					"notes",
				),
				sectorIds: assetTable.sectorIds,
				isBuiltIn: assetTable.isBuiltIn,
				nationalId: assetTable.nationalId,
				countryAccountsId: assetTable.countryAccountsId,
			})
			.from(assetTable)
			.where(
				and(
					eq(assetTable.id, id),
					or(
						eq(assetTable.countryAccountsId, countryAccountsId),
						eq(assetTable.isBuiltIn, true),
					),
				),
			);
		return rows[0] ?? null;
	},

	create: async (data: CreateAssetData, tx?: Tx) => {
		const res = await (tx ?? dr)
			.insert(assetTable)
			.values({ ...data, isBuiltIn: false })
			.returning({ id: assetTable.id });
		return res[0]?.id ?? null;
	},

	update: async (
		id: string,
		data: UpdateAssetData,
		countryAccountsId: string,
		tx?: Tx,
	): Promise<{ ok: boolean; errors?: string[] }> => {
		const updated = await (tx ?? dr)
			.update(assetTable)
			.set(data)
			.where(
				and(
					eq(assetTable.id, id),
					eq(assetTable.countryAccountsId, countryAccountsId),
					eq(assetTable.isBuiltIn, false),
				),
			)
			.returning({ id: assetTable.id });

		if (!updated.length) {
			return { ok: false, errors: ["Asset not found or cannot be edited"] };
		}
		return { ok: true };
	},

	deleteById: async (
		id: string,
		countryAccountsId: string,
		tx?: Tx,
	): Promise<{ ok: boolean; error?: string }> => {
		try {
			await (tx ?? dr)
				.delete(assetTable)
				.where(
					and(
						eq(assetTable.id, id),
						eq(assetTable.countryAccountsId, countryAccountsId),
						eq(assetTable.isBuiltIn, false),
					),
				);
			return { ok: true };
		} catch (err: unknown) {
			const e = err as { constraint?: string; cause?: { constraint?: string } };
			const constraint = e.constraint ?? e.cause?.constraint;
			if (constraint === assetTableConstraints.assetId) {
				return {
					ok: false,
					error: "Cannot delete this asset — it is used in damage records",
				};
			}
			throw err;
		}
	},
};
