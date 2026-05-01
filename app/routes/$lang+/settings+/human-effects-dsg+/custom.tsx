// Settings page for custom disaggregation columns. Allows adding/editing/removing custom columns.
// See _docs/human-direct-effects.md for overview.
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";

import { dr } from "~/db.server";

import { MainContainer } from "~/frontend/container";

import { humanDsgConfigTable } from "~/drizzle/schema/humanDsgConfigTable";

import { SubmitButton } from "~/frontend/form";
import { useActionData, useLoaderData } from "react-router";

import { Form } from "react-router";
import {
	Editor,
	HumanEffectsCustomDefWithID,
	withIds,
	withoutIds,
} from "~/frontend/human_effects/custom_editor";

import { useEffect, useRef, useState } from "react";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { eq } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";
import { ViewContext } from "~/frontend/context";
import { Toast } from "primereact/toast";
import {
	getUsedCustomColumnsAndValues,
	validateCustomConfigChanges,
} from "~/backend.server/models/human_effects";

async function getConfig(countryAccountsId: string) {
	const row = await dr.query.humanDsgConfigTable.findFirst({
		where: eq(humanDsgConfigTable.countryAccountsId, countryAccountsId),
	});

	if (!row || !row.custom) {
		return { config: null };
	}

	const config = row.custom;

	return {
		config: {
			version: config.version,
			config: withIds(config.config),
		},
	};
}

let langs = ["default"];

export const loader = authLoaderWithPerm(
	"EditHumanEffectsCustomDsg",
	async ({ request }) => {
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		const { columns, valuesByColumn } = await getUsedCustomColumnsAndValues(
			dr,
			countryAccountsId,
		);

		return {
			...(await getConfig(countryAccountsId)),
			usedCustomColumns: columns,
			usedValuesByColumn: valuesByColumn,
		};
	},
);

export const action = authActionWithPerm(
	"EditHumanEffectsCustomDsg",
	async (args) => {
		const ctx = new BackendContext(args);
		const { request } = args;
		let formData = await request.formData();
		let config = formData.get("config") || "";
		if (typeof config !== "string") {
			throw "Wrong argument";
		}
		let configDataWithIds: HumanEffectsCustomConfigWithIds | null = null;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		if (config) {
			try {
				configDataWithIds = JSON.parse(config);
			} catch (e) {
				return { ok: false, error: String(e) };
			}
		}
		let configData = configDataWithIds && {
			version: configDataWithIds.version,
			config: withoutIds(configDataWithIds.config),
		};

		if (configData && Array.isArray(configData.config)) {
			for (const def of configData.config) {
				if (!Array.isArray(def.enum) || def.enum.length < 2) {
					return {
						ok: false,
						error: ctx.t(
							{
								code: "human_effects.error.disaggregation_min_options",
								msg: 'Disaggregation "{disaggregation}" must have at least 2 options.',
							},
							{ disaggregation: def.dbName },
						),
					};
				}
			}
		}

		const currentConfig = await getConfig(countryAccountsId);

		const validationError = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			currentConfig.config?.config || null,
			configData?.config || null,
		);

		if (validationError) {
			return {
				ok: false,
				error: validationError.code,
			};
		}

		await dr.transaction(async (tx) => {
			const row = await tx.query.humanDsgConfigTable.findFirst({
				where: eq(humanDsgConfigTable.countryAccountsId, countryAccountsId),
			});
			if (!row) {
				await tx.insert(humanDsgConfigTable).values({
					custom: configData,
					countryAccountsId: countryAccountsId,
				});
			} else {
				await tx
					.update(humanDsgConfigTable)
					.set({ custom: configData })
					.where(eq(humanDsgConfigTable.countryAccountsId, countryAccountsId));
			}
		});

		return { ok: true };
	},
);

export interface HumanEffectsCustomConfigWithIds {
	version: number;
	config: HumanEffectsCustomDefWithID[];
}

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ad = useActionData<typeof action>();
	const ctx = new ViewContext();
	const toast = useRef<Toast>(null);

	const [config, setConfig] = useState<HumanEffectsCustomConfigWithIds>(() =>
		ld.config ? ld.config : { version: 1, config: [] },
	);

	useEffect(() => {
		if (ad)
			if (!ad.ok) {
				toast.current?.show({
					severity: "error",
					detail: ad.error || "Server error",
					life: 5000,
				});
			} else {
				toast.current?.show({
					severity: "info",
					detail: ctx.t({
						code: "human_effects.changes_saved",
						msg: "Your changes have been saved",
					}),
					life: 5000,
				});
			}
	}, [ad]);

	return (
		<MainContainer
			title={ctx.t({
				code: "human_effects.custom_disaggregations",
				msg: "Human effects: Custom Disaggregations",
			})}
		>
			<Toast ref={toast} position="top-center" />
			<Form method="post">
				<h2>
					{ctx.t({
						code: "human_effects.your_configuration",
						msg: "Your configuration",
					})}
				</h2>

				<p style={{ color: "gray", marginBottom: "1em" }}>
					{ctx.t({
						code: "human_effects.in_use_note",
						msg: "Disaggregations in use cannot be deleted or have their database name changed, but UI labels can still be adjusted.",
					})}
				</p>

				<input type="hidden" name="config" value={JSON.stringify(config)} />

				<Editor
					ctx={ctx}
					langs={langs}
					value={config.config}
					onChange={(config) => setConfig((prev) => ({ ...prev, config }))}
					usedColumns={ld.usedCustomColumns}
					usedValuesByColumn={ld.usedValuesByColumn}
				/>

				<SubmitButton
					className="mg-button mg-button-primary"
					label={ctx.t({
						code: "human_effects.update_config",
						msg: "Update config",
					})}
				/>
			</Form>
		</MainContainer>
	);
}
