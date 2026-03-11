import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { sectorDisasterRecordsRelationTable } from "~/drizzle/schema";

export const SectorDisasterRecordsRelationRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(sectorDisasterRecordsRelationTable)
			.where(eq(sectorDisasterRecordsRelationTable.id, id));
	},

	deleteByRecordId: (recordId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(sectorDisasterRecordsRelationTable)
			.where(eq(sectorDisasterRecordsRelationTable.disasterRecordId, recordId));
	},
	getByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(sectorDisasterRecordsRelationTable)
			.where(
				inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds),
			);
	},
	deleteByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(sectorDisasterRecordsRelationTable)
			.where(
				inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds),
			);
	},
};
