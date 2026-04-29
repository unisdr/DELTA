import {
    Form,
    redirect,
    useActionData,
    useLoaderData,
    useNavigate,
    useNavigation,
} from "react-router";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";

import { PERMISSIONS } from "~/frontend/user/roles";
import {
    makeDeleteDisasterEventUseCase,
    makeGetDisasterEventByIdUseCase,
} from "~/modules/disaster-event/disaster-event-module.server";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

type ActionData = {
    error?: string;
};

const LOCKED_STATUSES = new Set([
    "submitted",
    "approved",
    "rejected",
    "published",
]);

export const loader = authLoaderWithPerm(
    PERMISSIONS.DISASTER_EVENT_DELETE,
    async ({ request, params }) => {
        const countryAccountsId = await getCountryAccountsIdFromSession(request);
        if (!countryAccountsId) {
            throw new Response("Unauthorized", { status: 401 });
        }
        if (!params.id) {
            throw new Response("ID is required", { status: 400 });
        }

        const item = await makeGetDisasterEventByIdUseCase().execute({
            id: params.id,
            countryAccountsId,
        });

        if (!item) {
            throw new Response("Disaster event not found", { status: 404 });
        }

        if (LOCKED_STATUSES.has(item.workflowStatus)) {
            throw new Response("Disaster event cannot be deleted in current status", {
                status: 403,
            });
        }

        return {
            item,
        };
    },
);

export const action = authActionWithPerm(
    PERMISSIONS.DISASTER_EVENT_DELETE,
    async ({ request, params }) => {
        const countryAccountsId = await getCountryAccountsIdFromSession(request);
        if (!countryAccountsId) {
            throw new Response("Unauthorized", { status: 401 });
        }
        if (!params.id) {
            throw new Response("ID is required", { status: 400 });
        }

        const existing = await makeGetDisasterEventByIdUseCase().execute({
            id: params.id,
            countryAccountsId,
        });
        if (!existing) {
            throw new Response("Disaster event not found", { status: 404 });
        }
        if (LOCKED_STATUSES.has(existing.workflowStatus)) {
            throw new Response("Disaster event cannot be deleted in current status", {
                status: 403,
            });
        }

        const result = await makeDeleteDisasterEventUseCase().execute({
            id: params.id,
            countryAccountsId,
        });
        if (!result.ok) {
            return {
                error: result.error,
            } satisfies ActionData;
        }

        return redirect("/disaster-event");
    },
);

export default function DisasterEventDeleteRoute() {
    const { item } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const navigate = useNavigate();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Dialog
            header={"Delete disaster event"}
            visible
            modal
            onHide={() => navigate("/disaster-event")}
            className="w-[32rem] max-w-full"
        >
            <Form method="post" className="flex flex-col" noValidate>
                <p className="mb-3">
                    Delete disaster event "{item.nameNational || item.nationalDisasterId || item.id}"?
                </p>

                {actionData?.error ? (
                    <Message severity="error" text={actionData.error} className="mb-3" />
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        type="button"
                        outlined
                        icon="pi pi-times"
                        label="No"
                        onClick={() => navigate("/disaster-event")}
                    />
                    <Button
                        type="submit"
                        label="Yes"
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
