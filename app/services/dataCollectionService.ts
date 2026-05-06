import { BackendContext } from "~/backend.server/context";
import { entityType } from "~/backend.server/models/entity_validation_assignment";
import { approvalStatusIds } from "~/frontend/approval";
import { updateDisasterEventStatusService } from "~/services/disasterEventService";
import { updateDisasterRecordStatusService } from "~/services/disasterRecordService";
import { updateHazardousEventStatusService } from "~/services/hazardousEventService";

/** Shared input contract for all data-collection status update services. */
interface UpdateStatusParams {
	ctx: BackendContext;
	id: string;
	approvalStatus: approvalStatusIds;
	countryAccountsId: string;
	userId: string;
}

/**
 * Service interface returned by {@link dataCollectionService}.
 *
 * Implementations handle entity-specific status transitions while exposing
 * a common call signature for workflow orchestration code.
 */
interface DataCollectionService {
	updateStatus: (params: UpdateStatusParams) => Promise<{
		ok: boolean;
		message: string;
	}>;
}

/**
 * Strategy map from entity type to its concrete status update service.
 *
 * Keep this map aligned with `entityType` values from
 * `entity_validation_assignment`.
 */
const serviceMap: Record<entityType, DataCollectionService> = {
	"disaster_event": {
		updateStatus: updateDisasterEventStatusService,
	},
	"disaster_records": {
		updateStatus: updateDisasterRecordStatusService,
	},
	"hazardous_event": {
		updateStatus: updateHazardousEventStatusService,
	},
};

/**
 * Factory that returns the status update service for a given entity type.
 *
 * Example:
 * `dataCollectionService("disaster_event").updateStatus(params)`
 */
export function dataCollectionService(
	type: entityType,
): DataCollectionService {
	return serviceMap[type];
}
