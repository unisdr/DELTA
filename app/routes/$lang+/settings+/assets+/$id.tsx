import { dr } from "~/db.server";
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { ViewContext } from "~/frontend/context";
import { useLoaderData, useNavigate } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";
import { AssetRepository } from "~/db/queries/assetRepository";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { request, params } = loaderArgs;
	const countryAccountId = await getCountryAccountsIdFromSession(request);

	const id = params.id;
	if (!id) throw new Response("Not found", { status: 404 });

	const item = await AssetRepository.findById(id, countryAccountId, ctx.lang);
	if (!item) throw new Response("Asset not found", { status: 404 });

	// Built-in assets are accessible to all tenants; instance-owned assets require tenant match
	if (item.isBuiltIn !== true && item.countryAccountsId !== countryAccountId) {
		throw new Response("Asset not accessible for this tenant", { status: 403 });
	}

	const selectedDisplay = await contentPickerConfigSector(ctx).selectedDisplay(
		dr,
		item.sectorIds || "",
	);

	return {
		item,
		selectedDisplay,
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const ctx = new ViewContext();
	if (!ld.item) {
		throw new Error("Asset data missing");
	}

	const sectors =
		ld.selectedDisplay?.map((s) => String(s.name || "")).join(", ") || "—";

	return (
		<Dialog
			visible
			header={ld.item.name}
			onHide={() => navigate(`/${ctx.lang}/settings/assets`)}
			style={{ width: "560px" }}
			footer={
				<div className="flex justify-end gap-2">
					<Button
						label={ctx.t({ code: "common.close", msg: "Close" })}
						icon="pi pi-times"
						outlined
						onClick={() => navigate(`/${ctx.lang}/settings/assets`)}
					/>
				</div>
			}
		>
			<div className="flex flex-col gap-3 text-sm">
				<div className="flex items-center gap-2">
					<Tag
						value={
							ld.item.isBuiltIn
								? ctx.t({ code: "assets.built_in", msg: "Built-in" })
								: ctx.t({ code: "assets.custom", msg: "Custom" })
						}
						severity={ld.item.isBuiltIn ? "info" : "success"}
					/>
				</div>
				<p>
					<strong>{ctx.t({ code: "common.id", msg: "ID" })}:</strong> {ld.item.id}
				</p>
				<p>
					<strong>{ctx.t({ code: "common.category", msg: "Category" })}:</strong>{" "}
					{ld.item.category || "—"}
				</p>
				<p>
					<strong>{ctx.t({ code: "common.national_id", msg: "National ID" })}:</strong>{" "}
					{ld.item.nationalId || "—"}
				</p>
				<p>
					<strong>{ctx.t({ code: "common.sector", msg: "Sector" })}:</strong> {sectors}
				</p>
				<p>
					<strong>{ctx.t({ code: "common.notes", msg: "Notes" })}:</strong>{" "}
					{ld.item.notes || "—"}
				</p>
			</div>
		</Dialog>
	);
}
