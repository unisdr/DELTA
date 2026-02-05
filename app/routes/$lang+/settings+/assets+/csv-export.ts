import { assetTable } from '~/drizzle/schema';

import { dr } from '~/db.server';

import { sql, asc, eq, and } from 'drizzle-orm';

import { csvExportLoader } from '~/backend.server/handlers/form/csv_export';
import { getCountryAccountsIdFromSession } from '~/utils/session';
import { BackendContext } from '~/backend.server/context';

export const loader = csvExportLoader({
    table: assetTable,
    fetchData: async (_ctx: BackendContext, request: Request) => {
        // Get the country accounts ID from the session using the request passed from the loader
        const countryAccountsId = await getCountryAccountsIdFromSession(request);

        if (!countryAccountsId) {
            throw new Response('Unauthorized, no selected instance', { status: 401 });
        }

        // Only export assets that belong to the current tenant
        const assets = await dr.query.assetTable.findMany({
            columns: {
                id: true,
                apiImportId: true,
                sectorIds: true,
                nationalId: true,
                isBuiltIn: true,
            },
            extras: {
                // only checking custom, since in where we only getting non built in assets
                name: sql<string>`${assetTable.customName}`.as('name'),
                category: sql<string>`${assetTable.customCategory}`.as('category'),
                notes: sql<string>`${assetTable.customNotes}`.as('notes'),
            },
            orderBy: [asc(assetTable.id)],
            where: and(
                eq(assetTable.countryAccountsId, countryAccountsId),
                eq(assetTable.isBuiltIn, false),
            ),
        });

        return assets;
    },
});
