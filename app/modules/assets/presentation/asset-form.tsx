import {
    Field,
    FormView,
    type UserFormProps,
} from "~/frontend/form";
import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfigSector } from "~/modules/assets/presentation/sector-picker-config";
import type { AssetFormFields } from "~/modules/assets/domain/entities/asset";

export const ASSETS_ROUTE = "/settings/assets";

interface AssetFormProps extends UserFormProps<AssetFormFields> {
    selectedDisplay?: any;
}

const assetFieldsDef = [
    { key: "sectorIds" as const, label: "Sector", type: "other" as const },
    { key: "name" as const, label: "Name", type: "text" as const, required: true },
    { key: "category" as const, label: "Category", type: "text" as const },
    { key: "nationalId" as const, label: "National ID", type: "text" as const },
    { key: "notes" as const, label: "Notes", type: "textarea" as const },
];

export function AssetForm(props: AssetFormProps) {
    return (
        <FormView
            path={ASSETS_ROUTE}
            edit={props.edit}
            id={props.id}
            title={"Assets"}
            editLabel={"Edit asset"}
            addLabel={"Add asset"}
            errors={props.errors}
            fields={props.fields}
            fieldsDef={props.fieldDef ?? assetFieldsDef}
            override={{
                sectorIds: (
                    <Field key="sectorIds" label={"Sector"}>
                        <ContentPicker
                            {...contentPickerConfigSector()}
                            value={props.fields.sectorIds}
                            displayName={props.selectedDisplay as any}
                            onSelect={(_selectedItems: any) => { }}
                        />
                    </Field>
                ),
            }}
        />
    );
}
