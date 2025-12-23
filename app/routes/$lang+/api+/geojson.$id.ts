import { dr } from '~/db.server';
import { authLoaderPublicOrWithPerm } from '~/util/auth';

export const loader = authLoaderPublicOrWithPerm('ViewData', async ({ params }) => {
    const id = params.id;
    if (!id) {
        throw new Response('Missing ID', { status: 400 });
    }
    const result = await dr.query.divisionTable.findFirst({
        where: (divisionTable, { eq }) => eq(divisionTable.id, id),
    });

    if (!result?.geojson) {
        throw new Response('GeoJSON not found', { status: 404 });
    }

    return Response.json({ geojson: result.geojson });
});
