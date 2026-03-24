import { ActionFunctionArgs } from "react-router";

import { authActionWithPerm } from "~/utils/auth";
import { resetInstanceData } from "~/services/countryAccountService";

type ActionData =
    | { success: true; operation: "reset" }
    | { errors: string[] };

export const action = authActionWithPerm(
    "manage_country_accounts",
    async (actionArgs: ActionFunctionArgs) => {
        const { params } = actionArgs;
        const id = params.id as string;

        try {
            await resetInstanceData(id);
            return { success: true, operation: "reset" } satisfies ActionData;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { errors: [errorMessage] } satisfies ActionData;
        }
    },
);

export default function ResetInstanceRoute() {
    return null;
}
