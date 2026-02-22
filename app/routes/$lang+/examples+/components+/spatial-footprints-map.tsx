import { useLoaderData } from "react-router";
import { dr } from "~/db.server";
import { sql, eq } from "drizzle-orm";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { lossesTable } from "~/drizzle/schema/lossesTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";
import SpatialFootprintMapViewer from "~/components/SpatialFootprintMapViewer";
import { ViewContext } from "~/frontend/context";

import { authLoaderWithPerm } from "~/utils/auth";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	// disable example for now, since it allows getting disaster id from any user
	throw new Response("Unauthorized", { status: 401 });

	const { request } = loaderArgs;

	const url = new URL(request.url);
	const disasterId =
		url.searchParams.get("disasterId") ||
		"f27095d8-b49a-4f87-8380-e15526b5fefb";

	const disasterRecord = await dr
		.select({
			disaster_id: disasterRecordsTable.id,
			disaster_spatial_footprint: disasterRecordsTable.spatialFootprint,
			disruptions: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${disruptionTable.id},
              'spatial_footprint', ${disruptionTable.spatialFootprint}
            )
          ) FILTER (WHERE ${disruptionTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("disruptions"),
			losses: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${lossesTable.id},
              'spatial_footprint', ${lossesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${lossesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("losses"),
			damages: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${damagesTable.id},
              'spatial_footprint', ${damagesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${damagesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("damages"),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			disruptionTable,
			eq(disasterRecordsTable.id, disruptionTable.recordId),
		)
		.leftJoin(lossesTable, eq(disasterRecordsTable.id, lossesTable.recordId))
		.leftJoin(damagesTable, eq(disasterRecordsTable.id, damagesTable.recordId))
		.where(eq(disasterRecordsTable.id, disasterId))
		.groupBy(disasterRecordsTable.id, disasterRecordsTable.spatialFootprint);

	return {
		disasterRecord,
	};
});

export default function MapPage() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { disasterRecord } = ld;

	return (
		<div>
			<SpatialFootprintMapViewer ctx={ctx} dataSource={disasterRecord} />
		</div>
	);
}
