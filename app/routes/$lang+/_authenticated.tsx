import { Outlet } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/utils/auth";
import type { UserSession } from "~/utils/session";

// Centralises auth enforcement so child routes do not need to duplicate it — Strangler Fig migration.
// Does not validate countryAccountsId: some authenticated routes (e.g. select-instance) don't need it.
export type AuthenticatedLayoutData = {
	userSession: UserSession;
};

export async function loader(args: LoaderFunctionArgs) {
	const userSession = await requireUser({ request: args.request, params: args.params });
	return Response.json({ userSession } satisfies AuthenticatedLayoutData);
}

export default function AuthenticatedLayout() {
	return <Outlet />;
}
