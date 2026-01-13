import { describe, it, expect, beforeEach } from 'vitest';
import { dr } from '~/db.server';
import { getUserById } from '~/db/queries/user';
import { userTable } from '~/drizzle/schema';

describe('getUserById', () => {
    beforeEach(async () => {
        await dr.delete(userTable);
    });

    it('should return the user when ID exists', async () => {
        const [inserted] = await dr
            .insert(userTable)
            .values({
                id: '50a3b7c1-8f2d-4d9a-9e1c-3b8f4e6a2d1c',
                email: 'alice@example.com',
                firstName: 'Alice',
            })
            .returning();

        const user = await getUserById('50a3b7c1-8f2d-4d9a-9e1c-3b8f4e6a2d1c');
        expect(user).toEqual(inserted);
    });

    it('should return null when user does not exist', async () => {
        const user = await getUserById('60a3b7c1-8f2d-4d9a-9e1c-3b8f4e6a2d1b');
        expect(user).toBeNull();
    });

    it('should throw error if empty string, invalid ID, invalid UUID', async () => {
        await expect(getUserById('')).rejects.toThrow();
        await expect(getUserById('   ')).rejects.toThrow();
        await expect(getUserById('50a3b7c1-8f2d-4d9a-9e1c-3b8f4e')).rejects.toThrow();
    });
});
