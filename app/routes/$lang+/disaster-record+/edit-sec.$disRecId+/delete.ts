import { authLoaderWithPerm } from "~/utils/auth";

import {
	disRecSectorsById,
	deleteRecordsDeleteById,
} from "~/backend.server/models/disaster_record__sectors";

import { disruptionDeleteBySectorId } from "~/backend.server/models/disruption";
import { damagesDeleteBySectorId } from "~/backend.server/models/damages";
import { lossesDeleteBySectorId } from "~/backend.server/models/losses";

import { redirectLangFromRoute } from "~/utils/url.backend";

import { disasterRecordsById } from "~/backend.server/models/disaster_record";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const { params } = actionArgs;
	const req = actionArgs.request;
	const countryAccountsId = await getCountryAccountsIdFromSession(
		actionArgs.request,
	);

	// Parse the request URL
	const parsedUrl = new URL(req.url);

	// Extract query string parameters
	const queryParams = parsedUrl.searchParams;
	const disasterRecordId = params.disRecId || "";
	const xId = queryParams.get("id") || "";

	const disasterRecord = await disasterRecordsById(disasterRecordId).catch(
		console.error,
	);
	if (!disasterRecord) {
		return Response.json({}, { status: 404 });
	}
	// Tenant countryAccountsId check vs record's countryAccountsId
	if (countryAccountsId !== disasterRecord.countryAccountsId) {
		return Response.json({}, { status: 401 });
	}

	const record = await disRecSectorsById(xId).catch(console.error);

	if (record) {
		if (record.disasterRecordId !== disasterRecord.id) {
			return Response.json({}, { status: 401 });
		}

		try {
			// Delete damages by sector id
			await damagesDeleteBySectorId(record.sectorId).catch(console.error);

			// Delete disruptions by sector id
			await disruptionDeleteBySectorId(record.sectorId).catch(console.error);

			// Delete losses by sector id
			await lossesDeleteBySectorId(record.sectorId).catch(console.error);

			// Delete disaster record sector relation
			await deleteRecordsDeleteById(xId).catch(console.error);

			return redirectLangFromRoute(
				actionArgs,
				"/disaster-record/edit/" + params.disRecId,
			);
		} catch (e) {
			console.log(e);
			throw e;
		}
	} else {
		return Response.json({}, { status: 404 });
	}
});
