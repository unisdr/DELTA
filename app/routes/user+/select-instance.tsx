import { ActionFunctionArgs, useActionData, useNavigate, useNavigation, useSubmit } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { LoaderFunctionArgs } from "react-router";

import {
	countryAccountTypesTable,
} from "~/drizzle/schema/countryAccountsTable";
import { LoaderDataType, SelectInstanceService } from "~/services/selectInstanceService";


import { Toast } from "primereact/toast";
import { ListBox } from "primereact/listbox";
import { Dialog } from "primereact/dialog";
import Tag from "~/components/Tag";
import { Button } from "primereact/button";

export const loader = async (args: LoaderFunctionArgs) => {
	return SelectInstanceService.loader(args);
};

export const action = async (args: ActionFunctionArgs) => {
	return SelectInstanceService.action(args);
};

export default function SelectInstance() {
	const ld = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const submit = useSubmit();
	const { data, hasSessionCountryAccountId, cancelRedirectTo } = ld;
	const [selectedCountryAccounts, setSelectedCountryAccounts] =
		useState<LoaderDataType | null>(null);
	const [dialogVisible] = useState(true);
	const [noSelectionDialogVisible, setNoSelectionDialogVisible] =
		useState(false);
	const toast = useRef<Toast>(null);
	const [isRtl, setIsRtl] = useState(false);
	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting"

	useEffect(() => {
		setIsRtl(document.dir === "rtl");
	}, []);
	useEffect(() => {
		if (actionData?.ok === false && actionData.errors?.countryInstance) {
			setNoSelectionDialogVisible(true);
		}
	}, [actionData]);

	const countryTemplate = (option: LoaderDataType) => {
		const instanceType = option.countryAccount.type;
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
				}}
			>
				<div style={{ display: "flex", alignItems: "center" }}>
					<img
						alt={option.countryAccount.country.name}
						src={option.countryAccount.country.flagUrl}
						style={{ width: "18px", marginInlineEnd: "12px" }}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							lineHeight: 1.2,
						}}
					>
						<span style={{ fontWeight: "500" }}>
							{option.countryAccount.country.name}
						</span>
						<small>{option.countryAccount.shortDescription}</small>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Tag severity="info" value={option.role} />
					<Tag
						value={instanceType}
						severity={
							instanceType === countryAccountTypesTable.OFFICIAL
								? "info"
								: "warning"
						}
					/>
					<i
						className={`pi ${isRtl ? "pi-arrow-left" : "pi-arrow-right"}`}
						style={{ fontSize: "1rem" }}
					/>
				</div>
			</div>
		);
	};

	const handleCloseDialog = () => {
		if (hasSessionCountryAccountId) {
			navigate(cancelRedirectTo);
			return;
		}

		setNoSelectionDialogVisible(true);
	};

	const handleInstanceSelect = (option: LoaderDataType | null) => {
		setSelectedCountryAccounts(option);

		if (!option?.countryAccountsId) {
			setNoSelectionDialogVisible(true);
			return;
		}

		submit(
			{ countryAccountsId: option.countryAccountsId },
			{ method: "post" },
		);
	};

	const handleRedirectToLogin = () => {
		setNoSelectionDialogVisible(false);
		submit(null, {
			method: "post",
			action: "/user/logout?redirectTo=/user/login",
		});
	};

	return (
		<>
			<Toast ref={toast} />
			<Dialog
				visible={noSelectionDialogVisible}
				onHide={() => setNoSelectionDialogVisible(false)}
				header={"Instance selection required"}
				modal
				style={{ width: "100%", maxWidth: "520px" }}
			>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-gray-700">
						{"If you do not select an instance, you will be redirected to the login page."}
					</p>
					<div className="flex justify-end gap-2">
						<Button
							outlined
							onClick={() => setNoSelectionDialogVisible(false)}
							label={"Cancel"}
							icon="pi pi-times"
						/>
						<Button
							onClick={handleRedirectToLogin}
							label={"Go to login"}
							icon="pi pi-sign-in"
						/>
					</div>
				</div>
			</Dialog>
			<Dialog
				visible={dialogVisible}
				onHide={handleCloseDialog}
				header={"Select an instance"}
				modal
				style={{ width: "100%", maxWidth: "600px" }}
				className="rounded-lg"
			>
				<div className="flex flex-col gap-6">
					{/* Intro */}
					<div>
						<h3 className="text-lg font-semibold text-gray-800">
							{`We found ${data.length} instance(s) associated with your email ID. Please select the instance you want to review.`}
						</h3>
					</div>

					{/* Body */}
					<div className="flex flex-col gap-4">
						<input
							type="hidden"
							name="countryAccountsId"
							value={selectedCountryAccounts?.countryAccountsId ?? ""}
						/>

						<ListBox
							value={selectedCountryAccounts}
							onChange={(e) => handleInstanceSelect(e.value)}
							options={data}
							className="w-full"
							itemTemplate={countryTemplate}
							listStyle={{ maxHeight: "250px" }}
							disabled={isSubmitting}
						/>
					</div>

					{/* Footer Message */}
					<div className="text-sm text-gray-600 text-center pt-2">
						<div>{"Don't see the right instance?"}</div>
						<div>{"Contact your team admin to get access."}</div>
					</div>
				</div>
			</Dialog>
		</>
	);
}
