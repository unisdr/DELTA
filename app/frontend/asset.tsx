import {
	Field,
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase,
} from "~/frontend/form";

import { AssetFields, AssetViewModel } from "~/backend.server/models/asset";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfigSector } from "./asset-content-picker-config";

export const route = "/settings/assets";

interface AssetFormProps extends UserFormProps<AssetFields> {
	selectedDisplay: any;
}

export function AssetForm(props: AssetFormProps) {
	const ctx = props.ctx;
	if (!props.fieldDef) {
		throw new Error("fieldDef not passed to AssetForm");
	}

	return (
		<FormView
			ctx={ctx}
			path={route}
			edit={props.edit}
			id={props.id}
			title={ctx.t({ code: "assets", msg: "Assets" })}
			editLabel={ctx.t({ code: "assets.edit", msg: "Edit asset" })}
			addLabel={ctx.t({ code: "assets.add", msg: "Add asset" })}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			// elementsAfter={{
			// 	sectorId: (
			// 		<a target="_blank" href="/settings/sectors">Edit sectors</a>
			// 	),
			// }}
			override={{
				sectorIds: (
					<Field
						key="sectorIds"
						label={ctx.t({
							code: "common.sector",
							msg: "Sector",
						})}
					>
						<ContentPicker
							ctx={ctx}
							{...contentPickerConfigSector(ctx)}
							value={props.fields.sectorIds} //Assign the sector id here
							displayName={props.selectedDisplay as any} //Assign the sector name here, from the loaderData > sectorDisplayName sample
							onSelect={(_selectedItems: any) => {
								//This is where you can get the selected sector id
								//console.log('selectedItems: ', selectedItems);
							}}
						/>
					</Field>
				),
			}}
		/>
	);
}

interface AssetViewProps extends ViewPropsBase<AssetFields> {
	item: AssetViewModel;
	extraData?: any;
}

export function AssetView(props: AssetViewProps) {
	const { ctx } = props;
	const sectorNames =
		props.extraData?.selectedDisplay
			?.map((s: { name: string }) => s.name)
			.join(", ") || "N/A";

	return (
		<ViewComponent
			ctx={ctx}
			isPublic={props.item.isBuiltIn === true}
			path={route}
			id={props.item.id}
			title={ctx.t({ code: "common.assets", msg: "Assets" })}
		>
			<FieldsView
				def={props.def}
				fields={props.item}
				override={{
					sectorIds: (
						<p>
							{ctx.t({ code: "common.sector", msg: "Sector" })}: {sectorNames}
						</p>
					),
				}}
			/>
			{props.item.isBuiltIn === true && (
				<p className="mg-u-color--muted mg-u-margin-top--sm">
					{ctx.t({
						code: "assets.built_in_cannot_edit_or_delete",
						msg: "This is a built-in asset and cannot be edited or deleted.",
					})}
				</p>
			)}
		</ViewComponent>
	);
}
