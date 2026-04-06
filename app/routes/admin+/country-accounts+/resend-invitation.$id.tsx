import {
    ActionFunctionArgs,
    Form,
    useActionData,
    useLoaderData,
    useNavigate,
    useNavigation,
} from "react-router";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";


import { redirectWithMessage } from "~/utils/session";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import {
    CountryAccountService,
    CountryAccountValidationError,
} from "~/services/countryAccountService";

type ActionData = { errors: string[] };

export const loader = authLoaderWithPerm(
    "EditCountryAccount",
    async (loaderArgs) => {
        const id = loaderArgs.params.id as string;
        const countryAccount =
            await CountryAccountsRepository.getByIdWithCountryAndPrimaryAdminUser(id);

        if (!countryAccount) {
            throw new Response("Not Found", { status: 404 });
        }

        const adminUser = countryAccount.userCountryAccounts[0]?.user;
        if (!adminUser) {
            throw new Response("Not Found", { status: 404 });
        }

        return { countryAccount, adminUser };
    },
);

export const action = authActionWithPerm(
    "EditCountryAccount",
    async (actionArgs: ActionFunctionArgs) => {
        const id = actionArgs.params.id as string;


        try {
            await CountryAccountService.resendInvitation(id);

            return redirectWithMessage(actionArgs, "/admin/country-accounts", {
                type: "success",
                text: "Invitation email sent successfully",
            });
        } catch (error) {
            if (error instanceof CountryAccountValidationError) {
                return { errors: error.errors } satisfies ActionData;
            }

            return {
                errors: [
                    "An unexpected error occurred",
                ],
            } satisfies ActionData;
        }
    },
);

export default function ResendInvitationRoute() {
    const ld = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const navigate = useNavigate();


    const isSubmitting = navigation.state === "submitting";
    const error = actionData?.errors?.[0] || null;

    const handleClose = () => {
        navigate({
            pathname: "/admin/country-accounts",
            search: window.location.search,
        });
    };

    return (
        <Dialog
            visible
            onHide={handleClose}
            header={"Resend invitation email"}
            modal
            pt={{ footer: { className: "px-6 pt-0 pb-4" } }}
            className="w-full max-w-3xl"
            draggable={false}
            resizable={false}
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        label={"Cancel"}
                        icon="pi pi-times"
                        onClick={handleClose}
                        outlined
                    />
                    <Button
                        type="submit"
                        form="resendInvitationForm"
                        label={"Resend invitation email"}
                        icon="pi pi-envelope"
                        loading={isSubmitting}
                    />
                </div>
            }
        >
            <Form method="post" id="resendInvitationForm" className="space-y-4">
                <p>
                    {"Do you want to resend the invitation email to the primary admin?"}
                </p>
                <p className="font-semibold">{ld.adminUser.email}</p>
                {error ? <Message severity="error" text={error} /> : null}
            </Form>
        </Dialog>
    );
}
