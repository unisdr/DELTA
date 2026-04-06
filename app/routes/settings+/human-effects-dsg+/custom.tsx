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

import { useEffect, useState } from "react";
import { notifyError, notifyInfo } from "~/frontend/utils/notifications";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { eq } from "drizzle-orm";


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
						error: `Disaggregation "${def.dbName}" must have at least 2 options.`,
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


	const [config, setConfig] = useState<HumanEffectsCustomConfigWithIds>(() =>
		ld.config ? ld.config : { version: 1, config: [] },
	);

	useEffect(() => {
		if (ad)
			if (!ad.ok) {
				notifyError(ad.error || "Server error");
			} else {
				notifyInfo(
					"Your changes have been saved",
				);
			}
	}, [ad]);

	return (
		<MainContainer
			title={"Human effects: Custom Disaggregations"}
		>
			<Form method="post">
				<h2>
					{"Your configuration"}
				</h2>

				<p style={{ color: "gray", marginBottom: "1em" }}>
					{"Disaggregations in use cannot be deleted or have their database name changed, but UI labels can still be adjusted."}
				</p>

				<input type="hidden" name="config" value={JSON.stringify(config)} />

				<Editor
					langs={langs}
					value={config.config}
					onChange={(config) => setConfig((prev) => ({ ...prev, config }))}
					usedColumns={ld.usedCustomColumns}
					usedValuesByColumn={ld.usedValuesByColumn}
				/>

				<SubmitButton
					className="mg-button mg-button-primary"
					label={"Update config"}
				/>
			</Form>
		</MainContainer>
	);
}
