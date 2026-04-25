import { redirect } from "react-router";

import { PERMISSIONS } from "~/frontend/user/roles";
import { makeDeleteDisasterEventUseCase } from "~/modules/disaster-event/disaster-event-module.server";
import { authActionWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

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

        const result = await makeDeleteDisasterEventUseCase().execute({
            id: params.id,
            countryAccountsId,
        });
        if (!result.ok) {
            throw new Response(result.error, { status: 400 });
        }

        return redirect("/disaster-event");
    },
);
