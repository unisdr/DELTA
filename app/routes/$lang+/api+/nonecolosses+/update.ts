import { authLoaderApi, authActionApi } from '~/utils/auth';

import { jsonUpdate } from '~/backend.server/handlers/form/form_api';

import {
    fieldsDefApi,
    nonecoLossesUpdateByIdAndCountryAccountsId,
} from '~/backend.server/models/noneco_losses';
import { ActionFunctionArgs } from 'react-router';
import { apiAuth } from '~/backend.server/models/api_key';
import { BackendContext } from '~/backend.server/context';

export const loader = authLoaderApi(async () => {
    return Response.json('Use POST');
});

export const action = async (args: ActionFunctionArgs) => {
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

    return authActionApi(async (args) => {
        const data = await args.request.json();

        const saveRes = await jsonUpdate({
            ctx,
            data,
            fieldsDef: fieldsDefApi,
            update: nonecoLossesUpdateByIdAndCountryAccountsId,
            countryAccountsId,
        });

        return Response.json(saveRes);
    })(args);
};
