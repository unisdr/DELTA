import { DeleteResult } from "~/backend.server/handlers/form/form";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { eventRelationshipTable } from "~/drizzle/schema/eventRelationshipTable";
import { dr } from "~/db.server";
import { eq, and } from "drizzle-orm";
import type { BackendContext } from "../../context";

export async function hazardousEventDelete(
	ctx: BackendContext,
	id: string,
	countryAccountsId: string,
): Promise<DeleteResult> {
	try {
		// First check if there are any disaster events linked to this hazard event
		const linkedDisasterEvents = await dr
			.select()
			.from(disasterEventTable)
			.where(and(eq(disasterEventTable.hazardousEventId, id)));

		if (linkedDisasterEvents.length > 0) {
			return {
				ok: false,
				error: ctx.t({
					code: "hazardous_event.cannot_delete_linked_to_disaster",
					msg: "Cannot delete hazard event because it is linked to one or more disaster events. Please delete the associated disaster events first.",
				}),
			};
		}

		const whereClause = and(
			eq(hazardousEventTable.id, id),
			eq(hazardousEventTable.countryAccountsId, countryAccountsId),
		);

		// Check if the record exists before deleting
		const [existingRecord] = await dr
			.select()
			.from(hazardousEventTable)
			.where(whereClause);

		if (!existingRecord && countryAccountsId) {
			return {
				ok: false,
				error: "Record not found or access denied",
			};
		}

		await dr.transaction(async (tx) => {
			await tx
				.delete(hazardousEventTable)
				.where(and(eq(hazardousEventTable.id, id)));

			await tx
				.delete(eventRelationshipTable)
				.where(eq(eventRelationshipTable.childId, String(id)));

			await tx.delete(eventTable).where(eq(eventTable.id, String(id)));
		});
	} catch (error: any) {
		if (
			error?.code === "23503" &&
			error?.message.includes("event_relationship_parent_id_event_id_fk")
		) {
			return {
				ok: false,
				error: ctx.t({
					code: "hazardous_event.delete_cause_events_first",
					msg: "Delete events that are caused by this event first",
				}),
			};
		} else {
			throw error;
		}
	}
	return { ok: true };
}


