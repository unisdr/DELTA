import { Form as RRForm } from "react-router";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";

import type { Asset } from "~/modules/assets/domain/entities/asset";

interface EditAssetDialogProps {
    item: Asset;
    nameValue: string;
    nameError: string;
    isSubmitting: boolean;
    onHide(): void;
    initialSectorDisplay?: any;
}

export default function EditAssetDialog(props: EditAssetDialogProps) {
    const footer = (
        <div className="flex justify-end gap-2">
            <Button
                type="button"
                label={"Cancel"}
                icon="pi pi-times"
                outlined
                onClick={props.onHide}
                disabled={props.isSubmitting}
            />
            <Button
                type="submit"
                form="edit-asset-form"
                label={"Save"}
                icon="pi pi-check"
                loading={props.isSubmitting}
                disabled={props.isSubmitting}
            />
        </div>
    );

    return (
        <Dialog
            visible
            onHide={props.onHide}
            header={"Edit asset"}
            footer={footer}
            style={{ width: "540px" }}
            closable={!props.isSubmitting}
            modal
        >
            <RRForm method="post" id="edit-asset-form" className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-1">
                    <label htmlFor="field-name" className="text-sm font-medium text-gray-700">
                        {"Name"} <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="field-name"
                        name="name"
                        defaultValue={props.nameValue}
                        className="w-full"
                        invalid={!!props.nameError}
                        aria-invalid={props.nameError ? true : false}
                    />
                    {props.nameError ? <small className="text-red-700">{props.nameError}</small> : null}
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="field-category" className="text-sm font-medium text-gray-700">
                        {"Category"}
                    </label>
                    <InputText
                        id="field-category"
                        name="category"
                        defaultValue={props.item.category}
                        className="w-full"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="field-nationalId" className="text-sm font-medium text-gray-700">
                        {"National ID"}
                    </label>
                    <InputText
                        id="field-nationalId"
                        name="nationalId"
                        defaultValue={props.item.nationalId || ""}
                        className="w-full"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="field-notes" className="text-sm font-medium text-gray-700">
                        {"Notes"}
                    </label>
                    <InputTextarea
                        id="field-notes"
                        name="notes"
                        rows={3}
                        defaultValue={props.item.notes}
                        className="w-full"
                    />
                </div>

                <Divider className="my-1" />

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">{"Sector"}</label>

                </div>
            </RRForm>
        </Dialog>
    );
}
