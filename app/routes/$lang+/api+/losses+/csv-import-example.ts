import { createExampleLoader } from "~/backend.server/handlers/form/csv_import"

import { createFieldsDefApi } from "~/backend.server/models/losses"

export const loader = createExampleLoader({
	fieldsDef: async (_ctx) => createFieldsDefApi(["USD"])
})

