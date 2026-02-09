import { passwordHashCompare } from './password';
import { isValidTotp } from './totp';
import { getUserByEmail, getUserById, updateUserById } from '~/db/queries/user';
import { getSuperAdminUserByEmail, updateSuperAdminUser } from '~/db/queries/superAdminUsers';

export type LoginResult =
    | { ok: true; userId: string; countryAccountId?: string | null; role?: string }
    | { ok: false };

export type SuperAdminLoginResult = { ok: true; superAdminId: string } | { ok: false };

export async function login(email: string, password: string): Promise<LoginResult> {
    const user = await getUserByEmail(email);
    if (!user) {
        return { ok: false };
    }
    const isPasswordValid = await passwordHashCompare(password, user.password);
    if (isPasswordValid) {
        return {
            ok: true,
            userId: user.id,
        };
    }

    return { ok: false };
}

export async function superAdminLogin(
    email: string,
    password: string,
): Promise<SuperAdminLoginResult> {
    const superAdminUser = await getSuperAdminUserByEmail(email);
    if (!superAdminUser) {
        return { ok: false };
    }
    const isPasswordValid = await passwordHashCompare(password, superAdminUser.password);
    if (isPasswordValid) {
        return {
            ok: true,
            superAdminId: superAdminUser.id,
        };
    }

    return { ok: false };
}

export type LoginAzureB2CResult = { ok: true; userId: string } | { ok: false; error: string };

export async function registerAzureB2C(
    pEmail: string,
    pFirstName: string,
    pLastName: string,
): Promise<LoginAzureB2CResult> {
    const user = await getUserByEmail(pEmail);

    if (!user) {
        return { ok: false, error: "Email address doesn't exists" };
    }
    if (!pFirstName || pFirstName.length === 0) {
        return { ok: false, error: 'User first name is required' };
    }

    await updateUserById(user.id, {
        firstName: pFirstName,
        lastName: pLastName,
        emailVerified: true,
        authType: 'sso_azure_b2c',
        inviteCode: '',
    });

    return { ok: true, userId: user.id };
}

export async function loginAzureB2C(
    pEmail: string,
    pFirstName: string,
    pLastName: string,
): Promise<LoginAzureB2CResult> {
    const user = await getUserByEmail(pEmail);

    if (!user) {
        return { ok: false, error: 'User not found' };
    }
    if (!pFirstName || pFirstName.length === 0) {
        return { ok: false, error: 'User first name is required' };
    }

    if (user.emailVerified == false) {
        return { ok: false, error: 'Email address is not yet verified.' };
    }

    await updateUserById(user.id, {
        firstName: pFirstName,
        lastName: pLastName,
    });

    return { ok: true, userId: user.id };
}

export type LoginTotpResult = { ok: true } | { ok: false; error: string };

/**
 * Check if an email belongs to a super admin
 * @param email Email address to check
 * @returns Result with superAdminId if found
 */
export async function checkSuperAdminByEmail(email: string): Promise<SuperAdminLoginResult> {
    const superAdminUser = await getSuperAdminUserByEmail(email);

    if (!superAdminUser) {
        return { ok: false };
    }

    return {
        ok: true,
        superAdminId: superAdminUser.id,
    };
}

/**
 * Login a super admin using Azure B2C SSO
 * @param email Email address from SSO
 * @param firstName First name from SSO
 * @param lastName Last name from SSO
 * @returns Result with superAdminId if successful
 */
export async function loginSuperAdminAzureB2C(
    email: string,
    firstName: string,
    lastName: string,
): Promise<SuperAdminLoginResult> {
    const superAdminUser = await getSuperAdminUserByEmail(email);

    if (!superAdminUser) {
        return { ok: false };
    }

    // Update first and last name if provided
    if (firstName || lastName) {
        const updateData: any = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;

        await updateSuperAdminUser(updateData.id, updateData);
    }

    return {
        ok: true,
        superAdminId: superAdminUser.id,
    };
}

export async function loginTotp(
    userId: string,
    token: string,
    totpIssuer: string,
): Promise<LoginTotpResult> {
    const user = await getUserById(userId);
    if (!user) {
        return { ok: false, error: 'Application error. User not found.' };
    }

    if (!user.totpEnabled) {
        return {
            ok: false,
            error: 'Application error. TOTP not enabled for user.',
        };
    }

    const isValid = await isValidTotp(user, token, totpIssuer);

    if (!isValid) {
        return { ok: false, error: 'TOTP token not correct.' };
    }

    return { ok: true };
}
