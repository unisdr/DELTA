import {
	fieldsDefApi
} from "~/frontend/disaster-record/form";

import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const ctx = new BackendContext(requestArgs);

	let docs = await jsonApiDocs({
		ctx,
		baseUrl: "disaster-record",
		fieldsDef: fieldsDefApi(ctx),
	})

	// Add delete documentation
	docs += `
## Delete Disaster Record

**Endpoint:** \`DELETE /api/disaster-record/delete/:id\`

Deletes a disaster record by its unique identifier.

**Parameters:**
- \`id\` (path parameter): The UUID of the disaster record to be deleted.

**Responses:**
- \`200 OK\`: The disaster record was successfully deleted.
- \`401 Unauthorized\`: Unauthorized.
- \`404 Not Found\`: Record not found or you don't have permission to delete it.

**Example Request:**
export DTS_KEY=YOUR_KEY
curl -X DELETE -H "X-Auth:$DTS_KEY" ${ctx.fullUrl("api/disaster-record/delete/{record_id}")}

**Example Response:**
\`\`\`json
{
  "ok": true
}

{
  "ok": false,
  "message": "Record not found or you don't have permission to delete it."
}
\`\`\`
`;

	

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
