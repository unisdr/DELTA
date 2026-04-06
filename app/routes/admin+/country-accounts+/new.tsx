import { useMemo, useState } from "react";
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigate,
	useNavigation,
} from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";


import { CountryRepository } from "~/db/queries/countriesRepository";
import {
	CountryAccountStatus,
	countryAccountStatuses,
	CountryAccountType,
	countryAccountTypesTable,
} from "~/drizzle/schema/countryAccountsTable";
import { COUNTRY_TYPE, CountryType } from "~/drizzle/schema/countriesTable";
import {
	CountryAccountService,
	CountryAccountValidationError,
} from "~/services/countryAccountService";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { redirectWithMessage } from "~/utils/session";


type ActionData = {
	errors: string[];
	formValues?: {
		countryId?: string;
		status?: string;
		email?: string;
		countryAccountType?: string;
	};
};

export const loader = authLoaderWithPerm(
	"AddCountryAccount",
	async () => {
		const countries = await CountryRepository.getAll();
		return { countries };
	},
);

export const action = authActionWithPerm(
	"AddCountryAccount",
	async (actionArgs) => {
		const { request } = actionArgs;

		const formData = await request.formData();
		const countryId = formData.get("countryId") as string;
		const status = formData.get("status");
		const email = formData.get("email") as string;
		const shortDescription = formData.get("shortDescription") as string;
		const countryAccountType = formData.get("countryAccountTypeChoice") as string;

		try {
			await CountryAccountService.create(
				countryId,
				shortDescription,
				email,
				Number(status),
				countryAccountType,
			);
			return redirectWithMessage(actionArgs, "/admin/country-accounts", {
				type: "success",
				text: "Country account created successfully",
			});
		} catch (error) {
			if (error instanceof CountryAccountValidationError) {
				return {
					errors: error.errors,
					formValues: {
						countryId,
						status: String(status),
						email,
						countryAccountType,
					},
				} satisfies ActionData;
			}
			console.log(error);
			return { errors: ["An unexpected error occurred"] } satisfies ActionData;
		}
	},
);

