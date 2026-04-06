import { eq, sql, isNull } from "drizzle-orm";


const ctx: any = { t: (message: { msg: string }) => message.msg, lang: 'en', url: (path: string) => path, fullUrl: (path: string) => path, rootUrl: () => '/', user: undefined };
import { categoriesTable } from "~/drizzle/schema/categoriesTable";

import { dr } from "~/db.server";
import { BackendContext } from "../context";

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

export async function getCategories(
	categoryParent_id: string | null,
) {
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

