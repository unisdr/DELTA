import {
	Form,
	redirect,
	useActionData,
	useLoaderData,
	useNavigate,
	useNavigation,
} from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";

import {
	makeDeleteHazardousEventUseCase,
	makeGetHazardousEventByIdUseCase,
} from "~/modules/hazardous-event/hazardous-event-module.server";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

type ActionData = {
	error?: string;
};

export const loader = authLoaderWithPerm("EditData", async ({ request, params }) => {
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	if (!params.id) {
		throw new Response("ID is required", { status: 400 });
	}

	const item = await makeGetHazardousEventByIdUseCase().execute({
		id: params.id,
		countryAccountsId,
	});

	if (!item) {
		throw new Response("Hazardous event not found", { status: 404 });
	}

	return {
		item,
	};
});

export const action = authActionWithPerm("EditData", async ({ request, params }) => {
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	if (!params.id) {
		throw new Response("ID is required", { status: 400 });
	}

	const result = await makeDeleteHazardousEventUseCase().execute({
		id: params.id,
		countryAccountsId,
	});
	if (!result.ok) {
		return {
			error: result.error,
		} satisfies ActionData;
	}

	return redirect("/hazardous-event");
});

export default function HazardousEventDeleteRoute() {
	const { item } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const navigate = useNavigate();
	const isSubmitting = navigation.state === "submitting";

	return (
		<Dialog
			header={"Delete hazardous event"}
			visible
			modal
			onHide={() => navigate("/hazardous-event")}
			className="w-[32rem] max-w-full"
		>
			<Form method="post" className="flex flex-col" noValidate>
				<p className="mb-3">
					Delete hazardous event "{item.nationalSpecification || item.id}"?
				</p>

				{actionData?.error ? (
					<Message severity="error" text={actionData.error} className="mb-3" />
				) : null}

				<div className="mt-4 flex justify-end gap-2">
					<Button
						type="button"
						outlined
						icon="pi pi-times"
						label="No"
						onClick={() => navigate("/hazardous-event")}
					/>
					<Button
						type="submit"
						label="Yes"
						icon="pi pi-trash"
						severity="danger"
						loading={isSubmitting}
						disabled={isSubmitting}
					/>
				</div>
			</Form>
		</Dialog>
	);
}
