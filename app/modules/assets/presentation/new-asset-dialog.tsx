import { Form as RRForm } from "react-router";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";

interface NewAssetDialogProps {
    isSubmitting: boolean;
    onHide(): void;
    actionData?: {
        ok?: boolean;
        error?: string;
    };
    initialSectorIds?: string;
    initialSectorDisplay?: any;
}

export default function NewAssetDialog(props: NewAssetDialogProps) {
    const nameError = props.actionData && !props.actionData.ok ? props.actionData.error || "" : "";

    const footer = (
        <div className="flex justify-end gap-2">
            <Button
                type="button"
                label={"Cancel"}
                outlined
                icon="pi pi-times"
                onClick={props.onHide}
                disabled={props.isSubmitting}
            />
            <Button
                type="submit"
                form="new-asset-form"
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
            header={"Add new asset"}
            footer={footer}
            style={{ width: "540px" }}
            closable={!props.isSubmitting}
            modal
        >
            <RRForm method="post" id="new-asset-form" className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-1">
                    <label htmlFor="field-name" className="text-sm font-medium text-gray-700">
                        {"Name"} <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="field-name"
                        name="name"
                        className="w-full"
                        invalid={!!nameError}
                        aria-invalid={nameError ? true : false}
                    />
                    {nameError ? <small className="text-red-700">{nameError}</small> : null}
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="field-category" className="text-sm font-medium text-gray-700">
                        {"Category"}
                    </label>
                    <InputText id="field-category" name="category" className="w-full" />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="field-nationalId" className="text-sm font-medium text-gray-700">
                        {"National ID"}
                    </label>
                    <InputText id="field-nationalId" name="nationalId" className="w-full" />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="field-notes" className="text-sm font-medium text-gray-700">
                        {"Notes"}
                    </label>
                    <InputTextarea id="field-notes" name="notes" rows={3} className="w-full" />
                </div>

                <Divider className="my-1" />

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">{"Sector"}</label>

                </div>
            </RRForm>
        </Dialog>
    );
}
