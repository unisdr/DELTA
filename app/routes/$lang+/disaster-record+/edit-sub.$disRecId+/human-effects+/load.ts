import { authLoaderWithPerm } from '~/utils/auth';

import { loadData } from '~/backend.server/handlers/human_effects';
import { LoaderFunctionArgs } from 'react-router';
import { getCountryAccountsIdFromSession } from '~/utils/session';
import { BackendContext } from '~/backend.server/context';

export const loader = async (args: LoaderFunctionArgs) => {
    const { request } = args;
    const countryAccountsId = await getCountryAccountsIdFromSession(request);

    if (!countryAccountsId) {
        throw new Response('Unauthorized', { status: 401 });
    }

    return authLoaderWithPerm('EditData', async (actionArgs) => {
        const ctx = new BackendContext(actionArgs);
        const { params, request } = actionArgs;
        let recordId = params.disRecId;
        let url = new URL(request.url);
        let tblStr = url.searchParams.get('tbl') || '';
        let res = await loadData(ctx, recordId, tblStr, countryAccountsId);
        return Response.json(res);
    })(args);
};
