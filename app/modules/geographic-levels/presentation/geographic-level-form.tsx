import { Form } from "react-router";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";

import type { DivisionBreadcrumbRow } from "~/backend.server/models/division";
import type { InsertDivision } from "~/drizzle/schema/divisionTable";
import GeographicLevelBreadcrumbs from "~/modules/geographic-levels/presentation/geographic-level-breadcrumbs";

interface GeographicLevelFormProps {
    edit: boolean;
    fields: InsertDivision;
    errors?: string[];
    breadcrumbs: DivisionBreadcrumbRow[] | null;
}

export default function GeographicLevelForm({
    edit,
    fields,
    errors,
    breadcrumbs,
}: GeographicLevelFormProps) {
    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <div className="flex flex-col gap-3">
                <GeographicLevelBreadcrumbs rows={breadcrumbs} linkLast />
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">
                        {edit ? "Edit division" : "Create division"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Update the division hierarchy and localized names.
                    </p>
                </div>
            </div>

            {errors && errors.length > 0 ? (
                <Message
                    severity="error"
                    content={
                        <ul className="list-disc pl-5">
                            {errors.map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    }
                />
            ) : null}

            <Card className="shadow-sm">
                <Form method="post" className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="parentId" className="text-sm font-medium text-slate-700">
                            Parent ID
                        </label>
                        <InputText
                            id="parentId"
                            name="parentId"
                            defaultValue={fields.parentId ? String(fields.parentId) : ""}
                            placeholder="Leave empty for a root division"
                        />
                    </div>

                    {fields.name &&
                        Object.keys(fields.name).map((lang) => (
                            <div key={lang} className="flex flex-col gap-2">
                                <label
                                    htmlFor={`names_${lang}`}
                                    className="text-sm font-medium text-slate-700"
                                >
                                    {`Name (${lang.toUpperCase()})`}
                                </label>
                                <InputText
                                    id={`names_${lang}`}
                                    name={`names[${lang}]`}
                                    defaultValue={fields.name?.[lang] || ""}
                                />
                            </div>
                        ))}

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                            type="submit"
                            label={edit ? "Update division" : "Create division"}
                            icon="pi pi-save"
                        />
                        <Button
                            type="button"
                            label="Back to list"
                            icon="pi pi-arrow-left"
                            severity="secondary"
                            outlined
                            onClick={() => {
                                window.location.href = `/settings/geography${fields.parentId ? `?parent=${fields.parentId}` : ""}`;
                            }}
                        />
                    </div>
                </Form>
            </Card>
        </div>
    );
}
