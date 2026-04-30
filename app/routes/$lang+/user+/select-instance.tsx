import {
	ActionFunctionArgs,
	useActionData,
	useNavigate,
	useNavigation,
	useSubmit,
} from "react-router";
import { useEffect, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { LoaderFunctionArgs } from "react-router";

import { countryAccountTypesTable } from "~/drizzle/schema/countryAccountsTable";
import {
	LoaderDataType,
	SelectInstanceService,
} from "~/services/selectInstanceService";

import { ViewContext } from "~/frontend/context";

import { Toast } from "primereact/toast";
import { ListBox } from "primereact/listbox";
import { Dialog } from "primereact/dialog";
import Tag from "~/components/Tag";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";

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
	const ctx = new ViewContext();
	const [selectedCountryAccounts, setSelectedCountryAccounts] =
		useState<LoaderDataType | null>(null);
	const [dialogVisible] = useState(true);
	const [noSelectionDialogVisible, setNoSelectionDialogVisible] =
		useState(false);
	const [loadingVisible, setLoadingVisible] = useState(false);
	const [loadingInstance, setLoadingInstance] = useState<LoaderDataType | null>(
		null,
	);
	const toast = useRef<Toast>(null);
	const submitDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const [isRtl, setIsRtl] = useState(false);
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const isBusy = loadingVisible;

	useEffect(() => {
		setIsRtl(document.dir === "rtl");
	}, []);
	useEffect(() => {
		if (actionData?.ok === false && actionData.errors?.countryInstance) {
			setNoSelectionDialogVisible(true);
		}
	}, [actionData]);

	useEffect(() => {
		if (
			navigation.state === "idle" &&
			loadingVisible &&
			submitDelayTimeoutRef.current === null
		) {
			setLoadingVisible(false);
			setLoadingInstance(null);
		}
	}, [loadingVisible, navigation.state]);

	useEffect(() => {
		return () => {
			if (submitDelayTimeoutRef.current) {
				clearTimeout(submitDelayTimeoutRef.current);
				submitDelayTimeoutRef.current = null;
			}
		};
	}, []);

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
		if (isBusy) {
			return;
		}

		if (hasSessionCountryAccountId) {
			navigate(cancelRedirectTo);
			return;
		}

		setNoSelectionDialogVisible(true);
	};

	const handleInstanceSelect = (option: LoaderDataType | null) => {
		if (isBusy) {
			return;
		}

		setSelectedCountryAccounts(option);

		if (!option?.countryAccountsId) {
			setNoSelectionDialogVisible(true);
			return;
		}

		if (submitDelayTimeoutRef.current) {
			clearTimeout(submitDelayTimeoutRef.current);
			submitDelayTimeoutRef.current = null;
		}

		setLoadingInstance(option);
		setLoadingVisible(true);

		submitDelayTimeoutRef.current = setTimeout(() => {
			submitDelayTimeoutRef.current = null;
			submit(
				{ countryAccountsId: option.countryAccountsId },
				{ method: "post" },
			);
		}, 1000);
	};

	const handleRedirectToLogin = () => {
		setNoSelectionDialogVisible(false);
		submit(null, {
			method: "post",
			action: `/${ctx.lang}/user/logout?redirectTo=/user/login`,
		});
	};

	return (
		<>
			<Toast ref={toast} />
			<Dialog
				visible={noSelectionDialogVisible}
				onHide={() => setNoSelectionDialogVisible(false)}
				header={ctx.t({
					code: "user_select_instance.instance_required",
					msg: "Instance selection required",
				})}
				modal
				style={{ width: "100%", maxWidth: "520px" }}
			>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-gray-700">
						{ctx.t({
							code: "user_select_instance.no_selection_redirect_login",
							msg: "If you do not select an instance, you will be redirected to the login page.",
						})}
					</p>
					<div className="flex justify-end gap-2">
						<Button
							outlined
							onClick={() => setNoSelectionDialogVisible(false)}
							label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
							icon="pi pi-times"
						/>
						<Button
							onClick={handleRedirectToLogin}
							label={ctx.t({ code: "common.go_to_login", msg: "Go to login" })}
							icon="pi pi-sign-in"
						/>
					</div>
				</div>
			</Dialog>
			<Dialog
				visible={dialogVisible}
				onHide={handleCloseDialog}
				header={ctx.t({
					code: "user_select_instance.select_instance",
					msg: "Select an instance",
				})}
				modal
				style={{ width: "100%", maxWidth: "600px" }}
				className="rounded-lg"
			>
				<div className="flex flex-col gap-6">
					{/* Intro */}
					<div>
						<h3 className="text-lg font-semibold text-gray-800">
							{ctx.t(
								{
									code: "user_select_instance.instances_found",
									msg: "We found {n} instance(s) associated with your email ID. Please select the instance you want to review.",
								},
								{ n: data.length },
							)}
						</h3>
					</div>

					{/* Body */}
					<div className="flex flex-col gap-4">
						<input
							type="hidden"
							name="countryAccountsId"
							value={selectedCountryAccounts?.countryAccountsId ?? ""}
						/>

						{isBusy ? (
							<div className="w-full rounded-lg border border-gray-200 bg-white p-4">
								<div
									className="flex flex-col items-center justify-center gap-3 text-center"
									style={{ minHeight: "230px" }}
								>
									{loadingInstance && (
										<div className="flex items-center gap-2 text-gray-800">
											<img
												alt={loadingInstance.countryAccount.country.name}
												src={loadingInstance.countryAccount.country.flagUrl}
												style={{ width: "18px" }}
											/>
											<span className="font-medium">
												{loadingInstance.countryAccount.country.name}
											</span>
											<span className="text-sm text-gray-600">
												({loadingInstance.countryAccount.type})
											</span>
										</div>
									)}

									<div className="flex flex-col gap-2 text-sm">
										<strong className="text-lg text-gray-800">
											{ctx.t({
												code: "user_select_instance.loading_instance_title",
												msg: "Loading instance",
											})}
										</strong>
										<span className="mx-auto w-1/2 text-gray-700">
											{ctx.t({
												code: "user_select_instance.loading_instance_msg",
												msg: "We are fetching the data, this may take up to a few minutes. Please don't close the window.",
											})}
										</span>
									</div>
									<ProgressSpinner
										style={{ width: "2rem", height: "2rem" }}
										strokeWidth="6"
										fill="transparent"
										animationDuration="1s"
									/>
								</div>
							</div>
						) : (
							<ListBox
								value={selectedCountryAccounts}
								onChange={(e) => handleInstanceSelect(e.value)}
								options={data}
								className="w-full"
								itemTemplate={countryTemplate}
								listStyle={{ maxHeight: "250px" }}
								disabled={isSubmitting || isBusy}
							/>
						)}
					</div>

					{/* Footer Message */}
					<div className="text-sm text-gray-600 text-center pt-2">
						<div>
							{ctx.t({
								code: "user_select_instance.no_instance_question",
								msg: "Don't see the right instance?",
							})}
						</div>
						<div>
							{ctx.t({
								code: "user_select_instance.no_instance_contact",
								msg: "Contact your team admin to get access.",
							})}
						</div>
					</div>
				</div>
			</Dialog>
		</>
	);
}
