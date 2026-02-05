/**
 * Disaster event Tags and Sectors API
 *
 * This endpoint provides access to sector data used for tagging disaster events.
 *
 * IMPORTANT: This is a multitenant-safe endpoint as sectors are shared across all tenants.
 * The sector table does not include tenant isolation (no countryAccountsId column)
 * because sector definitions are standardized across the system and not tenant-specific.
 */

import { BackendContext } from '~/backend.server/context';
import { getSectorsByLevel } from '~/backend.server/models/sector';

import { authLoaderApiDocs } from '~/utils/auth';

export let loader = authLoaderApiDocs(async (args) => {
    const ctx = new BackendContext(args);
    let records = await getSectorsByLevel(ctx, 2);

    return new Response(JSON.stringify(records), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
});
