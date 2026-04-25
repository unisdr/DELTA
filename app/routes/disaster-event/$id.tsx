import { useLoaderData } from "react-router";

import { PERMISSIONS } from "~/frontend/user/roles";
import { makeGetDisasterEventByIdUseCase } from "~/modules/disaster-event/disaster-event-module.server";
import DisasterEventDetailsPage from "~/modules/disaster-event/presentation/disaster-event-details-page";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderPublicOrWithPerm(
    PERMISSIONS.DISASTER_EVENT_LIST,
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

        return { item };
    },
);

export default function DisasterEventViewRoute() {
    const { item } = useLoaderData<typeof loader>();
    return <DisasterEventDetailsPage item={item} />;
}
