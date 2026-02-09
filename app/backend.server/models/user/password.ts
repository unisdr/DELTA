import { dr } from '~/db.server';
import { eq } from 'drizzle-orm';

import { userTable } from '~/drizzle/schema';

import { Errors, hasErrors } from '~/frontend/form';

import { sendEmail } from '~/utils/email';
import { addHours } from '~/utils/time';

import { checkPasswordComplexity, PasswordErrorType } from './password_check';
import { getUserById } from '~/db/queries/user';
import { BackendContext } from '~/backend.server/context';

import { passwordHash, passwordHashCompare } from '~/utils/Password';
export async function resetPasswordSilentIfNotFound(email: string, resetToken: string) {
    const res = await dr.select().from(userTable).where(eq(userTable.email, email));

    if (!res || res.length === 0) {
        console.log('reset password, user not found', 'email', email);
        return;
    }

    const expiresAt = addHours(new Date(), 1);
    await dr
        .update(userTable)
        .set({
            resetPasswordToken: resetToken,
            resetPasswordExpiresAt: expiresAt,
        })
        .where(eq(userTable.email, email));
}

export interface ResetPasswordFields {
    newPassword: string;
    confirmPassword: string;
}

type ResetPasswordResult = { ok: true } | { ok: false; errors: Errors<ResetPasswordFields> };

export async function resetPassword(
    ctx: BackendContext,
    email: string,
    token: string,
    newPassword: string,
    confirmPassword: string,
): Promise<ResetPasswordResult> {
    let errors: Errors<ResetPasswordFields> = {};
    errors.form = [];
    errors.fields = {};

    const res = await dr.select().from(userTable).where(eq(userTable.email, email));

    if (!res || res.length === 0) {
        errors.fields.newPassword = [
            ctx.t({
                code: 'user_reset_password.user_not_found',
                msg: 'User not found',
            }),
        ];
        return { ok: false, errors };
    }

    const user = res[0];
    if (user.resetPasswordToken !== token) {
        errors.fields.newPassword = [
            ctx.t({
                code: 'user_reset_password.invalid_token',
                msg: 'Invalid or expired token',
            }),
        ];
        return { ok: false, errors };
    }
    const now = new Date();
    if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < now) {
        errors.fields.newPassword = [
            ctx.t({
                code: 'user_reset_password.token_expired',
                msg: 'Token has expired',
            }),
        ];
        return { ok: false, errors };
    }
    if (!newPassword) {
        errors.fields.newPassword = [
            ctx.t({
                code: 'user_reset_password.password_required',
                msg: 'Password is required',
            }),
        ];
        return { ok: false, errors };
    }
    if (!confirmPassword) {
        errors.fields.confirmPassword = [
            ctx.t({
                code: 'user_reset_password.confirm_password_required',
                msg: 'Confirm password is required',
            }),
        ];
        return { ok: false, errors };
    }

    if (newPassword) {
        const res = checkPasswordComplexity(newPassword);
        if (res.error && res.error === PasswordErrorType.TooShort) {
            errors.fields.newPassword = [
                ctx.t({
                    code: 'user_password.password_too_short',
                    msg: 'Minimum password length is 12',
                }),
            ];
            return { ok: false, errors };
        }

        if (res.error && res.error === PasswordErrorType.InsufficientCharacterClasses) {
            errors.fields.newPassword = [
                ctx.t({
                    code: 'user_password.password_insufficient_character_classes',
                    msg: 'Must include two of the followings: uppercase, lowercase , numbers letters, special characters',
                }),
            ];

            return {
                ok: false,
                errors,
            };
        }

        if (newPassword === user.email) {
            errors.fields.newPassword = [
                ctx.t({
                    code: 'user_password.password_same_as_email',
                    msg: 'Password cannot be as email. Please choose a different password.',
                }),
            ];
            return { ok: false, errors };
        }
    }
    if (newPassword !== confirmPassword) {
        errors.fields.confirmPassword = [
            ctx.t({
                code: 'user_password.passwords_do_not_match',
                msg: 'New passwords do not match.',
            }),
        ];

        return { ok: false, errors };
    }

    const hashedPassword = passwordHash(newPassword);
    await dr
        .update(userTable)
        .set({
            password: hashedPassword,
            resetPasswordToken: '',
        })
        .where(eq(userTable.email, email));

    // send password reset confirmation email.
    //const userLoginURL = `${configSiteURL}/user/login`;
    const subject = ctx.t({
        code: 'user_reset_password.password_change_confirmation_email_subject',
        msg: 'Password change',
    });
    const text = ctx.t({
        code: 'user_reset_password.password_change_confirmation_email_text',
        msg: 'Your password has been successfully changed. If you did not request this change, please contact your admin.',
    });

    const html = ctx.t({
        code: 'user_reset_password.password_change_confirmation_email_html',
        msg: '<p>Your password has been successfully changed. If you did not request this change, please contact your admin.</p>',
    });

    await sendEmail(user.email, subject, text, html);
    return { ok: true };
}