export default function CountryAccountsNewPage() {
	const ld = useLoaderData<typeof loader>();

	const { countries } = ld;

	const [selectedCountryType, setSelectedCountryType] = useState<CountryType>(
		COUNTRY_TYPE.REAL,
	);

	const countryOptions = useMemo(
		() =>
			countries
				.filter((c) => c.type === selectedCountryType)
				.map((c) => ({ label: c.name, value: c.id })),
		[countries, selectedCountryType],
	);

	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors ?? [];
	const countryError = errors.find(
		(error) =>
			error.includes("Country") ||
			error.includes("country") ||
			error.includes("official account"),
	);
	const shortDescriptionError = errors.find((error) =>
		error.includes("Short description"),
	);
	const statusError = errors.find(
		(error) => error.includes("Status") || error.includes("status"),
	);
	const emailError = errors.find(
		(error) => error.includes("email") || error.includes("Email"),
	);
	const typeError = errors.find((error) => error.includes("instance type"));
	const unknownError = errors.find(
		(error) =>
			error !== countryError &&
			error !== shortDescriptionError &&
			error !== statusError &&
			error !== emailError &&
			error !== typeError,
	);

	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	const [selectedCountryId, setSelectedCountryId] = useState("-1");
	const [type, setType] = useState<CountryAccountType>(
		countryAccountTypesTable.OFFICIAL,
	);
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<CountryAccountStatus>(
		countryAccountStatuses.ACTIVE,
	);
	const [shortDescription, setShortDescription] = useState("");
	const isFictionalCountryType = selectedCountryType === COUNTRY_TYPE.FICTIONAL;

	const footerContent = (
		<div className="flex w-full justify-end gap-2">
			<Button
				type="button"
				outlined
				label={"Cancel"}
				onClick={() => navigate("/admin/country-accounts/")}
				icon="pi pi-times"
			/>
			<Button
				type="submit"
				form="newCountryAccountForm"
				label={"Save"}
				icon="pi pi-check"
				loading={isSubmitting}
			/>
		</div>
	);

	return (
		<Dialog
			visible
			header={"Create country account"}
			onHide={() => navigate("/admin/country-accounts/")}
			footer={footerContent}
			pt={{ footer: { className: "px-6 pt-0 pb-4" } }}
			className="w-full max-w-3xl"
			draggable={false}
			resizable={false}
		>
			<Form method="post" id="newCountryAccountForm">
				<div className="space-y-4">
					<div className="space-y-2">
						<label className="mb-2 block font-medium text-gray-700">
							{"Country type"}
						</label>
						<SelectButton
							value={selectedCountryType}
							onChange={(e) => {
								const countryType = e.value as CountryType;
								setSelectedCountryType(countryType);
								setSelectedCountryId("-1");
								if (countryType === COUNTRY_TYPE.FICTIONAL) {
									setType(countryAccountTypesTable.TRAINING);
								}
							}}
							options={[
								{ label: COUNTRY_TYPE.REAL, value: COUNTRY_TYPE.REAL },
								{ label: COUNTRY_TYPE.FICTIONAL, value: COUNTRY_TYPE.FICTIONAL },
							]}
							optionLabel="label"
							optionValue="value"
							className="w-full"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="countryId" className="mb-1 block font-medium text-gray-700">
							{"Country"}
						</label>
						<Dropdown
							inputId="countryId"
							name="countryId"
							value={selectedCountryId}
							options={countryOptions}
							optionLabel="label"
							optionValue="value"
							onChange={(e) => setSelectedCountryId(e.value)}
							placeholder={"Select a country"}
							filterBy="label"
							filter
							virtualScrollerOptions={{ itemSize: 38 }}
							scrollHeight="260px"
							className="w-full"
							invalid={!!countryError}
						/>
						{countryError ? <small className="text-red-700">{countryError}</small> : null}
					</div>
					<div className="space-y-2">
						<label
							htmlFor="shortDescription"
							className="mb-1 block font-medium text-gray-700"
						>
							{"Short description"}
						</label>
						<InputText
							id="shortDescription"
							name="shortDescription"
							aria-label="short description"
							placeholder={"Max {n} characters"}
							maxLength={20}
							value={shortDescription}
							onChange={(e) => setShortDescription(e.target.value)}
							className="w-full"
							invalid={!!shortDescriptionError}
						/>
						{shortDescriptionError ? (
							<small className="text-red-700">{shortDescriptionError}</small>
						) : null}
					</div>
					<div className="space-y-2">
						<label htmlFor="status" className="mb-1 block font-medium text-gray-700">
							{"Status"}
						</label>
						<Dropdown
							inputId="status"
							name="status"
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
							invalid={!!statusError}
						/>
						{statusError ? <small className="text-red-700">{statusError}</small> : null}
					</div>
					<div className="space-y-2">
						<label htmlFor="email" className="mb-1 block font-medium text-gray-700">
							{"Admin's email"}
						</label>
						<InputText
							id="email"
							name="email"
							aria-label={"Main admin's email"}
							placeholder={"Enter email"}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full"
							invalid={!!emailError}
						/>
						{emailError ? <small className="text-red-700">{emailError}</small> : null}
					</div>
					<div className="space-y-2">
						<label className="mb-2 block font-medium text-gray-700">
							{"Instance type"}
						</label>
						<input type="hidden" name="countryAccountTypeChoice" value={type} />
						<SelectButton
							value={type}
							onChange={(e) => setType(e.value as CountryAccountType)}
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
							disabled={isFictionalCountryType}
							className="w-full"
						/>
						{typeError ? <small className="text-red-700">{typeError}</small> : null}
						{unknownError ? <small className="text-red-700">{unknownError}</small> : null}
					</div>
				</div>
			</Form>
		</Dialog>
	);
}
