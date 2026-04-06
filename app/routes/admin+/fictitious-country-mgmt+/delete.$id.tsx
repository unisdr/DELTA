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


import {
    FictitiousCountryNotFoundError,
    FictitiousCountryService,
    FictitiousCountryValidationError,
} from "~/services/fictitiousCountryService";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { redirectWithMessage } from "~/utils/session";

type ActionData =
    | { errors: string[] };

export const loader = authLoaderWithPerm(
    "DeleteFictitiousCountry",
    async (loaderArgs) => {
        const id = loaderArgs.params.id!;
        const country = await FictitiousCountryService.getById(id);
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

        try {
            await FictitiousCountryService.delete(id);

            return redirectWithMessage(actionArgs, "/admin/fictitious-country-mgmt", {
                type: "success",
                text: "Fictitious country deleted successfully",
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

    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const navigate = useNavigate();
    const isSubmitting = navigation.state === "submitting";
    const error = actionData?.errors?.[0] ?? "";

    return (
        <Dialog
            header={"Record Deletion"}
            visible
            modal
            onHide={() => navigate("/admin/fictitious-country-mgmt")}
            className="w-[32rem] max-w-full"
        >
            <Form method="post" className="flex flex-col" noValidate>
                <p className="mb-3">
                    {`Delete fictitious country "${ld.country.name}"?`}
                </p>

                {error ? <Message severity="error" text={error} className="mb-3" /> : null}

                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        type="button"
                        outlined
                        icon="pi pi-times"
                        label={"No"}
                        onClick={() => navigate("/admin/fictitious-country-mgmt")}
                    />
                    <Button
                        type="submit"
                        label={"Yes"}
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
