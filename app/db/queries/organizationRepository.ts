import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import {
	organizationTable,
	InsertOrganization,
	SelectOrganization,
} from "~/drizzle/schema/organizationTable";
import { isValidUUID } from "~/utils/id";

type OrganizationCountryAccountsId = NonNullable<
	SelectOrganization["countryAccountsId"]
>;

interface ListByCountryAccountsIdArgs {
	countryAccountsId: OrganizationCountryAccountsId;
	search?: string;
	pagination: {
		page: number;
		pageSize: number;
	};
}

export type OrganizationListItem = Pick<SelectOrganization, "id" | "name">;

export const OrganizationRepository = {
	create: async (
		data: Omit<InsertOrganization, "id" | "createdAt">,
		tx?: Tx,
	): Promise<SelectOrganization | null> => {
		const db = tx ?? dr;
		const rows = await db.insert(organizationTable).values(data).returning();

		return rows[0] ?? null;
	},
	getByNameAndCountryAccountsId: async (
		name: string,
		countryAccountsId: OrganizationCountryAccountsId,
		tx?: Tx,
	): Promise<SelectOrganization | undefined> => {
		const db = tx ?? dr;
		return db.query.organizationTable.findFirst({
			where: and(
				eq(organizationTable.name, name),
				eq(organizationTable.countryAccountsId, countryAccountsId),
			),
		});
	},
	getByIdAndCountryAccountsId: async (
		id: SelectOrganization["id"],
		countryAccountsId: OrganizationCountryAccountsId,
		tx?: Tx,
	): Promise<SelectOrganization | undefined> => {
		const db = tx ?? dr;
		return db.query.organizationTable.findFirst({
			where: and(
				eq(organizationTable.id, id),
				eq(organizationTable.countryAccountsId, countryAccountsId),
			),
		});
	},
	updateById: async (
		id: string,
		data: Partial<Omit<InsertOrganization, "id" | "createdAt" | "updatedAt">>,
		tx?: Tx,
	): Promise<SelectOrganization | null> => {
		const db = tx ?? dr;
		const rows = await db
			.update(organizationTable)
			.set(data)
			.where(eq(organizationTable.id, id))
			.returning();

		return rows[0] ?? null;
	},
	deleteById: async (
		id: SelectOrganization["id"],
		tx?: Tx,
	): Promise<SelectOrganization | null> => {
		const db = tx ?? dr;
		const rows = await db
			.delete(organizationTable)
			.where(eq(organizationTable.id, id))
			.returning();

		return rows[0] ?? null;
	},
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(organizationTable)
			.where(eq(organizationTable.countryAccountsId, countryAccountsId));
	},
	listByCountryAccountsId: async (args: ListByCountryAccountsIdArgs) => {
		const { countryAccountsId, pagination } = args;
		const search = (args.search ?? "").trim();

		if (!isValidUUID(countryAccountsId)) {
			throw new Error(`Invalid UUID: ${countryAccountsId}`);
		}

		const page = Number.isFinite(pagination.page)
			? Math.max(1, Math.trunc(pagination.page))
			: 1;
		const pageSize = Number.isFinite(pagination.pageSize)
			? Math.max(1, Math.trunc(pagination.pageSize))
			: 50;
		const offset = (page - 1) * pageSize;

		const conditions = [
			eq(organizationTable.countryAccountsId, countryAccountsId),
		];
		if (search) {
			const searchIlike = `%${search}%`;
			conditions.push(
				or(
					sql`${organizationTable.id}::text ILIKE ${searchIlike}`,
					ilike(organizationTable.name, searchIlike),
				)!,
			);
		}
		const where = and(...conditions);

		const totalItems = await dr.$count(organizationTable, where);
		const items: OrganizationListItem[] =
			await dr.query.organizationTable.findMany({
				offset,
				limit: pageSize,
				columns: {
					id: true,
					name: true,
				},
				orderBy: [asc(organizationTable.name)],
				where,
			});

		return {
			items,
			pagination: {
				totalItems,
				itemsOnThisPage: items.length,
				page,
				pageSize,
				extraParams: search ? { search: [search] } : {},
			},
		};
	},
	getByCountryAccountsId: (
		countryAccountsId: OrganizationCountryAccountsId,
		tx?: Tx,
	): Promise<SelectOrganization[]> => {
		if (!isValidUUID(countryAccountsId)) {
			throw new Error(`Invalid UUID: ${countryAccountsId}`);
		}
		return (tx ?? dr)
			.select()
			.from(organizationTable)
			.where(eq(organizationTable.countryAccountsId, countryAccountsId))
			.execute();
	},
};
