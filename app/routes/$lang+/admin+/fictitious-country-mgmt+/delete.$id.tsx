import {
    ActionFunctionArgs,
    Form,
    useActionData,
    useLoaderData,
    useNavigate,
    useNavigation,
} from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";

import { BackendContext } from "~/backend.server/context";
import { ViewContext } from "~/frontend/context";
import {
    deleteFictitiousCountry,
    FictitiousCountryNotFoundError,
    FictitiousCountryValidationError,
    getFictitiousCountryById,
} from "~/services/fictitiousCountryService";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { redirectWithMessage } from "~/utils/session";

type ActionData =
    | { errors: string[] };

export const loader = authLoaderWithPerm(
    "DeleteFictitiousCountry",
    async (loaderArgs) => {
        const id = loaderArgs.params.id!;
        const country = await getFictitiousCountryById(id);
        if (!country) {
            throw new Response("Not Found", { status: 404 });
        }

        return { country };
    },
);

export const action = authActionWithPerm(
    "DeleteFictitiousCountry",
    async (actionArgs: ActionFunctionArgs) => {
        const id = actionArgs.params.id!;
        const backendCtx = new BackendContext(actionArgs);

        try {
            await deleteFictitiousCountry(id);

            return redirectWithMessage(actionArgs, "/admin/fictitious-country-mgmt", {
                type: "success",
                text: backendCtx.t({
                    code: "admin.fictitious_country_deleted",
                    msg: "Fictitious country deleted successfully",
                }),
            });
        } catch (error) {
            if (error instanceof FictitiousCountryNotFoundError) {
                return { errors: ["Fictitious country not found"] } satisfies ActionData;
            }
            if (error instanceof FictitiousCountryValidationError) {
                return { errors: error.errors } satisfies ActionData;
            }
            return { errors: ["An unexpected error occurred"] } satisfies ActionData;
        }
    },
);

export default function FictitiousCountryDeletePage() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const navigate = useNavigate();
    const isSubmitting = navigation.state === "submitting";
    const error = actionData?.errors?.[0] ?? "";

    return (
        <Dialog
            header={ctx.t({ code: "common.record_deletion", msg: "Record Deletion" })}
            visible
            modal
            onHide={() => navigate(ctx.url("/admin/fictitious-country-mgmt"))}
            className="w-[32rem] max-w-full"
        >
            <Form method="post" className="flex flex-col" noValidate>
                <p className="mb-3">
                    {ctx.t({
                        code: "admin.fictitious_country_delete_confirm",
                        msg: `Delete fictitious country "${ld.country.name}"?`,
                    })}
                </p>

                {error ? <Message severity="error" text={error} className="mb-3" /> : null}

                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        type="button"
                        outlined
                        icon="pi pi-times"
                        label={ctx.t({ code: "common.no", msg: "No" })}
                        onClick={() => navigate(ctx.url("/admin/fictitious-country-mgmt"))}
                    />
                    <Button
                        type="submit"
                        label={ctx.t({ code: "common.yes", msg: "Yes" })}
                        icon="pi pi-trash"
                        severity="danger"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    />
                </div>
            </Form>
        </Dialog>
    );
}
