import { authLoaderApi } from '~/utils/auth';

import { fieldsDefApi } from '~/frontend/events/disastereventform';

import { jsonCreate } from '~/backend.server/handlers/form/form_api';
import { disasterEventCreate } from '~/backend.server/models/event';
import { ActionFunction, ActionFunctionArgs } from 'react-router';
import { apiAuth } from '~/backend.server/models/api_key';
import { SelectDisasterEvent } from '~/drizzle/schema';
import { BackendContext } from '~/backend.server/context';

export const loader = authLoaderApi(async () => {
    return Response.json('Use POST');
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
    const ctx = new BackendContext(args);
    const { request } = args;
    if (request.method !== 'POST') {
        throw new Response('Method Not Allowed: Only POST requests are supported', {
            status: 405,
        });
    }

    const apiKey = await apiAuth(request);
    const countryAccountsId = apiKey.countryAccountsId;
    if (!countryAccountsId) {
        throw new Response('Unauthorized', { status: 401 });
    }

    let data: SelectDisasterEvent[] = await request.json();
    data = data.map((item) => ({
        ...item,
        countryAccountsId: countryAccountsId,
    }));

    // Create wrapper function that includes tenant context
    const createWithTenant = (tx: any, data: any) => {
        return disasterEventCreate(ctx, tx, data);
    };

    const saveRes = await jsonCreate({
        ctx,
        data,
        fieldsDef: fieldsDefApi(ctx),
        create: createWithTenant,
        countryAccountsId: countryAccountsId,
    });

    return Response.json(saveRes);
};
