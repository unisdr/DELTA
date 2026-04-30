import { useState, useCallback } from "react";
import {
	useLoaderData,
	useActionData,
	useNavigation,
	useNavigate,
	Form as RRForm,
} from "react-router";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { BackendContext } from "~/backend.server/context";
import { AssetRepository } from "~/db/queries/assetRepository";
import { dr } from "~/db.server";
import { ViewContext } from "~/frontend/context";
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";
import { ContentPicker } from "~/components/ContentPicker";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";

// ── Loader ───────────────────────────────────────────────────────────────────

export const loader = authLoaderWithPerm("EditData", async (args) => {
	const { request, params } = args;
	const id = params.id;
	if (!id) throw new Response("Missing ID", { status: 400 });

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const ctx = new BackendContext(args);

	const item = await AssetRepository.findById(id, countryAccountsId, ctx.lang);
	if (!item) throw new Response("Asset not found", { status: 404 });
	if (item.isBuiltIn) throw new Response("Built-in assets cannot be edited", { status: 403 });

	const selectedDisplay = await contentPickerConfigSector(ctx).selectedDisplay(
		dr,
		item.sectorIds || "",
	);

	return { item, selectedDisplay };
});

// ── Action ───────────────────────────────────────────────────────────────────

type ActionResult = {
	ok: boolean;
	errors?: { customName?: string; sectorIds?: string };
	error?: string;
};

export const action = authActionWithPerm("EditData", async (args) => {
	const { request, params } = args;
	const id = params.id;
	if (!id) throw new Response("Missing ID", { status: 400 });

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const form = await request.formData();

	const customName = ((form.get("customName") as string) || "").trim();
	const customCategory = ((form.get("customCategory") as string) || "").trim();
	const nationalId = ((form.get("nationalId") as string) || "").trim();
	const customNotes = ((form.get("customNotes") as string) || "").trim();
	const sectorIds = (form.getAll("sectorIds")[1] as string) || "";

	if (!customName) {
		return {
			ok: false,
			errors: { customName: "Name is required" },
		} satisfies ActionResult;
	}
	else if (!sectorIds) {
		return {
			ok: false,
			errors: { sectorIds: "At least one sector must be selected" },
		} satisfies ActionResult;
	}

	const result = await AssetRepository.update(
		id,
		{
			customName,
			customCategory: customCategory || null,
			customNotes: customNotes || null,
			nationalId: nationalId || null,
			sectorIds,
		},
		countryAccountsId,
	);

	if (!result.ok) {
		return {
			ok: false,
			error: result.errors?.[0] ?? "Failed to update asset",
		} satisfies ActionResult;
	}

	return { ok: true } satisfies ActionResult;
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditAssetPage() {
	const { item, selectedDisplay } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const navigate = useNavigate();
	const ctx = new ViewContext();

	const isSubmitting = navigation.state === "submitting";
	const saved = actionData?.ok === true;
	const fieldErrors =
		actionData && !actionData.ok ? actionData.errors : undefined;

	const [sectorIds, setSectorIds] = useState(item.sectorIds || "");
	const [sectorDisplay, setSectorDisplay] = useState<
		{ id: string; name: string }[]
	>(
		(selectedDisplay || []).map((s) => ({
			id: s.id,
			name: String(s.name || ""),
		}))
	);

	const handleSectorSelect = useCallback(
		(
			selectedItems: Array<{
				id: string;
				name?: string;
				[key: string]: unknown;
			}>,
		) => {
			setSectorIds(selectedItems.map((i) => i.id).join(","));
			setSectorDisplay(
				selectedItems.map((i) => ({ id: i.id, name: String(i.name || "") })),
			);
		},
		[],
	);

	const sectorPickerConfig = contentPickerConfigSector(ctx);
	const onHide = useCallback(
		() => navigate(`/${ctx.lang}/settings/assets`),
		[navigate, ctx.lang],
	);

	const footer = (
		<div className="flex justify-end gap-2">
			<Button
				label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
				icon="pi pi-times"
				outlined
				onClick={onHide}
				disabled={isSubmitting}
			/>
			<Button
				type="submit"
				form="edit-asset-form"
				icon="pi pi-check"
				label={ctx.t({ code: "common.save", msg: "Save" })}
				loading={isSubmitting}
				disabled={isSubmitting}
			/>
		</div>
	);

	return (
		<Dialog
			visible
			onHide={onHide}
			header={`${ctx.t({ code: "assets.edit", msg: "Edit asset" })} — ${item.name}`}
			footer={footer}
			style={{ width: "540px" }}
			closable={!isSubmitting}
		>
			{saved && (
				<Message
					className="mb-4 w-full"
					severity="success"
					text={ctx.t({ code: "common.data_updated", msg: "The data was updated." })}
				/>
			)}
			{actionData && !actionData.ok && actionData.error && (
				<Message
					className="mb-4 w-full"
					severity="error"
					text={actionData.error}
				/>
			)}

			<RRForm method="post" id="edit-asset-form" className="flex flex-col gap-4 pt-2">
				{/* Name */}
				<div className="flex flex-col gap-1">
					<label htmlFor="field-customName" className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.name", msg: "Name" })}{" "}
						<span className="text-red-500">*</span>
					</label>
					<InputText
						id="field-customName"
						name="customName"
						defaultValue={item.name || ""}
						className={`w-full${fieldErrors?.customName ? " p-invalid" : ""}`}
					/>
					{fieldErrors?.customName && (
						<small className="text-red-500">{fieldErrors.customName}</small>
					)}
				</div>

				{/* Category */}
				<div className="flex flex-col gap-1">
					<label htmlFor="field-customCategory" className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.category", msg: "Category" })}
					</label>
					<InputText
						id="field-customCategory"
						name="customCategory"
						defaultValue={item.category || ""}
						className="w-full"
					/>
				</div>

				{/* National ID */}
				<div className="flex flex-col gap-1">
					<label htmlFor="field-nationalId" className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.national_id", msg: "National ID" })}
					</label>
					<InputText
						id="field-nationalId"
						name="nationalId"
						defaultValue={item.nationalId || ""}
						className="w-full"
					/>
				</div>

				{/* Notes */}
				<div className="flex flex-col gap-1">
					<label htmlFor="field-customNotes" className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.notes", msg: "Notes" })}
					</label>
					<InputTextarea
						id="field-customNotes"
						name="customNotes"
						defaultValue={item.notes || ""}
						rows={3}
						className="w-full"
					/>
				</div>

				<Divider className="my-1" />

				{/* Sectors */}
				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.sector", msg: "Sector" })}
					</label>
					<input type="hidden" name="sectorIds" value={sectorIds} />
					<ContentPicker
						ctx={ctx}
						{...sectorPickerConfig}
						value={sectorIds}
						displayName={sectorDisplay as any}
						onSelect={handleSectorSelect as any}
					/>
					{fieldErrors?.sectorIds && (
						<small className="text-red-500">{fieldErrors.sectorIds}</small>
					)}
				</div>
			</RRForm>
		</Dialog>
	);
}
