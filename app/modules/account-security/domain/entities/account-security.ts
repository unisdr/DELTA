import type { Errors } from "~/frontend/form";
import type {
	ChangePasswordFields,
	ResetPasswordFields,
} from "~/backend.server/models/user/password";

export type ChangePasswordResult =
	| { ok: true }
	| { ok: false; errors: Errors<ChangePasswordFields> };

export type ResetPasswordResult =
	| { ok: true }
	| { ok: false; errors: Errors<ResetPasswordFields> };

export type ValidateInviteResult =
	| { ok: true; userId: string; email: string }
	| { ok: false; error: string };

export interface CompleteInviteSignupInput {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	passwordRepeat: string;
}

export interface CompleteInviteSignupErrors {
	firstName?: string;
	lastName?: string;
	password?: string;
	passwordRepeat?: string;
	email?: string;
	form?: string;
}

export type CompleteInviteSignupResult =
	| { ok: true }
	| { ok: false; errors: CompleteInviteSignupErrors };
