import { disasterRecordsTable } from '~/drizzle/schema';

import { dr } from '~/db.server';

import { asc, eq } from 'drizzle-orm';

import { csvExportLoader } from '~/backend.server/handlers/form/csv_export';

import { authLoaderWithPerm, authLoaderGetAuth } from '~/util/auth';
import { getCountryAccountsIdFromSession } from '~/util/session';

export const loader = authLoaderWithPerm('EditData', async (loaderArgs) => {
    const { request } = loaderArgs;
    // Extract tenant context from session
    const userSession = authLoaderGetAuth(loaderArgs);
    if (!userSession) {
        throw new Response('Unauthorized', { status: 401 });
    }

    const countryAccountsId = await getCountryAccountsIdFromSession(request);

    // Create tenant-aware data fetcher
    const fetchDataWithTenant = async () => {
        return dr.query.disasterRecordsTable.findMany({
            where: eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
            orderBy: [asc(disasterRecordsTable.id)],
        });
    };

    // Use csvExportLoader with tenant-aware data fetcher
    const exportLoader = csvExportLoader({
        table: disasterRecordsTable,
        fetchData: fetchDataWithTenant,
    });

    return exportLoader(loaderArgs);
});
