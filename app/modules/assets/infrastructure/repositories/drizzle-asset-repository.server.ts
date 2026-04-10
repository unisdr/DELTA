import { and, eq, ilike, or, sql } from "drizzle-orm";

import type { Dr } from "~/modules/assets/infrastructure/db/client.server";
import {
	assetTable,
	assetTableConstraints,
	type InsertAsset,
} from "~/modules/assets/infrastructure/db/schema";
import type {
	Asset,
	AssetListItem,
	CreateAssetData,
	UpdateAssetData,
} from "~/modules/assets/domain/entities/asset";
import type {
	AssetDeleteResult,
	AssetRepositoryPort,
	AssetSectorDisplay,
	ListAssetsQuery,
} from "~/modules/assets/domain/repositories/asset-repository";
import { sectorTable } from "~/drizzle/schema/sectorTable";

export class DrizzleAssetRepository implements AssetRepositoryPort {
	constructor(private readonly db: Dr) {}

	private buildCondition(query: Omit<ListAssetsQuery, "offset" | "limit">) {
		const { countryAccountsId, search, builtIn } = query;
		const searchIlike = `%${search}%`;

		let tenantCondition;
		if (builtIn === true) {
			tenantCondition = eq(assetTable.isBuiltIn, true);
		} else if (builtIn === false) {
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

		const searchCondition = search
			? or(
					sql`${assetTable.id}::text ILIKE ${searchIlike}`,
					ilike(assetTable.nationalId, searchIlike),
					ilike(assetTable.customName, searchIlike),
					sql`dts_jsonb_localized(${assetTable.builtInName}, ${"en"}) ILIKE ${searchIlike}`,
					ilike(assetTable.customCategory, searchIlike),
					sql`dts_jsonb_localized(${assetTable.builtInCategory}, ${"en"}) ILIKE ${searchIlike}`,
					ilike(assetTable.customNotes, searchIlike),
					sql`dts_jsonb_localized(${assetTable.builtInNotes}, ${"en"}) ILIKE ${searchIlike}`,
					ilike(assetTable.sectorIds, searchIlike),
				)
			: undefined;

		return and(tenantCondition, searchCondition);
	}

	async count(
		query: Omit<ListAssetsQuery, "offset" | "limit">,
	): Promise<number> {
		const condition = this.buildCondition(query);
		return this.db.$count(assetTable, condition);
	}

	async list(query: ListAssetsQuery): Promise<AssetListItem[]> {
		const condition = this.buildCondition(query);

		const rows = await this.db.query.assetTable.findMany({
			limit: query.limit,
			offset: query.offset,
			columns: { id: true, sectorIds: true, isBuiltIn: true },
			extras: {
				name: sql<string>`CASE
					WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${"en"})
					ELSE ${assetTable.customName}
				END`.as("name"),
				sectorNames: sql<string>`NULL`.as("sector_names"),
				sectorData: sql<JSON>`(
					SELECT json_agg(json_build_object('id', s.id, 'name', dts_jsonb_localized(s.name, ${"en"})))
					FROM ${sectorTable} s
					WHERE s.id = ANY(string_to_array(${assetTable.sectorIds}, ',')::uuid[])
				)`.as("sector_data"),
			},
			orderBy: [sql`name`],
			where: condition,
		});

		return rows.map((row) => {
			const sectorList = Array.isArray(row.sectorData) ? row.sectorData : [];
			const sectorNames = sectorList.map((s: any) => String(s.name)).join(", ");
			return {
				id: row.id,
				name: row.name,
				sectorIds: row.sectorIds,
				sectorNames,
				isBuiltIn: row.isBuiltIn,
			};
		});
	}

	async findById(id: string): Promise<Asset | null> {
		const rows = await this.db
			.select({
				id: assetTable.id,
				name: sql<string>`CASE
					WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, 'en')
					ELSE ${assetTable.customName}
				END`.as("name"),
				category: sql<string>`CASE
					WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInCategory}, 'en')
					ELSE ${assetTable.customCategory}
				END`.as("category"),
				notes: sql<string>`CASE
					WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInNotes}, 'en')
					ELSE ${assetTable.customNotes}
				END`.as("notes"),
				sectorIds: assetTable.sectorIds,
				isBuiltIn: assetTable.isBuiltIn,
				nationalId: assetTable.nationalId,
				countryAccountsId: assetTable.countryAccountsId,
				apiImportId: assetTable.apiImportId,
			})
			.from(assetTable)
			.where(eq(assetTable.id, id));

		if (!rows.length) return null;
		return rows[0];
	}

	async create(
		data: CreateAssetData,
		countryAccountsId: string,
	): Promise<{ id: string }> {
		const insertValues: InsertAsset = {
			isBuiltIn: false,
			customName: data.name,
			customCategory: data.category,
			customNotes: data.notes,
			sectorIds: Array.isArray(data.sectorIds)
				? (data.sectorIds as string[]).join(",")
				: data.sectorIds || "",
			nationalId: data.nationalId ?? null,
			countryAccountsId,
		};

		const res = await this.db
			.insert(assetTable)
			.values(insertValues)
			.returning({ id: assetTable.id });

		return { id: res[0].id };
	}

	async update(
		id: string,
		countryAccountsId: string,
		data: UpdateAssetData,
	): Promise<void> {
		const existing = await this.db.query.assetTable.findFirst({
			where: and(
				eq(assetTable.id, id),
				eq(assetTable.countryAccountsId, countryAccountsId),
			),
		});

		if (!existing) {
			throw new Response("Asset not found", { status: 404 });
		}
		if (existing.isBuiltIn) {
			throw new Response("Cannot modify built-in asset", { status: 403 });
		}

		const updateValues: Partial<InsertAsset> = {};
		if (data.name !== undefined) updateValues.customName = data.name;
		if (data.category !== undefined)
			updateValues.customCategory = data.category;
		if (data.notes !== undefined) updateValues.customNotes = data.notes;
		if (data.nationalId !== undefined)
			updateValues.nationalId = data.nationalId;
		if (data.sectorIds !== undefined) {
			updateValues.sectorIds = Array.isArray(data.sectorIds)
				? (data.sectorIds as string[]).join(",")
				: data.sectorIds;
		}

		await this.db
			.update(assetTable)
			.set(updateValues)
			.where(eq(assetTable.id, id));
	}

	async deleteById(
		id: string,
		countryAccountsId: string,
	): Promise<AssetDeleteResult> {
		const existing = await this.db.query.assetTable.findFirst({
			where: eq(assetTable.id, id),
		});

		if (!existing) {
			throw new Response("Asset not found", { status: 404 });
		}
		if (existing.isBuiltIn) {
			throw new Response("Cannot delete built-in asset", { status: 403 });
		}
		if (existing.countryAccountsId !== countryAccountsId) {
			throw new Response("Asset not accessible", { status: 403 });
		}

		try {
			await this.db.delete(assetTable).where(eq(assetTable.id, id));
		} catch (err: any) {
			const constraint = err.constraint || err.cause?.constraint;
			if (constraint === assetTableConstraints.assetId) {
				return {
					ok: false,
					error: "Cannot delete this asset - it is used in damages",
				};
			}
			throw err;
		}

		return { ok: true };
	}

	async getSectorDisplay(sectorIds: string): Promise<AssetSectorDisplay[]> {
		if (!sectorIds) return [];
		const ids = sectorIds.split(",").filter(Boolean);
		if (!ids.length) return [];

		const { rows } = await this.db.execute(sql`
			SELECT id, sectorname
			FROM sector
			WHERE id IN (${sql.join(ids, sql`, `)})
		`);

		const idToNameMap = new Map(
			rows.map((row: any) => [row.id, row.sectorname]),
		);

		return ids.map((id) => ({
			id,
			name: (idToNameMap.get(id) || "No sector found") as string,
		}));
	}
}
