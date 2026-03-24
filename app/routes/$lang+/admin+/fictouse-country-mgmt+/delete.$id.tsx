import { eq } from "drizzle-orm";
import { ActionFunctionArgs } from "react-router";

import { dr } from "~/db.server";
import { countriesTable } from "~/drizzle/schema/countriesTable";
import { authActionWithPerm } from "~/utils/auth";

type ActionData =
    | { success: true; operation: "delete" }
    | { errors: string[] };

export const action = authActionWithPerm(
    "manage_country_accounts",
    async (actionArgs: ActionFunctionArgs) => {
        const id = actionArgs.params.id!;

        try {
            const existing = await dr
                .select({ id: countriesTable.id, type: countriesTable.type })
                .from(countriesTable)
                .where(eq(countriesTable.id, id))
                .limit(1);

            if (!existing[0] || existing[0].type !== "Fictional") {
                return { errors: ["Fictitious country not found"] } satisfies ActionData;
            }

            await dr.delete(countriesTable).where(eq(countriesTable.id, id));

            return { success: true, operation: "delete" } satisfies ActionData;
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "An unexpected error occurred";
            return { errors: [message] } satisfies ActionData;
        }
    },
);

export default function FictitiousCountryDeletePage() {
    return null;
}
