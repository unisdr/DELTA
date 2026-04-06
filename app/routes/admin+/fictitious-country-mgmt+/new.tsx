import { useState } from "react";
import { Form, useActionData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";


import {
    FictitiousCountryService,
    FictitiousCountryValidationError,
} from "~/services/fictitiousCountryService";
import { authActionWithPerm } from "~/utils/auth";
import { redirectWithMessage } from "~/utils/session";


type ActionData =
    | { errors: string[] }
    | undefined;

export const action = authActionWithPerm(
    "AddFictitiousCountry",
    async (actionArgs) => {
        const { request } = actionArgs;

        const formData = await request.formData();
        const name = String(formData.get("name") ?? "");

        try {
            await FictitiousCountryService.create(name);

            return redirectWithMessage(actionArgs, "/admin/fictitious-country-mgmt", {
                type: "success",
                text: "New record created",
            });
        } catch (error) {
            if (error instanceof FictitiousCountryValidationError) {
                return { errors: error.errors } satisfies ActionData;
            }
            return { errors: ["An unexpected error occurred"] } satisfies ActionData;
        }
    },
);

export default function FictitiousCountryNewPage() {

    const actionData = useActionData<typeof action>();
    const navigate = useNavigate();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const [name, setName] = useState("");
    const nameError = actionData?.errors?.[0] ?? "";

    return (
        <Dialog
            header={"Add fictitious country"}
            visible
            modal
            onHide={() => navigate("/admin/fictitious-country-mgmt")}
            className="w-[32rem] max-w-full"
        >
            <Form method="post" className="flex flex-col" noValidate>
                <p className="mb-3 text-red-700">* Required information</p>
                <div className="mb-3 flex flex-col gap-2">
                    <label htmlFor="new-fictitious-country-name">
                        <span className="inline-flex gap-1">
                            <span>{"Name"}</span>
                            <span className="text-red-700">*</span>
                        </span>
                    </label>
                    <InputText
                        id="new-fictitious-country-name"
                        name="name"
                        value={name}
                        invalid={!!nameError}
                        aria-invalid={nameError ? true : false}
                        onChange={(e) => setName(e.target.value)}
                    />
                    {nameError ? <small className="text-red-700">{nameError}</small> : null}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        type="button"
                        outlined
                        icon="pi pi-times"
                        label={"Cancel"}
                        onClick={() => navigate("/admin/fictitious-country-mgmt")}
                    />
                    <Button
                        type="submit"
                        label={"Save"}
                        icon="pi pi-check"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    />
                </div>
            </Form>
        </Dialog>
    );
}
