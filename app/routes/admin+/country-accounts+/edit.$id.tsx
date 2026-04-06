import { useMemo, useState } from "react";
import {
    Form,
    useActionData,
    useLoaderData,
    useNavigate,
    useNavigation,
} from "react-router";
import { eq } from "drizzle-orm";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";


import { dr } from "~/db.server";
import { CountryRepository } from "~/db/queries/countriesRepository";
import {
    CountryAccountStatus,
    countryAccountStatuses,
    countryAccountTypesTable,
} from "~/drizzle/schema/countryAccountsTable";
import { COUNTRY_TYPE, CountryType } from "~/drizzle/schema/countriesTable";
import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import {
    CountryAccountService,
    CountryAccountValidationError,
} from "~/services/countryAccountService";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { redirectWithMessage } from "~/utils/session";


type ActionData = {
    errors: string[];
    formValues?: { status?: string };
};

export const loader = authLoaderWithPerm(
    "EditCountryAccount",
    async (loaderArgs) => {
        const id = loaderArgs.params.id!;

        const countryAccount = await dr.query.countryAccountsTable.findFirst({
            where: (ca, { eq }) => eq(ca.id, id),
            with: {
                country: true,
                userCountryAccounts: {
                    where: eq(userCountryAccountsTable.isPrimaryAdmin, true),
                    limit: 1,
                    with: {
                        user: true,
                    },
                },
            },
            columns: {
                id: true,
                status: true,
                type: true,
                shortDescription: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!countryAccount) {
            throw new Response("Not Found", { status: 404 });
        }

        const countries = await CountryRepository.getAll();
        return { countryAccount, countries };
    },
);

export const action = authActionWithPerm(
    "EditCountryAccount",
    async (actionArgs) => {
        const { request } = actionArgs;

        const formData = await request.formData();
        const status = formData.get("status");
        const shortDescription = formData.get("shortDescription") as string;
        const id = actionArgs.params.id!;

        try {
            // Update status and short description
            await CountryAccountService.updateStatus(
                id,
                Number(status),
                shortDescription,
            );
            return redirectWithMessage(actionArgs, "/admin/country-accounts", {
                type: "info",
                text: "Country account updated successfully",
            });
        } catch (error) {
            if (error instanceof CountryAccountValidationError) {
                return {
                    errors: error.errors,
                    formValues: { status: String(status) },
                } satisfies ActionData;
            }
            console.log(error);
            return { errors: ["An unexpected error occurred"] } satisfies ActionData;
        }
    },
);

export default function CountryAccountsEditPage() {
    const ld = useLoaderData<typeof loader>();

    const { countryAccount, countries } = ld;

    const countryOptions = useMemo(
        () => countries.map((c) => ({ label: c.name, value: c.id })),
        [countries],
    );

    const actionData = useActionData<typeof action>();
    const errors = actionData && "errors" in actionData ? actionData.errors : [];
    const shortDescriptionError = errors.find((error) =>
        error.includes("Short description") || error.includes("short description"),
    );
    const statusError = errors.find(
        (error) => error.includes("Status") || error.includes("status"),
    );
    const emailError = errors.find(
        (error) => error.includes("email") || error.includes("Email") || error.includes("User"),
    );
    const unknownError = errors.find(
        (error) =>
            error !== shortDescriptionError &&
            error !== statusError &&
            error !== emailError,
    );

    const navigate = useNavigate();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const [status, setStatus] = useState<CountryAccountStatus>(
        countryAccount.status as CountryAccountStatus,
    );
    const [shortDescription, setShortDescription] = useState(
        countryAccount.shortDescription,
    );

    const adminUser = countryAccount.userCountryAccounts[0]?.user;

    const footerContent = (
        <div className="flex w-full justify-end gap-2">
            <Button
                type="button"
                outlined
                icon="pi pi-times"
                label={"Cancel"}
                onClick={() => navigate("/admin/country-accounts/")}
            />
            <Button
                type="submit"
                form="editCountryAccountForm"
                label={"Save"}
                icon="pi pi-check"
                loading={isSubmitting}
            />
        </div>
    );

    return (
        <Dialog
            visible
            header={"Edit country account"}
            onHide={() => navigate("/admin/country-accounts/")}
            footer={footerContent}
            pt={{ footer: { className: "px-6 pt-0 pb-4" } }}
            className="w-full max-w-3xl"
            draggable={false}
            resizable={false}
        >
            <Form method="post" id="editCountryAccountForm">
                <div className="dts-form__body space-y-4">
                    <div className="space-y-2">
                        <label>
                            <div className="mb-1 font-medium text-gray-700">
                                {"Country type"}
                            </div>
                            <SelectButton
                                value={countryAccount.country.type as CountryType}
                                options={[
                                    { label: COUNTRY_TYPE.REAL, value: COUNTRY_TYPE.REAL },
                                    {
                                        label: COUNTRY_TYPE.FICTIONAL,
                                        value: COUNTRY_TYPE.FICTIONAL,
                                    },
                                ]}
                                optionLabel="label"
                                optionValue="value"
                                disabled
                                className="w-full"
                            />
                        </label>
                    </div>
                    <div className="space-y-2">
                        <label>
                            <div className="mb-1 font-medium text-gray-700">
                                {"Country"}
                            </div>
                            <input
                                type="hidden"
                                name="countryId"
                                value={countryAccount.country.id}
                            />
                            <Dropdown
                                value={countryAccount.country.id}
                                options={countryOptions}
                                optionLabel="label"
                                optionValue="value"
                                disabled
                                className="w-full"
                            />
                        </label>
                    </div>
                    <div className="space-y-2">
                        <label>
                            <div className="mb-1 font-medium text-gray-700">
                                {"Short description"}
                            </div>
                            <InputText
                                name="shortDescription"
                                aria-label="short description"
                                placeholder={"Max {n} characters"}
                                maxLength={20}
                                value={shortDescription}
                                onChange={(e) => setShortDescription(e.target.value)}
                                className="w-full"
                                invalid={!!shortDescriptionError}
                            />
                        </label>
                        {shortDescriptionError ? (
                            <small className="text-red-700">{shortDescriptionError}</small>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        <label>
                            <div className="mb-1 font-medium text-gray-700">
                                {"Status"}
                            </div>
                            <input type="hidden" name="status" value={status} />
                            <Dropdown
                                value={status}
                                options={[
                                    {
                                        label: "Active",
                                        value: countryAccountStatuses.ACTIVE,
                                    },
                                    {
                                        label: "Inactive",
                                        value: countryAccountStatuses.INACTIVE,
                                    },
                                ]}
                                onChange={(e) => setStatus(e.value as CountryAccountStatus)}
                                className="w-full"
                            />
                        </label>
                        {statusError ? <small className="text-red-700">{statusError}</small> : null}
                    </div>
                    <div className="space-y-2">
                        <label>
                            <div className="mb-1 font-medium text-gray-700">
                                {"Admin's email"}
                            </div>
                            <InputText
                                name="email"
                                aria-label={"Main admin's email"}
                                value={adminUser?.email ?? ""}
                                disabled
                                className="w-full"
                            />
                        </label>
                        {emailError ? <small className="text-red-700">{emailError}</small> : null}
                        {unknownError ? <small className="text-red-700">{unknownError}</small> : null}
                    </div>
                    <div className="space-y-2">
                        <label>
                            <div className="mb-1 font-medium text-gray-700">
                                {"Instance type"}
                            </div>
                            <SelectButton
                                value={countryAccount.type}
                                options={[
                                    {
                                        label: "Official",
                                        value: countryAccountTypesTable.OFFICIAL,
                                    },
                                    {
                                        label: "Training",
                                        value: countryAccountTypesTable.TRAINING,
                                    },
                                ]}
                                optionLabel="label"
                                optionValue="value"
                                disabled
                                className="w-full"
                            />
                        </label>
                    </div>
                </div>
            </Form>
        </Dialog>
    );
}
