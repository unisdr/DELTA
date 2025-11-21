import {
  fieldsDefApi
} from "~/backend.server/models/asset";

import {
  authLoaderApiDocs,
} from "~/util/auth";
import {
  jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";
import { BackendContext } from "~/backend.server/context";

export let loader = authLoaderApiDocs(async (requestArgs) => {
	const ctx = new BackendContext(requestArgs);
  let docs = await jsonApiDocs({
		ctx,
    baseUrl: "asset",
    fieldsDef: await fieldsDefApi(),
  });

  return new Response(docs, {
    status: 200,
    headers: {"Content-Type": "text/plain"}
  });
});

