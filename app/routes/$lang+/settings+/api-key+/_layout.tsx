import { useMemo, useState } from "react";
import { Outlet, useLoaderData, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";

import { MainContainer } from "~/frontend/container";
import { ViewContext } from "~/frontend/context";
import { NavSettings } from "~/frontend/components/NavSettings";
import { canAddNewRecord, canEditRecord } from "~/frontend/user/roles";
import { authLoaderWithPerm } from "~/utils/auth";
import { formatDate } from "~/utils/date";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { ApiKeyRepository } from "~/db/queries/apiKeyRepository";

interface EnhancedApiKey {
	id: string;
	name: string;
	createdAt: Date;
	managedByUserId: string;
	managedByUser: { email: string };
	secret: string;
}

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const items = await ApiKeyRepository.getByCountryAccountsIdWithUser(countryAccountsId);
	return { common: await getCommonData(loaderArgs), items };
});

export default function ApiKeysPage() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const navigate = useNavigate();

	const [tableFirst, setTableFirst] = useState(0);
	const [tableRows, setTableRows] = useState(10);
	const pageSizeOptions = [10, 20, 30, 40, 50];

	const navSettings = <NavSettings ctx={ctx} userRole={ld.common.user?.role} />;

	const canAdd = canAddNewRecord(ctx.user?.role ?? null);
	const canEdit = canEditRecord(ctx.user?.role ?? null);

	const paginatedItems = useMemo(
		() => ld.items.slice(tableFirst, tableFirst + tableRows),
		[ld.items, tableFirst, tableRows],
	);

	const secretTemplate = (item: EnhancedApiKey) => (
		<span className="flex items-center gap-1">
			<span>{item.secret.slice(0, 5)}</span>
			<Button
				type="button"
				text
				size="small"
				aria-label={ctx.t({ code: "common.copy", msg: "Copy" })}
				onClick={() => navigator.clipboard.writeText(item.secret)}
				className="!p-1"
			>
				<i className="pi pi-copy text-xs" aria-hidden="true" />
			</Button>
		</span>
	);

	const actionsBodyTemplate = (item: EnhancedApiKey) => (
		<div className="flex w-full items-center justify-end gap-1">
			{canEdit && (
				<Button
					type="button"
					aria-label={ctx.t({ code: "common.edit", msg: "Edit" })}
					text
					onClick={() => {
						navigate(`edit/${item.id}`);
					}}
				>
					<i className="pi pi-pencil" aria-hidden="true" />
				</Button>
			)}
			{canEdit && (
				<Button
					type="button"
					text
					severity="danger"
					aria-label={ctx.t({ code: "common.delete", msg: "Delete" })}
					onClick={() => {
						navigate(`delete/${item.id}`);
					}}
				>
					<i className="pi pi-trash" aria-hidden="true" />
				</Button>
			)}
		</div>
	);

	return (
		<MainContainer
			title={ctx.t({ code: "api_keys.api_keys", msg: "API keys" })}
			headerExtra={navSettings}
		>
			<>
				<div className="mb-4 w-full">
					<div className="flex w-full justify-end">
						{canAdd && (
							<Button
								id="add_new_api_key"
								label={ctx.t({
									code: "api_keys.add_new",
									msg: "Add new API key",
								})}
								icon="pi pi-plus"
								onClick={() => navigate("new")}
							/>
						)}
					</div>
				</div>

				<section className="mt-4 w-full">
					<div className="w-full overflow-x-auto [&_.p-datatable-wrapper]:overflow-visible">
						<DataTable
							value={paginatedItems}
							dataKey="id"
							className="w-full"
							tableClassName="!table min-w-[600px] border-collapse text-sm md:text-base"
							emptyMessage={ctx.t({
								code: "common.no_data_found",
								msg: "No data found",
							})}
						>
							<Column
								field="name"
								header={ctx.t({
									code: "api_keys.key_name",
									msg: "Key Name",
								})}
								body={(item: EnhancedApiKey) => item.name}
								headerClassName="bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
								bodyClassName="px-2 py-3 border-b border-gray-200"
							/>
							<Column
								field="managedByUser.email"
								header={ctx.t({
									code: "common.managed_by",
									msg: "Managed by",
								})}
								body={(item: EnhancedApiKey) => item.managedByUser.email}
								headerClassName="bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
								bodyClassName="px-2 py-3 border-b border-gray-200"
							/>
							<Column
								field="secret"
								header={ctx.t({
									code: "api_keys.session_secret",
									msg: "Session Secret",
								})}
								body={secretTemplate}
								headerClassName="bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
								bodyClassName="px-2 py-3 border-b border-gray-200"
							/>
							<Column
								field="createdAt"
								header={ctx.t({
									code: "common.created_at",
									msg: "Created at",
								})}
								body={(item: EnhancedApiKey) => formatDate(item.createdAt)}
								headerClassName="bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
								bodyClassName="px-2 py-3 border-b border-gray-200"
							/>
							<Column
								header=""
								body={actionsBodyTemplate}
								headerClassName="bg-gray-100 px-2 py-3 text-center font-medium border-b border-gray-200"
								bodyClassName="px-2 py-3 text-center border-b border-gray-200"
							/>
						</DataTable>
					</div>
					{ld.items.length > 0 && (
						<Paginator
							first={tableFirst}
							rows={tableRows}
							totalRecords={ld.items.length}
							rowsPerPageOptions={pageSizeOptions}
							onPageChange={(event) => {
								setTableFirst(event.first);
								setTableRows(event.rows);
							}}
							className="mt-4 !justify-end"
						/>
					)}
				</section>
				<Outlet />
			</>
		</MainContainer>
	);
}
