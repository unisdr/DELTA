import { dr } from "~/db.server";

import { useActionData, useLoaderData } from "@remix-run/react";

import { authLoaderWithPerm, authActionWithPerm } from "~/util/auth";
import { parseFormData } from "@mjackson/form-data-parser";

import {
	ActionFunction,
	ActionFunctionArgs,
} from "@remix-run/node";

import { parseCSV } from "~/util/csv";

import { MainContainer } from "~/frontend/container";
import {
	HumanEffectsTable,
	HumanEffectsTableFromString,
} from "~/frontend/human_effects/defs";
import {
	create,
	clearData,
	defsForTable,
	validate,
} from "~/backend.server/models/human_effects";
import { eqArr } from "~/util/array";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/util/link";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	let recordId = params.disRecId || "";
	let url = new URL(request.url);
	let tblStr = url.searchParams.get("table") || "";
	let tbl = HumanEffectsTableFromString(tblStr);
	return {
		
		recordId,
		tbl
	};
});

export interface Res {
	ok: boolean;
	imported?: number;
	error?: string;
}

class UserError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserError";
	}
}

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return authActionWithPerm("EditData", async (actionArgs): Promise<Res> => {
		const ctx = new BackendContext(actionArgs);
		const { request, params } = actionArgs;
		const recordId = params.disRecId || "";

		try {
			// ✅ NEW multipart parsing
			const formData = await parseFormData(request, {
				maxFileSize: 10_000_000, // adjust if needed
			});

			const tableIdStr = String(formData.get("tableId") || "");
			const file = formData.get("file");

			if (!(file instanceof File)) {
				throw new UserError("File was not set");
			}

			const fileString = await file.text();
			const all = await parseCSV(fileString);

			if (all.length === 0) {
				throw new UserError("Empty file");
			}
			if (all.length === 1) {
				throw new UserError("Only 1 row in file");
			}

			const imported = all.length - 1;

			if (!recordId) {
				throw new Error("No record id");
			}

			let table: HumanEffectsTable;
			try {
				table = HumanEffectsTableFromString(tableIdStr);
			} catch (e) {
				return { ok: false, error: String(e) };
			}

			const defs = await defsForTable(ctx, dr, table, countryAccountsId);

			const expectedHeaders = defs.map((d) => d.jsName);
			if (!eqArr(all[0], expectedHeaders)) {
				throw new UserError(
					"Unexpected table, wanted columns: " +
					expectedHeaders.join(",") +
					" got: " +
					all[0].join(",")
				);
			}

			for (let i = 1; i < all.length; i++) {
				if (all[i].length !== all[0].length) {
					throw new UserError("Invalid row length");
				}
			}

			await dr.transaction(async (tx) => {
				const clearRes = await clearData(tx, table, recordId);
				if (!clearRes.ok) {
					throw clearRes.error;
				}

				const createRes = await create(
					tx,
					table,
					recordId,
					defs,
					all.slice(1),
					true
				);
				if (!createRes.ok) {
					if (createRes.error) {
						throw new UserError(String(createRes.error));
					}
					throw new Error("unknown create error");
				}

				const validateRes = await validate(
					tx,
					table,
					recordId,
					countryAccountsId,
					defs
				);
				if (!validateRes.ok) {
					if (validateRes.tableError) {
						throw new UserError(validateRes.tableError.message);
					}
					if (validateRes.groupErrors) {
						throw new UserError(validateRes.groupErrors[0].message);
					}
					if (validateRes.rowErrors) {
						throw new UserError(validateRes.rowErrors[0].message);
					}
					throw new Error("unknown validate error");
				}
			});

			return { ok: true, imported };
		} catch (e) {
			if (e instanceof UserError) {
				return { ok: false, error: e.message };
			}
			console.error("Could not import csv", e);
			return { ok: false, error: "Server error" };
		}
	})(args);
};


export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	let error = "";
	const ad = useActionData<Res>();
	let submitted = false;
	let imported = 0;
	if (ad) {
		submitted = true;
		if (!ad.ok) {
			error = ad.error || "Application error";
		} else {
			imported = ad.imported || 0;
		}
	}

	let baseUrl = "/disaster-record/edit-sub/" + ld.recordId + "/human-effects"

	return (
		<MainContainer title="CSV Import">
			<>
				<h3>Uploaded file will replace data for this record and table</h3>
				<form method="post" encType="multipart/form-data">
					<input type="hidden" name="tableId" value={ld.tbl}></input>
					{!error && submitted && <p>Imported data, new row count is {imported}</p>}
					{error ? <p>Error: {error} </p> : null}
					<label>
						File upload <br />
						<input name="file" type="file"></input>
					</label>
					<input
						className="mg-button mg-button-primary"
						type="submit"
						value="Submit"
					/>
					<div>
						<LangLink lang={ctx.lang} to={baseUrl + "?tbl=" + ld.tbl}> Back to List </LangLink>
					</div>
				</form>
			</>
		</MainContainer>
	);
}
