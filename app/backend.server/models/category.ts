import {  eq, sql, isNull } from 'drizzle-orm';

import {
	categoriesTable
} from '~/drizzle/schema';

import {dr} from '~/db.server';
import { BackendContext } from '../context';

export type CategoryType = {
	id?: string;
	name: string;
	parentId?: string;
	updatedAt?: Date;
	createdAt?: Date;
	level?: number;
};

export function categorySelect(ctx: BackendContext){
	return dr
		.select({
			id: categoriesTable.id,
			name: sql<string>`${categoriesTable.name}->>${ctx.lang}`,
			parent_id: categoriesTable.parentId
		})
		.from(categoriesTable)
}

export async function getCategories(ctx: BackendContext, categoryParent_id: string | null) {
  return await categorySelect(ctx)
    .where(
      categoryParent_id
        ? eq(categoriesTable.parentId, categoryParent_id)
        : isNull(categoriesTable.parentId)
    )
    .orderBy(sql`name`);
}

export async function getCategory(ctx: BackendContext, categoryId: string) {
  const res = await categorySelect(ctx)
    .where(eq(categoriesTable.id, categoryId))
    .limit(1);

  return res[0];
}
