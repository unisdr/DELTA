import { BackendContext } from "~/backend.server/context";
import { UserRepository } from "~/db/queries/UserRepository";

interface GetUserProfileForEditArgs {
	firstName?: string | null;
	lastName?: string | null;
}

interface UpdateUserProfileArgs {
	backendCtx: BackendContext;
	userId: string;
	formData: FormData;
}

type UserProfileValidationErrors = {
	firstName?: string;
	lastName?: string;
};

export type UpdateUserProfileResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			data: {
				firstName: string;
				lastName: string;
			};
			errors: UserProfileValidationErrors;
	  };

export const UserProfileService = {
	getUserProfileForEdit({ firstName, lastName }: GetUserProfileForEditArgs) {
		return {
			firstName: firstName || "",
			lastName: lastName || "",
		};
	},

	async updateUserProfile({
		backendCtx,
		userId,
		formData,
	}: UpdateUserProfileArgs): Promise<UpdateUserProfileResult> {
		const firstName = String(formData.get("firstName") || "").trim();
		const lastName = String(formData.get("lastName") || "").trim();

		const errors: UserProfileValidationErrors = {};

		if (!firstName) {
			errors.firstName = backendCtx.t({
				code: "profile.first_name_required",
				msg: "First name is required",
			});
		}

		if (!lastName) {
			errors.lastName = backendCtx.t({
				code: "profile.last_name_required",
				msg: "Last name is required",
			});
		}

		if (errors.firstName || errors.lastName) {
			return {
				ok: false,
				data: { firstName, lastName },
				errors,
			};
		}

		await UserRepository.updateById(userId, {
			firstName,
			lastName,
		});

		return { ok: true };
	},
};
