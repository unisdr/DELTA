import {
	getCountryAccountsIdFromSession,
	getUserRoleFromSession,
} from "~/utils/session";
import { canEditDataCollectionRecord } from "~/frontend/user/roles";
import { DisasterRecordsRepository } from "~/db/queries/disasterRecordsRepository";

export type DisasterRecord = NonNullable<
	Awaited<ReturnType<typeof DisasterRecordsRepository.getByIdAndCountryAccountsId>>
>[number];

export async function requireDisasterRecordAccess(
	request: Request,
	recordId: string | undefined,
	onMissingCountryAccount: () => Response,
): Promise<{
	countryAccountsId: string;
	disasterRecord: DisasterRecord;
}> {
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw onMissingCountryAccount();
	}

	const disasterRecords = await DisasterRecordsRepository.getByIdAndCountryAccountsId(
		recordId ?? "",
		countryAccountsId,
	);
	const disasterRecord = disasterRecords?.[0];

	if (!disasterRecord) {
		throw new Response("Not found", { status: 404 });
	}

	const userRole = await getUserRoleFromSession(request) as string;
	if (canEditDataCollectionRecord(userRole, disasterRecord.approvalStatus) === false) {
		throw new Response("Access forbidden", { status: 403 });
	}

	return {
		countryAccountsId,
		disasterRecord,
	};
}