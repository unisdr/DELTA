import { organizationTable } from '~/drizzle/schema';

import { dr } from '~/db.server';

import { executeQueryForPagination3, OffsetLimit } from '~/frontend/pagination/api.server';

import { and, asc, or, ilike, sql, eq } from 'drizzle-orm';

import { LoaderFunctionArgs } from 'react-router';
import { stringToBoolean } from '~/utils/string';
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from '~/utils/session';
import { getCommonData } from './commondata';

interface organizationLoaderArgs {
    loaderArgs: LoaderFunctionArgs;
}

export async function organizationLoader(args: organizationLoaderArgs) {
    const { loaderArgs } = args;
    const { request } = loaderArgs;
    const countryAccountsId = await getCountryAccountsIdFromSession(request);

    if (!countryAccountsId) {
        throw new Response('Unauthorized, no selected instance', { status: 401 });
    }

    let instanceName = 'DELTA Resilience';

    if (countryAccountsId) {
        const settings = await getCountrySettingsFromSession(request);
        instanceName = settings.websiteName;
    }

    const url = new URL(request.url);
    const extraParams = ['search', 'builtIn'];
    const rawBuiltIn = url.searchParams.get('builtIn');

    const filters: {
        search: string;
        builtIn?: boolean;
    } = {
        search: url.searchParams.get('search') || '',
        builtIn: rawBuiltIn === '' || rawBuiltIn == null ? undefined : stringToBoolean(rawBuiltIn),
    };

    filters.search = filters.search.trim();
    let searchIlike = '%' + filters.search + '%';

    // Build tenant filter based on builtIn selection
    let tenantCondition;

    // Show ALL organizations: both built-in AND instance-owned
    tenantCondition = or(eq(organizationTable.countryAccountsId, countryAccountsId));

    // Build search condition
    let searchCondition =
        filters.search !== ''
            ? or(
                  sql`${organizationTable.id}::text ILIKE ${searchIlike}`,
                  ilike(organizationTable.name, searchIlike),
              )
            : undefined;

    // Combine conditions
    let condition = and(tenantCondition, searchCondition);

    const count = await dr.$count(organizationTable, condition);
    const events = async (offsetLimit: OffsetLimit) => {
        return await dr.query.organizationTable.findMany({
            ...offsetLimit,
            columns: {
                id: true,
                name: true,
            },
            extras: {},
            orderBy: [asc(organizationTable.name)],
            where: condition,
        });
    };

    const res = await executeQueryForPagination3(request, count, events, extraParams);

    return {
        common: await getCommonData(args.loaderArgs),
        filters,
        data: res,
        instanceName,
    };
}
