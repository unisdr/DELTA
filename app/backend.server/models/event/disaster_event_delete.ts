
import { DeleteResult } from "~/backend.server/handlers/form/form";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { dr } from "~/db.server";
import { eq, and } from "drizzle-orm";
import type { BackendContext } from "../../context";

export async function disasterEventDelete(
	ctx: BackendContext,
	id: string,
	countryAccountsId: string,
): Promise<DeleteResult> {
	// Verify the event belongs to the tenant before deleting
	const event = await dr
		.select({ id: disasterEventTable.id })
		.from(disasterEventTable)
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterEventTable.countryAccountsId, countryAccountsId),
			),
		);

	if (event.length === 0) {
		return {
			ok: false,
			error: ctx.t({
				code: "disaster_event.no_permission_delete",
				msg: "You don't have permission to delete this disaster event",
			}),
		};
	}

	await dr.transaction(async (tx) => {
		await tx
			.delete(disasterEventTable)
			.where(
				and(
					eq(disasterEventTable.id, id),
					eq(disasterEventTable.countryAccountsId, countryAccountsId),
				),
			);

		await tx.delete(eventTable).where(eq(eventTable.id, id));
	});
	return { ok: true };
}

