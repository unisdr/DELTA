import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

import { getAppContext } from "~/init.server";
import { GetNoticeByIdUseCase } from "~/domains/notices/application/use-cases/GetNoticeById";
import { NoticeDetailPage } from "~/domains/notices/presentation/NoticeDetailPage";
import { NoticeErrorBoundary } from "~/domains/notices/presentation/NoticeErrorBoundary";
import { resolveTenantId } from "~/domains/notices/presentation/resolveTenantId.server";
import { throwNoticeLoaderError } from "~/domains/notices/presentation/throwNoticeLoaderError.server";
import { MainContainer } from "~/frontend/container";
import { useViewContext } from "~/frontend/context";

export async function loader({ request, params }: LoaderFunctionArgs) {
	const tenantId = await resolveTenantId(request, params.lang ?? "en");
	const getNoticeByIdUseCase = getAppContext().get(GetNoticeByIdUseCase);

	try {
		return await getNoticeByIdUseCase.execute({
			id: params.id ?? "",
			tenantId,
		});
	} catch (err) {
		throwNoticeLoaderError(err, {
			logMsg: "Unhandled error in notice detail loader",
			url: request.url,
		});
	}
}

export default function NoticeDetailRoute() {
	const data = useLoaderData<typeof loader>();
	const ctx = useViewContext();
	return (
		<MainContainer title={ctx.t({ code: "notices", msg: "Notices" })}>
			<NoticeDetailPage data={data} />
		</MainContainer>
	);
}

export { NoticeErrorBoundary as ErrorBoundary };
