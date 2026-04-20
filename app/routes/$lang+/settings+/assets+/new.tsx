import { useState, useCallback } from "react";
import { redirect } from "react-router";
import {
	useActionData,
	useNavigation,
	useNavigate,
	Form as RRForm,
} from "react-router";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { AssetRepository } from "~/db/queries/assetRepository";
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

export const loader = authLoaderWithPerm("EditData", async () => {
	return {};
});

// ── Action ───────────────────────────────────────────────────────────────────

type ActionResult = {
	ok: boolean;
	errors?: { customName?: string };
	error?: string;
};

export const action = authActionWithPerm("EditData", async (args) => {
	const { request, params } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const lang = params.lang as string;

	const form = await request.formData();
	const customName = ((form.get("customName") as string) || "").trim();
	const customCategory = ((form.get("customCategory") as string) || "").trim();
	const nationalId = ((form.get("nationalId") as string) || "").trim();
	const customNotes = ((form.get("customNotes") as string) || "").trim();
	const sectorIds = (form.get("sectorIds") as string) || "";

	if (!customName) {
		return {
			ok: false,
			errors: { customName: "Name is required" },
		} satisfies ActionResult;
	}

	const id = await AssetRepository.create({
		customName,
		customCategory: customCategory || null,
		customNotes: customNotes || null,
		nationalId: nationalId || null,
		sectorIds,
		countryAccountsId,
	});

	if (!id) {
		return { ok: false, error: "Failed to create asset" } satisfies ActionResult;
	}

	return redirect(`/${lang}/settings/assets/${id}`);
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewAssetPage() {
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const navigate = useNavigate();
	const ctx = new ViewContext();

	const isSubmitting = navigation.state === "submitting";
	const fieldErrors =
		actionData && !actionData.ok ? actionData.errors : undefined;

	const [sectorIds, setSectorIds] = useState("");
	const [sectorDisplay, setSectorDisplay] = useState<
		{ id: string; name: string }[]
	>([]);

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
				form="new-asset-form"
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
			header={ctx.t({ code: "assets.add_new", msg: "Add new asset" })}
			footer={footer}
			style={{ width: "540px" }}
			closable={!isSubmitting}
		>
			{actionData && !actionData.ok && actionData.error && (
				<Message
					className="mb-4 w-full"
					severity="error"
					text={actionData.error}
				/>
			)}

			<RRForm method="post" id="new-asset-form" className="flex flex-col gap-4 pt-2">
				{/* Name */}
				<div className="flex flex-col gap-1">
					<label htmlFor="field-customName" className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.name", msg: "Name" })}{" "}
						<span className="text-red-500">*</span>
					</label>
					<InputText
						id="field-customName"
						name="customName"
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
					<InputText id="field-customCategory" name="customCategory" className="w-full" />
				</div>

				{/* National ID */}
				<div className="flex flex-col gap-1">
					<label htmlFor="field-nationalId" className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.national_id", msg: "National ID" })}
					</label>
					<InputText id="field-nationalId" name="nationalId" className="w-full" />
				</div>

				{/* Notes */}
				<div className="flex flex-col gap-1">
					<label htmlFor="field-customNotes" className="text-sm font-medium text-gray-700">
						{ctx.t({ code: "common.notes", msg: "Notes" })}
					</label>
					<InputTextarea id="field-customNotes" name="customNotes" rows={3} className="w-full" />
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
				</div>
			</RRForm>
		</Dialog>
	);
}
