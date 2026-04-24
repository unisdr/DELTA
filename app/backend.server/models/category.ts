import { eq, sql, isNull } from "drizzle-orm";

import { categoriesTable } from "~/drizzle/schema/categoriesTable";

import { dr } from "~/db.server";

export function categorySelect() {
	return dr
		.select({
			id: categoriesTable.id,
			name: sql<string>`dts_jsonb_localized(${categoriesTable.name}, 'en')`,
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
