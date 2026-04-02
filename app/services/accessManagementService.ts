import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";

import { BackendContext } from "~/backend.server/context";
import { dr } from "~/db.server";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { UserRepository } from "~/db/queries/UserRepository";
import {
	deleteUserCountryAccountsByUserIdAndCountryAccountsId,
	doesUserCountryAccountExistByEmailAndCountryAccountsId,
	getUserCountryAccountsByUserIdAndCountryAccountsId,
	updateUserCountryAccountsById,
	UserCountryAccountRepository,
} from "~/db/queries/userCountryAccountsRepository";
import { isValidEmail } from "~/utils/email";
import {
	sendInviteForExistingUser,
	sendInviteForNewUser,
} from "~/utils/emailUtil";

export class AccessManagementServiceError extends Error {
	status: number;
	fieldErrors?: Record<string, string>;
	errors?: string[];

	constructor(
		message: string,
		options?: {
			status?: number;
			fieldErrors?: Record<string, string>;
			errors?: string[];
		},
	) {
		super(message);
		this.name = "AccessManagementServiceError";
		this.status = options?.status ?? 400;
		this.fieldErrors = options?.fieldErrors;
		this.errors = options?.errors;
	}
}

type CountrySettings = {
	websiteName: string;
	countryName: string;
};

