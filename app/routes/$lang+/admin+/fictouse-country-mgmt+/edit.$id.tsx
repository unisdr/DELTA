import { useState } from "react";
import { eq } from "drizzle-orm";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

import { BackendContext } from "~/backend.server/context";
import { dr } from "~/db.server";
import { countriesTable, COUNTRY_TYPE } from "~/drizzle/schema/countriesTable";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { redirectWithMessage } from "~/utils/session";
import { ViewContext } from "~/frontend/context";

type ActionData =
    | { errors: string[] }
    | undefined;

export const loader = authLoaderWithPerm(
    "manage_country_accounts",
    async (loaderArgs) => {
        const id = loaderArgs.params.id!;
        const result = await dr
            .select({
                id: countriesTable.id,
                name: countriesTable.name,
                type: countriesTable.type,
            })
            .from(countriesTable)
            .where(eq(countriesTable.id, id))
            .limit(1);

        const country = result[0] ?? null;
        if (!country || country.type !== COUNTRY_TYPE.FICTIONAL) {
            throw new Response("Not Found", { status: 404 });
        }

        return { country };
    },
);

export const action = authActionWithPerm(
    "manage_country_accounts",
    async (actionArgs) => {
        const { request } = actionArgs;
        const backendCtx = new BackendContext(actionArgs);
        const id = actionArgs.params.id!;
        const formData = await request.formData();
        const name = String(formData.get("name") ?? "").trim();

        if (!name) {
            return { errors: ["Name is required"] } satisfies ActionData;
        }

        try {
            const existing = await dr
                .select({ id: countriesTable.id, type: countriesTable.type })
                .from(countriesTable)
                .where(eq(countriesTable.id, id))
                .limit(1);

            if (!existing[0] || existing[0].type !== COUNTRY_TYPE.FICTIONAL) {
                throw new Response("Not Found", { status: 404 });
            }

            await dr
                .update(countriesTable)
                .set({
                    name,
                    type: COUNTRY_TYPE.FICTIONAL,
                    iso3: null,
                })
                .where(eq(countriesTable.id, id));

            return redirectWithMessage(actionArgs, "/admin/fictouse-country-mgmt", {
                type: "success",
                text: backendCtx.t({
                    code: "common.changes_saved",
                    msg: "Changes saved",
                }),
            });
        } catch (error) {
            const message =
                error instanceof Error && error.message.includes("unique")
                    ? "A country with this name already exists"
                    : "An unexpected error occurred";
            return { errors: [message] } satisfies ActionData;
        }
    },
);

export default function FictitiousCountryEditPage() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const actionData = useActionData<typeof action>();
    const navigate = useNavigate();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const [name, setName] = useState(ld.country.name);
    const nameError = actionData?.errors?.[0] ?? "";

    return (
        <Dialog
            header={ctx.t({
                code: "admin.edit_fictitious_country",
                msg: "Edit fictitious country",
            })}
            visible
            modal
            onHide={() => navigate(ctx.url("/admin/fictouse-country-mgmt"))}
            className="w-[32rem] max-w-full"
        >
            <Form method="post" className="flex flex-col" noValidate>
                <p className="mb-3 text-red-700">* Required information</p>
                <div className="mb-3 flex flex-col gap-2">
                    <label htmlFor="edit-fictitious-country-name">
                        <span className="inline-flex gap-1">
                            <span>{ctx.t({ code: "common.name", msg: "Name" })}</span>
                            <span className="text-red-700">*</span>
                        </span>
                    </label>
                    <InputText
                        id="edit-fictitious-country-name"
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
                        label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
                        onClick={() => navigate(ctx.url("/admin/fictouse-country-mgmt"))}
                    />
                    <Button
                        type="submit"
                        label={ctx.t({ code: "common.save", msg: "Save" })}
                        icon="pi pi-check"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    />
                </div>
            </Form>
        </Dialog>
    );
}
