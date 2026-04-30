import { useNavigate, Form, useActionData, useNavigation } from "react-router";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";
import { authActionWithPerm } from "~/utils/auth";
import { redirectWithMessage } from "~/utils/session";
import {
    CountryAccountService,
    CountryAccountValidationError,
} from "~/services/countryAccountService";

type ActionData = {
    errors: string[];
};

export const action = authActionWithPerm(
    "CloneCountryAccount",
    async (actionArgs) => {
        const { request } = actionArgs;
        const formData = await request.formData();
        const countryAccountId = actionArgs.params.id as string;
        const shortDescription = formData.get("shortDescription") as string;

        try {
            await CountryAccountService.clone(countryAccountId, shortDescription);
            const ctx = new BackendContext(actionArgs);
            return redirectWithMessage(actionArgs, "/admin/country-accounts", {
                type: "success",
                text: ctx.t({
                    code: "admin.country_account_cloned",
                    msg: "Country account cloned successfully",
                }),
            });
        } catch (error) {
            if (error instanceof CountryAccountValidationError) {
                return { errors: error.errors } satisfies ActionData;
            }

            const ctx = new BackendContext(actionArgs);
            return {
                errors: [
                    ctx.t({
                        code: "common.unexpected_error",
                        msg: "An unexpected error occurred",
                    }),
                ],
            } satisfies ActionData;
        }
    },
);

export default function CloneCountryAccountDialog() {
    const navigate = useNavigate();
    const ctx = new ViewContext();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const error = actionData?.errors?.[0] || null;

    const handleClose = () => {
        navigate({
            pathname: ctx.url("/admin/country-accounts"),
            search: window.location.search,
        });
    };

    return (
        <Dialog
            visible
            onHide={handleClose}
            header={ctx.t({
                code: "admin.clone_country_account",
                msg: "Clone Country Account",
            })}
            modal
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
                        icon="pi pi-times"
                        onClick={handleClose}
                        outlined
                    />
                    <Button
                        type="submit"
                        form="cloneCountryAccountForm"
                        label={ctx.t({ code: "common.clone", msg: "Clone" })}
                        icon="pi pi-check"
                        loading={isSubmitting}
                    />
                </div>
            }
            pt={{ footer: { className: "px-6 pt-0 pb-4" } }}
            className="w-full max-w-3xl"
            draggable={false}
            resizable={false}
        >
            <Form method="post" id="cloneCountryAccountForm">
                <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <label htmlFor="shortDescription" className="mb-1 block font-medium text-gray-700">
                            {ctx.t({
                                code: "common.short_description",
                                msg: "Short description",
                            })}
                        </label>
                        <InputText
                            id="shortDescription"
                            name="shortDescription"
                            placeholder={ctx.t(
                                {
                                    code: "admin.max_n_characters",
                                    desc: "Maximum character limit for input, currently set to 20",
                                    msg: "Max {n} characters",
                                },
                                { n: 20 },
                            )}
                            maxLength={20}
                            className="w-full"
                            invalid={!!error}
                        />
                        {error ? (
                            <small className="flex items-center gap-1 text-red-700 mt-2">
                                <i className="pi pi-info-circle text-sm" aria-hidden="true"></i>
                                {error}
                            </small>
                        ) : null}
                    </div>
                </div>
            </Form>
        </Dialog>
    );
}
