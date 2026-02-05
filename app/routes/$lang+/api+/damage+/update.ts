import { authLoaderApi, authActionApi } from '~/utils/auth';

import {
    damagesUpdateByIdAndCountryAccountsId,
    fieldsDefApi,
} from '~/backend.server/models/damages';

import { jsonUpdate } from '~/backend.server/handlers/form/form_api';
import { ActionFunctionArgs } from 'react-router';
import { apiAuth } from '~/backend.server/models/api_key';
import { getInstanceSystemSettingsByCountryAccountId } from '~/db/queries/instanceSystemSetting';
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
        const settings = await getInstanceSystemSettingsByCountryAccountId(countryAccountsId);
        if (!settings) {
            throw new Response('No settings found for country account', { status: 501 });
        }

        const saveRes = await jsonUpdate({
            ctx,
            data,
            fieldsDef: await fieldsDefApi(ctx, [settings.currencyCode]),
            update: damagesUpdateByIdAndCountryAccountsId,
            countryAccountsId,
            tableName: 'damages',
        });

        return Response.json(saveRes);
    })(args);
};
