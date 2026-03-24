import { eq } from "drizzle-orm";
import { ActionFunctionArgs } from "react-router";

import { dr } from "~/db.server";
import { countriesTable } from "~/drizzle/schema/countriesTable";
import { authActionWithPerm } from "~/utils/auth";

type ActionData =
    | { success: true; operation: "delete" }
    | { errors: string[] };

function isForeignKeyDeleteViolation(error: unknown): boolean {
    if (!error || typeof error !== "object") {
        return false;
    }

    const err = error as {
        code?: string;
        message?: string;
        cause?: { code?: string; message?: string };
    };

    if (err.code === "23503" || err.cause?.code === "23503") {
        return true;
    }

    const message = `${err.message ?? ""} ${err.cause?.message ?? ""}`.toLowerCase();
    return message.includes("foreign key") || message.includes("violates");
}

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
            if (isForeignKeyDeleteViolation(error)) {
                return {
                    errors: [
                        "This fictitious country cannot be deleted because it is used by other records.",
                    ],
                } satisfies ActionData;
            }

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
