import {
	ETLocalizedString,
	EnumEntry,
	ColWidth,
} from "~/frontend/editabletable/base";
import { HumanEffectsCustomDef } from "~/frontend/human_effects/defs";
import { useState } from "react";
import { ViewContext } from "../context";

export interface LocalizedStringEditorProps {
	label: string;
	value: ETLocalizedString | string;
	langs: string[];
	onChange: (value: ETLocalizedString) => void;
}

export interface HumanEffectsCustomDefWithID extends HumanEffectsCustomDef {
	id: string;
	enum: EnumEntryWithID[];
}

export interface EnumEntryWithID extends EnumEntry {
	id: string;
}

export function withIds(
	defs: HumanEffectsCustomDef[],
): HumanEffectsCustomDefWithID[] {
	return defs.map((def) => ({
		...def,
		id: crypto.randomUUID(),
		enum: def.enum.map((val) => ({
			...val,
			id: crypto.randomUUID(),
		})),
	}));
}

export function withoutIds(
	defs: HumanEffectsCustomDefWithID[],
): HumanEffectsCustomDef[] {
	return defs.map(({ id, enum: enumWithId, ...def }) => ({
		...def,
		enum: enumWithId.map(({ id, ...val }) => val),
	}));
}

export function LocalizedStringEditor(props: LocalizedStringEditorProps) {
	let [labels, setLabels] = useState<Record<string, string>>(() => {
		let obj: Record<string, string> = {};
		let allLangs = [
			...new Set([
				...props.langs,
				...Object.keys(typeof props.value === "string" ? {} : props.value),
			]),
		];

		allLangs.forEach((lang) => {
			if (typeof props.value === "string") {
				obj[lang] = lang === "en" ? props.value : "";
			} else {
				obj[lang] = props.value[lang] || "";
			}
		});

		return obj;
	});

	function update() {
		props.onChange({ ...labels });
	}

	return (
		<div className="dts-localized-string-input">
			{props.langs.length == 1 ? (
				<div className="mg-grid mg-grid__col-3">
					<div className="dts-form-component">
						<label>
							{props.label}
							<input
								required={true}
								value={labels[props.langs[0]] || ""}
								onChange={(e) =>
									setLabels((prev) => ({
										...prev,
										[props.langs[0]]: e.target.value,
									}))
								}
								onBlur={update}
							/>
						</label>
					</div>
				</div>
			) : (
				<>
					<label>{props.label}</label>
					<div className="mg-grid mg-grid__col-3">
						{props.langs.map((lang) => (
							<div className="dts-form-component" key={lang}>
								<label>
									{lang}
									<input
										required={true}
										value={labels[lang] || ""}
										onChange={(e) =>
											setLabels((prev) => ({ ...prev, [lang]: e.target.value }))
										}
										onBlur={update}
									/>
								</label>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export interface EnumEntryRowProps {
	ctx: ViewContext;
	entry: EnumEntryWithID;
	langs: string[];
	onChange: (e: EnumEntryWithID) => void;
	onDelete: () => void;
}

export function EnumEntryRow(props: EnumEntryRowProps) {
	const ctx = props.ctx;
	let [key, setKey] = useState(props.entry.key);

	function update() {
		let updated = { ...props.entry, key };
		props.onChange(updated);
	}

	function remove() {
		props.onDelete();
	}

	return (
		<div className="dts-human-effects-custom-value-editor">
			<h4>
				{ctx.t({
					code: "human_effects.value",
					msg: "Value",
				})}
				<button
					onClick={remove}
					type="button"
					className="mg-button mg-button-outline dts-human-effects-custom-editor-delete"
					style={{ color: "red" }}
				>
					<svg aria-hidden="true" focusable="false" role="img">
						<use href="/assets/icons/trash-alt.svg#delete" />
					</svg>
				</button>
			</h4>

			<LocalizedStringEditor
				label={ctx.t({
					code: "human_effects.ui_name_long",
					msg: "User Interface Name",
				})}
				value={props.entry.label}
				langs={props.langs}
				onChange={(label) => props.onChange({ ...props.entry, key, label })}
			/>

			<div className="mg-grid mg-grid__col-3">
				<div className="dts-form-component">
					<label>
						{ctx.t({
							code: "human_effects.database_value",
							msg: "Database Value",
						})}
					</label>

					<input
						required={true}
						value={key}
						onChange={(e) => setKey(e.target.value)}
						onBlur={update}
					/>
				</div>
			</div>
		</div>
	);
}

export interface EnumListProps {
	ctx: ViewContext;
	values: EnumEntryWithID[];
	onChange: (v: EnumEntryWithID[]) => void;
	langs: string[];
}

export function EnumList(props: EnumListProps) {
	const ctx = props.ctx;
	let addValue = () => {
		let newVal: EnumEntryWithID = {
			id: crypto.randomUUID(),
			key: "",
			label: {},
		};
		let obj: Record<string, string> = {};
		props.langs.forEach((lang) => (obj[lang] = ""));
		newVal.label = obj;
		props.onChange([...props.values, newVal]);
	};

	let removeValue = (index: number) => {
		props.onChange(props.values.filter((_, i) => i !== index));
	};

	let updateValue = (index: number, newVal: EnumEntryWithID) => {
		props.onChange(props.values.map((v, i) => (i === index ? newVal : v)));
	};

	return (
		<div>
			{props.values.map((val, idx) => (
				<EnumEntryRow
					ctx={ctx}
					key={val.key}
					entry={val}
					langs={props.langs}
					onChange={(v) => updateValue(idx, v)}
					onDelete={() => removeValue(idx)}
				/>
			))}
			<button
				type="button"
				onClick={addValue}
				className="mg-button mg-button-primary"
			>
				{ctx.t({
					code: "human_effects.add_value",
					msg: "Add Value",
				})}
			</button>
		</div>
	);
}

export interface DefEditorProps {
	ctx: ViewContext;
	value: HumanEffectsCustomDefWithID;
	langs: string[];
	onChange: (value: HumanEffectsCustomDefWithID) => void;
	onRemove: () => void;
}

export function DefEditor(props: DefEditorProps) {
	const ctx = props.ctx;

	let handleUiNameChange = (label: ETLocalizedString) => {
		props.onChange({ ...props.value, uiName: label });
	};

	let handleEnumChange = (enumValues: EnumEntryWithID[]) => {
		props.onChange({ ...props.value, enum: enumValues });
	};

	return (
		<div className="disaggregation">
			<h3>
				{ctx.t({
					code: "human_effects.disaggregation",
					msg: "Disaggregation",
				})}
				<button
					onClick={props.onRemove}
					type="button"
					className="mg-button mg-button-outline dts-human-effects-custom-editor-delete"
					style={{ color: "red" }}
				>
					<svg aria-hidden="true" focusable="false" role="img">
						<use href="/assets/icons/trash-alt.svg#delete" />
					</svg>
				</button>
			</h3>

			<LocalizedStringEditor
				label={ctx.t({
					code: "human_effects.ui_name_long",
					msg: "User Interface Name",
				})}
				value={props.value.uiName}
				langs={props.langs}
				onChange={handleUiNameChange}
			/>

			<div className="mg-grid mg-grid__col-3">
				<div className="dts-form-component">
					<label>
						{ctx.t({
							code: "human_effects.database_name",
							msg: "Database Name",
						})}
					</label>
					<input
						required={true}
						type="text"
						value={props.value.dbName}
						onChange={(e) =>
							props.onChange({ ...props.value, dbName: e.target.value })
						}
					/>
				</div>
				<div className="dts-form-component">
					<label>
						{ctx.t({
							code: "human_effects.ui_column_width",
							msg: "User Interface Column Width",
						})}
					</label>
					<select
						required={true}
						value={props.value.uiColWidth || ""}
						onChange={(e) =>
							props.onChange({
								...props.value,
								uiColWidth: e.target.value
									? (e.target.value as ColWidth)
									: "wide",
							})
						}
					>
						<option value="thin">
							{ctx.t({ code: "common.column_width.thin", msg: "Thin" })}
						</option>
						<option value="medium">
							{ctx.t({ code: "common.column_width.medium", msg: "Medium" })}
						</option>
						<option value="wide">
							{ctx.t({ code: "common.column_width.wide", msg: "Wide" })}
						</option>
					</select>
				</div>
			</div>
			<h3>
				{ctx.t({
					code: "human_effects.values",
					msg: "Values",
				})}
			</h3>
			<EnumList
				ctx={ctx}
				values={props.value.enum}
				langs={props.langs}
				onChange={handleEnumChange}
			/>
		</div>
	);
}

export interface EditorProps {
	ctx: ViewContext;
	value: HumanEffectsCustomDefWithID[];
	langs: string[];
	onChange: (value: HumanEffectsCustomDefWithID[]) => void;
}

export function Editor(props: EditorProps) {
	const ctx = props.ctx;

	let addDef = () => {
		let newDef: HumanEffectsCustomDefWithID = {
			id: crypto.randomUUID(),
			uiName: { en: "" },
			dbName: "",
			enum: [
				{
					id: crypto.randomUUID(),
					key: "",
					label: { en: "" },
				},
			],
			uiColWidth: "wide",
		};
		props.onChange([...props.value, newDef]);
	};

	let removeDef = (index: number) => {
		props.onChange(props.value.filter((_, i) => i !== index));
	};

	let updateDef = (index: number, def: HumanEffectsCustomDefWithID) => {
		props.onChange(props.value.map((d, i) => (i === index ? def : d)));
	};

	return (
		<div className="dts-human-effects-custom-editor">
			{props.value.length === 0 ? (
				<p>
					{ctx.t({
						code: "human_effects.custom_disaggregations.no_configured",
						msg: 'No custom disaggregations configured. Click "Add Disaggregation" to create one.',
					})}
				</p>
			) : (
				props.value.map((def, idx) => (
					<DefEditor
						ctx={ctx}
						key={def.id}
						value={def}
						langs={props.langs}
						onChange={(d) => updateDef(idx, d)}
						onRemove={() => removeDef(idx)}
					/>
				))
			)}

			<button
				type="button"
				onClick={addDef}
				className="mg-button mg-button-primary"
			>
				{ctx.t({
					code: "human_effects.custom_disaggregations.add",
					msg: "Add Disaggregation",
				})}
			</button>
		</div>
	);
}
