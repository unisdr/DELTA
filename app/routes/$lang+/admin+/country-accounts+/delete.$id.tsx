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
import { deleteInstance } from "~/services/countryAccountService";
import { BackendContext } from "~/backend.server/context";
import { ViewContext } from "~/frontend/context";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { redirectWithMessage } from "~/utils/session";

type ActionData = { errors: string[] };

export const loader = authLoaderWithPerm(
    "DeleteCountryAccount",
    async (loaderArgs) => {
        const id = loaderArgs.params.id as string;
        const countryAccount = await CountryAccountsRepository.getByIdWithCountry(id);

        if (!countryAccount) {
            throw new Response("Not Found", { status: 404 });
        }

        return { countryAccount };
    },
);

export const action = authActionWithPerm(
    "DeleteCountryAccount",
    async (actionArgs: ActionFunctionArgs) => {
        const { params } = actionArgs;
        const id = params.id as string;
        const ctx = new BackendContext(actionArgs);

        try {
            await deleteInstance(id);
            return redirectWithMessage(actionArgs, "/admin/country-accounts", {
                type: "success",
                text: ctx.t({
                    code: "admin.instance_deleted",
                    msg: "Instance has been deleted successfully",
                }),
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { errors: [errorMessage] } satisfies ActionData;
        }
    },
);

export default function DeleteInstanceRoute() {
    const ld = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const navigate = useNavigate();
    const ctx = new ViewContext();

    const isSubmitting = navigation.state === "submitting";
    const error = actionData?.errors?.[0] || null;

    const handleClose = () => {
        navigate({
            pathname: ctx.url("/admin/country-accounts"),
            search: window.location.search,
        });
    };

    return (
        <Dialog
            visible
            onHide={handleClose}
            header={ctx.t({
                code: "admin.delete_instance_confirm_header",
                msg: "Delete Instance",
            })}
            modal
            pt={{ footer: { className: "px-6 pt-0 pb-4" } }}
            className="w-full max-w-3xl"
            draggable={false}
            resizable={false}
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        label={ctx.t({ code: "common.no", msg: "No" })}
                        icon="pi pi-times"
                        onClick={handleClose}
                        outlined
                    />
                    <Button
                        type="submit"
                        form="deleteCountryAccountForm"
                        label={ctx.t({ code: "common.yes", msg: "Yes" })}
                        icon="pi pi-trash"
                        severity="danger"
                        loading={isSubmitting}
                    />
                </div>
            }
        >
            <Form method="post" id="deleteCountryAccountForm" className="space-y-4">
                <p>
                    {ctx.t({
                        code: "admin.delete_instance_confirm_message",
                        msg: "Are you sure you want to delete this instance? This action cannot be undone.",
                    })}
                </p>
                <p className="font-semibold">{ld.countryAccount.country.name} - {ld.countryAccount.shortDescription}</p>
                {error ? <Message severity="error" text={error} /> : null}
            </Form>
        </Dialog>
    );
}