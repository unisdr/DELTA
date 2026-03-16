import { BackendContext } from "~/backend.server/context";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { dr } from "~/db.server";

interface GetOrganizationsPageDataArgs {
	request: Request;
	countryAccountsId: string;
}

interface OrganizationActionServiceArgs {
	backendCtx: BackendContext;
	countryAccountsId: string;
	formData: FormData;
}

export type OrganizationActionResult =
	| {
			ok: true;
			intent: "create" | "update" | "delete";
	  }
	| {
			ok: false;
			error: string;
	  };

export const OrganizationService = {
	async getOrganizationsPageData({
		request,
		countryAccountsId,
	}: GetOrganizationsPageDataArgs) {
		const url = new URL(request.url);
		const pageRaw = parseInt(url.searchParams.get("page") || "1", 10);
		const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "50", 10);
		const page = Math.max(1, isNaN(pageRaw) ? 1 : pageRaw);
		const pageSize = Math.max(1, isNaN(pageSizeRaw) ? 50 : pageSizeRaw);
		const search = (url.searchParams.get("search") || "").trim();
		const filters = { search };

		const data = await OrganizationRepository.listByCountryAccountsId({
			countryAccountsId,
			search,
			pagination: {
				page,
				pageSize,
			},
		});

		return {
			filters,
			data,
		};
	},

	async organizationAction({
		backendCtx,
		countryAccountsId,
		formData,
	}: OrganizationActionServiceArgs): Promise<OrganizationActionResult> {
		const intent = String(formData.get("intent") || "");

		try {
			if (intent === "create") {
				const name = String(formData.get("name") || "").trim();

				if (!name) {
					return {
						ok: false,
						error: backendCtx.t({
							code: "common.name_required",
							msg: "Name is required",
						}),
					};
				}

				const result = await dr.transaction((tx) =>
					OrganizationRepository.create(
						{
							name,
							countryAccountsId,
						},
						tx,
					),
				);

				if (!result) {
					return { ok: false, error: "Unable to create organization" };
				}

				return { ok: true, intent };
			}

			if (intent === "update") {
				const id = String(formData.get("id") || "").trim();
				const name = String(formData.get("name") || "").trim();

				if (!id) {
					return { ok: false, error: "Organization id is required" };
				}

				if (!name) {
					return {
						ok: false,
						error: backendCtx.t({
							code: "common.name_required",
							msg: "Name is required",
						}),
					};
				}

				const existing =
					await OrganizationRepository.getByIdAndCountryAccountsId(
						id,
						countryAccountsId,
					);
				if (!existing) {
					throw new Response("Unauthorized access", { status: 401 });
				}

				const result = await dr.transaction((tx) =>
					OrganizationRepository.updateById(id, { name }, tx),
				);

				if (!result) {
					return { ok: false, error: "Unable to update organization" };
				}

				return { ok: true, intent };
			}

			if (intent === "delete") {
				const id = String(formData.get("id") || "").trim();

				if (!id) {
					return { ok: false, error: "Organization id is required" };
				}

				const existing =
					await OrganizationRepository.getByIdAndCountryAccountsId(
						id,
						countryAccountsId,
					);
				if (!existing) {
					throw new Response("Unauthorized access", { status: 401 });
				}

				const result = await OrganizationRepository.deleteById(id);
				if (!result) {
					return { ok: false, error: "Unable to delete organization" };
				}

				return { ok: true, intent };
			}

			return { ok: false, error: "Invalid action" };
		} catch (err: any) {
			if (err instanceof Response) {
				throw err;
			}

			const dbCode = err?.code ?? err?.cause?.code;
			const dbMessage = String(err?.message ?? err?.cause?.message ?? "");

			if (
				dbCode === "23503" ||
				/foreign key constraint|violates foreign key/i.test(dbMessage)
			) {
				return {
					ok: false,
					error: backendCtx.t({
						code: "organization.delete_blocked_by_dependencies",
						msg: "This organization cannot be deleted because it is still being used by one or more users. Remove those assignments first.",
					}),
				};
			}

			if (dbCode === "23505") {
				return {
					ok: false,
					error: "An organization with the same name already exists.",
				};
			}

			return {
				ok: false,
				error: err instanceof Error ? err.message : "Unknown error",
			};
		}
	},
};
