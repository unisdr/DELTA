import { authLoaderApi } from "~/util/auth";
// import { jsonCreate } from "~/backend.server/handlers/form/form_api";
import { disasterRecordsDeleteById } from "~/backend.server/models/disaster_record";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";
import { isValidUUID } from "~/util/id";

export const loader = authLoaderApi(async () => {
	return Response.json("Use DELETE");
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const id = args.params.id as string;
	
	if (request.method !== "DELETE") {
		throw new Response("Method Not Allowed: Only DELETE requests are supported", {
			status: 405,
		});
	}
	if (!id || !isValidUUID(id)) {
    	throw new Response("Invalid ID", { status: 400 });
  	}

	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	// TODO: replace with transaction follow jsonCreate pattern
	// TODO: fix deletion of child records, right now it gives an error if there are clients 
	// linked to the disaster record
	const deleteRes = await disasterRecordsDeleteById(id, countryAccountsId);

	return Response.json(deleteRes);
};
