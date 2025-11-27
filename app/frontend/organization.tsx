import {
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase,
} from "~/frontend/form";

import {OrganizationFields, OrganizationViewModel} from "~/backend.server/models/organization";
export const route = "/settings/organizations";

interface OrganizationFormProps extends UserFormProps<OrganizationFields> {
	selectedDisplay: any;
}

export function OrganizationForm(props: OrganizationFormProps) {
	const ctx = props.ctx
	if (!props.fieldDef) {
		throw new Error("fieldDef not passed to OrganizationForm");
	}

	return (
		<FormView
			ctx={ctx}
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Organizations"
			singular="Organization"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			// elementsAfter={{
			// 	sectorId: (
			// 		<a target="_blank" href="/settings/sectors">Edit sectors</a>
			// 	),
			// }}
			override={
				{
					// sectorIds: (
					// 	<Field key="sectorIds" label="Sector">
					// 		<ContentPicker 
					// 			ctx={ctx}
					// 			{...contentPickerConfigSector} 
					// 			value={ props.fields.sectorIds } //Assign the sector id here
					// 			displayName={ props.selectedDisplay as any } //Assign the sector name here, from the loaderData > sectorDisplayName sample
					// 			onSelect={(_selectedItems: any) => {
					// 				//This is where you can get the selected sector id
					// 				//console.log('selectedItems: ', selectedItems);
					// 			}}
					// 		 />
					// 	</Field>
					// )
				}	
			}
		/>
	);
}

interface OrganizationViewProps extends ViewPropsBase<OrganizationFields> {
	item: OrganizationViewModel;
	extraData?: any;
}

export function OrganizationView(props: OrganizationViewProps) {
	const {ctx} = props;
	
	return (
		<ViewComponent
			ctx={ctx}
			path={route}
			id={props.item.id}
			title="Organizations"
		>
			<FieldsView def={props.def} fields={props.item} 
			/>
		</ViewComponent>
	);
}
