import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";

import { ViewContext } from "~/frontend/context";
import { authAction, authActionGetAuth, authLoader, authLoaderGetAuth } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";
import { redirectWithMessage } from "~/utils/session";
import { UserProfileService } from "~/services/userProfileService";

type ActionData = {
    ok: boolean;
    data?: {
        firstName: string;
        lastName: string;
    };
    errors?: {
        firstName?: string;
        lastName?: string;
    };
};

export const loader = authLoader(async (loaderArgs) => {
    const { user } = authLoaderGetAuth(loaderArgs);

    return UserProfileService.getUserProfileForEdit({
        firstName: user.firstName,
        lastName: user.lastName,
    });
});

export const action = authAction(async (actionArgs): Promise<ActionData | Response> => {
    const { request } = actionArgs;
    const ctx = new BackendContext(actionArgs);
    const { user } = authActionGetAuth(actionArgs);

    const formData = await request.formData();

    const result = await UserProfileService.updateUserProfile({
        backendCtx: ctx,
        userId: user.id,
        formData,
    });

    if (!result.ok) {
        return result;
    }

    return redirectWithMessage(actionArgs, "/user/profile", {
        type: "success",
        text: ctx.t({
            code: "common.successfully_updated",
            msg: "Successfully updated",
        }),
    });
});

export default function ProfileEditDialogRoute() {
    const ctx = new ViewContext();
    const ld = useLoaderData<typeof loader>();
    const ad = useActionData<typeof action>();
    const navigate = useNavigate();
    const navigation = useNavigation();

    const isSubmitting = navigation.state === "submitting";
    const actionData = (ad && typeof ad === "object" && "ok" in ad ? ad : null) as ActionData | null;

    const firstName = actionData?.data?.firstName ?? ld.firstName;
    const lastName = actionData?.data?.lastName ?? ld.lastName;
    const firstNameError = actionData?.errors?.firstName || "";
    const lastNameError = actionData?.errors?.lastName || "";

    return (
        <Dialog
            header={ctx.t({ code: "nav.profile", msg: "Profile" })}
            visible
            modal
            onHide={() => navigate(ctx.url("/user/profile"))}
            className="w-[32rem] max-w-full"
        >
            <Form method="post" className="flex flex-col" noValidate>
                <p className="mb-3 text-red-700">
                    * {ctx.t({ code: "common.required_information", msg: "Required information" })}
                </p>

                <div className="mb-3 flex flex-col gap-2">
                    <label htmlFor="profile-first-name">
                        <span className="inline-flex gap-1">
                            <span>{ctx.t({ code: "common.first_name", msg: "First name" })}</span>
                            <span className="text-red-700">*</span>
                        </span>
                    </label>
                    <InputText
                        id="profile-first-name"
                        name="firstName"
                        defaultValue={firstName}
                        invalid={!!firstNameError}
                        aria-invalid={firstNameError ? true : false}
                    />
                    {firstNameError ? <small className="text-red-700">{firstNameError}</small> : null}
                </div>

                <div className="mb-3 flex flex-col gap-2">
                    <label htmlFor="profile-last-name">
                        <span className="inline-flex gap-1">
                            <span>{ctx.t({ code: "common.last_name", msg: "Last name" })}</span>
                            <span className="text-red-700">*</span>
                        </span>
                    </label>
                    <InputText
                        id="profile-last-name"
                        name="lastName"
                        defaultValue={lastName}
                        invalid={!!lastNameError}
                        aria-invalid={lastNameError ? true : false}
                    />
                    {lastNameError ? <small className="text-red-700">{lastNameError}</small> : null}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        type="button"
                        outlined
                        label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
                        onClick={() => navigate(ctx.url("/user/profile"))}
                    />
                    <Button
                        type="submit"
                        label={ctx.t({ code: "common.save", msg: "Save" })}
                        icon="pi pi-check"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    />
                </div>
            </Form>
        </Dialog>
    );
}