export const AccessManagementService = {
	async inviteUser(
		ctx: BackendContext,
		data: {
			email: string;
			organization: string | null;
			role: string;
			countryAccountsId: string;
			countrySettings: CountrySettings;
			loggedInUserEmail?: string;
		},
	) {
		const errors: Record<string, string> = {};
		const email = data.email?.trim() ?? "";
		const role = data.role?.trim() ?? "";

		if (!email) {
			errors.email = "Email is required";
		} else if (!isValidEmail(email)) {
			errors.email = "Invalid email format.";
		} else if (
			data.loggedInUserEmail &&
			email.toLowerCase() === data.loggedInUserEmail.toLowerCase()
		) {
			errors.email = "You cannot use your own email.";
		}

		if (!role) {
			errors.role = "Role is required";
		}

		const emailAlreadyAssignedToCountryAccount =
			await doesUserCountryAccountExistByEmailAndCountryAccountsId(
				email,
				data.countryAccountsId,
			);
		let user = await UserRepository.getByEmail(email);
		const now = new Date();

		if (emailAlreadyAssignedToCountryAccount && user) {
			const hasActiveInvite =
				!!user.inviteExpiresAt && user.inviteExpiresAt > now;
			const isUnverifiedAndExpired =
				!user.emailVerified &&
				(!user.inviteExpiresAt || user.inviteExpiresAt <= now);

			if (user.emailVerified || hasActiveInvite) {
				errors.email = "Email already invited.";
			}

			if (isUnverifiedAndExpired) {
				delete errors.email;
			}
		}

		if (Object.keys(errors).length > 0) {
			throw new AccessManagementServiceError("Validation error", {
				fieldErrors: errors,
				status: 400,
			});
		}

		const countryAccount = await CountryAccountsRepository.getById(
			data.countryAccountsId,
		);
		const countryAccountType = countryAccount?.type || "[null]";
		const expirationTime = addHours(new Date(), 14 * 24);

		await dr.transaction(async (tx) => {
			if (!user) {
				const inviteCode = randomBytes(32).toString("hex");

				user = await UserRepository.create({ email }, tx);
				await UserRepository.updateById(
					user.id,
					{
						inviteSentAt: new Date(),
						inviteCode,
						inviteExpiresAt: expirationTime,
					},
					tx,
				);

				await UserCountryAccountRepository.create(
					{
						userId: user.id,
						countryAccountsId: data.countryAccountsId,
						role,
						isPrimaryAdmin: false,
						organizationId: data.organization,
					},
					tx,
				);

				await sendInviteForNewUser(
					ctx,
					user,
					data.countrySettings.websiteName,
					role,
					data.countrySettings.countryName,
					countryAccountType,
					inviteCode,
				);
				return;
			}

			if (!emailAlreadyAssignedToCountryAccount) {
				await UserCountryAccountRepository.create(
					{
						userId: user.id,
						countryAccountsId: data.countryAccountsId,
						role,
						isPrimaryAdmin: false,
						organizationId: data.organization,
					},
					tx,
				);

				if (!user.emailVerified) {
					const existingInviteCode = user.inviteCode;
					if (!existingInviteCode) {
						throw new AccessManagementServiceError(
							"Missing invitation code for unverified user.",
							{ status: 400 },
						);
					}

					await UserRepository.updateById(
						user.id,
						{
							inviteSentAt: new Date(),
							inviteExpiresAt: expirationTime,
						},
						tx,
					);

					await sendInviteForNewUser(
						ctx,
						user,
						data.countrySettings.websiteName,
						role,
						data.countrySettings.countryName,
						countryAccountType,
						existingInviteCode,
					);
				} else {
					await sendInviteForExistingUser(
						ctx,
						user,
						data.countrySettings.websiteName,
						role,
						data.countrySettings.countryName,
						countryAccountType,
					);
				}
				return;
			}

			const existingInviteCode = user.inviteCode;
			if (!existingInviteCode) {
				throw new AccessManagementServiceError(
					"Missing invitation code for unverified user.",
					{ status: 400 },
				);
			}

			await UserRepository.updateById(
				user.id,
				{
					inviteSentAt: new Date(),
					inviteExpiresAt: expirationTime,
				},
				tx,
			);

			await sendInviteForNewUser(
				ctx,
				user,
				data.countrySettings.websiteName,
				role,
				data.countrySettings.countryName,
				countryAccountType,
				existingInviteCode,
			);
		});
	},

	async updateUser(data: {
		id: string;
		countryAccountsId: string;
		role: string;
		organization: string | null;
	}) {
		const errors: Record<string, string> = {};
		const user = await UserRepository.getById(data.id);
		if (!user) {
			throw new AccessManagementServiceError(
				`User not found with id: ${data.id}`,
				{
					status: 404,
				},
			);
		}

		const userCountryAccount =
			await getUserCountryAccountsByUserIdAndCountryAccountsId(
				data.id,
				data.countryAccountsId,
			);

		if (!userCountryAccount) {
			throw new AccessManagementServiceError(
				`User not found with id: ${data.id}`,
				{
					status: 400,
				},
			);
		}

		if (userCountryAccount.isPrimaryAdmin) {
			errors.email = "Cannot update primary admin account data";
		}
		if (!data.role || data.role.trim() === "") {
			errors.role = "Role is required";
		}
		if (Object.keys(errors).length > 0) {
			throw new AccessManagementServiceError("Validation error", {
				fieldErrors: errors,
				status: 400,
			});
		}

		await dr.transaction(async (tx) => {
			await updateUserCountryAccountsById(
				userCountryAccount.id,
				{
					role: data.role,
					organizationId: data.organization,
				},
				tx,
			);
		});
	},

	async deleteUser(data: { id: string; countryAccountsId: string }) {
		const userToDelete =
			await getUserCountryAccountsByUserIdAndCountryAccountsId(
				data.id,
				data.countryAccountsId,
			);

		if (!userToDelete) {
			throw new AccessManagementServiceError(
				"User not found or you don't have permission to delete this user.",
				{ status: 404 },
			);
		}

		if (userToDelete.isPrimaryAdmin) {
			throw new AccessManagementServiceError(
				"You cannot delete the primary admin user.",
				{ status: 403 },
			);
		}

		await deleteUserCountryAccountsByUserIdAndCountryAccountsId(
			data.id,
			data.countryAccountsId,
		);
	},

	async resendInvitation(
		ctx: BackendContext,
		data: {
			id: string;
			countryAccountsId: string;
			countrySettings: CountrySettings;
		},
	) {
		const countryAccount = await CountryAccountsRepository.getById(
			data.countryAccountsId,
		);
		const countryAccountType = countryAccount?.type || "[null]";

		const userCountryAccount =
			await getUserCountryAccountsByUserIdAndCountryAccountsId(
				data.id,
				data.countryAccountsId,
			);
		if (!userCountryAccount) {
			throw new AccessManagementServiceError(
				`User with id: ${data.id} not found in this instance.`,
				{ status: 404 },
			);
		}

		const user = await UserRepository.getById(data.id);
		if (!user) {
			throw new AccessManagementServiceError(
				`User not found with id: ${data.id}`,
				{
					status: 404,
				},
			);
		}

		if (user.emailVerified) {
			throw new AccessManagementServiceError("Account activated", {
				errors: [
					ctx.t({
						code: "settings.access_mgmnt.account_activated",
						msg: "Account activated",
					}),
				],
				status: 400,
			});
		}

		const existingInviteCode = user.inviteCode;
		if (!existingInviteCode) {
			throw new AccessManagementServiceError(
				"Missing invitation code for unverified user.",
				{ status: 400 },
			);
		}

		const expirationTime = addHours(new Date(), 14 * 24);
		await UserRepository.updateById(user.id, {
			inviteSentAt: new Date(),
			inviteExpiresAt: expirationTime,
		});

		await sendInviteForNewUser(
			ctx,
			user,
			data.countrySettings.websiteName,
			userCountryAccount.role,
			data.countrySettings.countryName,
			countryAccountType,
			existingInviteCode,
		);
	},
};
