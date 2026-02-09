import { eq } from 'drizzle-orm';
import { dr } from '~/db.server';
import { SelectSuperAdmins, superAdminUsers } from '~/drizzle/schema';

export async function getSuperAdminUserByEmail(email: string): Promise<SelectSuperAdmins | null> {
    const result = await dr
        .select()
        .from(superAdminUsers)
        .where(eq(superAdminUsers.email, email))
        .limit(1)
        .execute();
    return result[0] ?? null;
}

export async function updateSuperAdminUser(
    id: string,
    data: Partial<Omit<SelectSuperAdmins, 'id'>>,
): Promise<SelectSuperAdmins | null> {
    const result = await dr
        .update(superAdminUsers)
        .set(data)
        .where(eq(superAdminUsers.id, id))
        .returning();

    return result[0] ?? null;
}
