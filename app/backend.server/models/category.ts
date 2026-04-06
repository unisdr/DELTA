import { eq, sql, isNull } from "drizzle-orm";

import { categoriesTable } from "~/drizzle/schema/categoriesTable";

import { dr } from "~/db.server";

const ctx: any = { t: (message: any, _v?: any) => message?.msg ?? "", lang: "en", url: (p: string) => p, fullUrl: (p: string) => p, rootUrl: () => "/" };




export type CategoryType = {
	id?: string;
	name: string;
	parentId?: string;
	updatedAt?: Date;
	createdAt?: Date;
	level?: number;
};

export function categorySelect() {
	return dr
		.select({
			id: categoriesTable.id,
			name: sql<string>`dts_jsonb_localized(${categoriesTable.name}, ${ctx.lang})`,
			parent_id: categoriesTable.parentId,
		})
		.from(categoriesTable);
}

export async function getCategories(categoryParent_id: string | null) {
	return await categorySelect()
		.where(
			categoryParent_id
				? eq(categoriesTable.parentId, categoryParent_id)
				: isNull(categoriesTable.parentId),
		)
		.orderBy(sql`name`);
}

export async function getCategory(categoryId: string) {
	const res = await categorySelect()
		.where(eq(categoriesTable.id, categoryId))
		.limit(1);

	return res[0];
}