export interface ChangePasswordFields {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

type ChangePasswordResult = { ok: true } | { ok: false; errors: Errors<ChangePasswordFields> };

export async function changePassword(
    ctx: BackendContext,
    userId: string,
    fields: ChangePasswordFields,
): Promise<ChangePasswordResult> {
    let errors: Errors<ChangePasswordFields> = {};
    errors.form = [];
    errors.fields = {};

    const { currentPassword, newPassword, confirmPassword } = fields;

    if (!currentPassword) {
        errors.fields.currentPassword = [
            ctx.t({
                code: 'user_change_password.current_password_required',
                msg: 'Current password is required',
            }),
        ];
    }

    if (!newPassword) {
        errors.fields.newPassword = [
            ctx.t({
                code: 'user_change_password.new_password_required',
                msg: 'New password is required',
            }),
        ];
    }

    if (hasErrors(errors)) {
        return { ok: false, errors };
    }

    const user = await getUserById(userId);

    if (!user) {
        errors.form = [
            ctx.t({
                code: 'user_change_password.user_not_found',
                msg: 'Application error. User not found',
            }),
        ];
        return { ok: false, errors };
    }

    if (newPassword) {
        const res = checkPasswordComplexity(newPassword);
        if (res.error && res.error === PasswordErrorType.TooShort) {
            errors.fields.newPassword = [
                ctx.t({
                    code: 'user_password.password_too_short',
                    msg: 'Minimum password length is 12',
                }),
            ];
        } else if (res.error && res.error === PasswordErrorType.InsufficientCharacterClasses) {
            errors.fields.newPassword = [
                ctx.t({
                    code: 'user_password.password_insufficient_character_classes',
                    msg: 'Must include two of the followings: uppercase, lowercase , numbers letters, special characters',
                }),
            ];
        } else if (newPassword === user.email) {
            errors.fields.newPassword = [
                ctx.t({
                    code: 'user_password.password_same_as_email',
                    msg: 'Password cannot be as email. Please choose a different password.',
                }),
            ];
        } else if (newPassword === currentPassword) {
            errors.fields.newPassword = [
                ctx.t({
                    code: 'user_password.password_same_as_current',
                    msg: 'Password cannot be the same as the current password.',
                }),
            ];
        }
        if (hasErrors(errors)) {
            return { ok: false, errors };
        }
    }
    if (newPassword && confirmPassword !== newPassword) {
        errors.fields.confirmPassword = [
            ctx.t({
                code: 'user_password.passwords_do_not_match',
                msg: 'New passwords do not match.',
            }),
        ];
        return { ok: false, errors };
    }

    const passwordValid = await passwordHashCompare(currentPassword, user.password);
    if (!passwordValid) {
        errors.fields.currentPassword = [
            ctx.t({
                code: 'user_change_password.current_password_incorrect',
                msg: 'Current password is incorrect',
            }),
        ];
        return { ok: false, errors };
    }

    const hashedPassword = passwordHash(newPassword);

    await dr
        .update(userTable)
        .set({
            password: hashedPassword,
        })
        .where(eq(userTable.id, userId));

    return { ok: true };
}
