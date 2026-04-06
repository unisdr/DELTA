import {
    ActionFunctionArgs,
    Form,
    MetaFunction,
    useActionData,
    useLoaderData,
    useNavigate,
    useNavigation,
} from "react-router";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import {
    getCountryAccountsIdFromSession,
    getCountrySettingsFromSession,
    redirectWithMessage,
} from "~/utils/session";
import {
    getUserCountryAccountsByUserIdAndCountryAccountsId,
} from "~/db/queries/userCountryAccountsRepository";
import { UserRepository } from "~/db/queries/UserRepository";


import { htmlTitle } from "~/utils/htmlmeta";
import { AccessManagementService, AccessManagementServiceError } from "~/services/accessManagementService";

type ActionData = {
    errors: string[];
};

export const meta: MetaFunction = () => {


    return [
        {
            title: htmlTitle(
                "Resend invitation email",
            ),
        },
    ];
};

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
    const { request, params } = loaderArgs;
    const { id } = params;

    if (!id) {
        throw new Response("Missing user ID", { status: 404 });
    }

    const countryAccountsId = await getCountryAccountsIdFromSession(request);
    const userCountryAccount =
        await getUserCountryAccountsByUserIdAndCountryAccountsId(
            id,
            countryAccountsId,
        );

    if (!userCountryAccount) {
        throw new Response(
            `User with id: ${id} is not assigned to the current instance.`,
            { status: 404 },
        );
    }

    const user = await UserRepository.getById(id);
    if (!user) {
        throw new Response(`User not found with id: ${id}`, { status: 404 });
    }

    return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: userCountryAccount.role,
    };
});

export const action = authActionWithPerm("EditUsers", async (actionArgs: ActionFunctionArgs) => {

    const { request, params } = actionArgs;
    const { id } = params;

    if (!id) {
        return { errors: ["Missing user ID"] } satisfies ActionData;
    }

    const countryAccountsId = await getCountryAccountsIdFromSession(request);
    const countrySettings = await getCountrySettingsFromSession(request);

    try {
        await AccessManagementService.resendInvitation({
            id,
            countryAccountsId,
            countrySettings,
        });
    } catch (err) {
        if (err instanceof AccessManagementServiceError) {
            return { errors: [err.errors?.[0] || err.message] } satisfies ActionData;
        }

        console.error("Resend invitation failed:", err);
        return {
            errors: [
                "Unexpected error",
            ],
        } satisfies ActionData;
    }

    return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
        type: "success",
        text: "Invitation email sent successfully",
    });
});

export default function ResendInvitationRoute() {
    const ld = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const navigate = useNavigate();


    const isSubmitting = navigation.state === "submitting";
    const error = actionData?.errors?.[0] || null;

    return (
        <Dialog
            visible
            modal
            header={"Resend invitation email"}
            onHide={() => navigate("/settings/access-mgmnt/")}
            className="w-[32rem] max-w-full"
        >
            <Form method="post" className="flex flex-col gap-4">
                <p>
                    {"Resend invitation email"}
                </p>
                <p className="font-medium text-gray-900">{ld.email}</p>
                {error ? <Message severity="error" text={error} /> : null}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        outlined
                        label={"Cancel"}
                        onClick={() => navigate("/settings/access-mgmnt/")}
                    />
                    <Button
                        type="submit"
                        label={"Resend invitation email"}
                        icon="pi pi-envelope"
                        loading={isSubmitting}
                        disabled={isSubmitting || ld.emailVerified}
                    />
                </div>
            </Form>
        </Dialog>
    );
}
