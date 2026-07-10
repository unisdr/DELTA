import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

import { getAppContext } from "~/init.server";
import { ListNoticesUseCase } from "~/domains/notices/application/use-cases/ListNotices";
import { NoticeListPage } from "~/domains/notices/presentation/NoticeListPage";
import { NoticeErrorBoundary } from "~/domains/notices/presentation/NoticeErrorBoundary";
import { parsePagination } from "~/domains/notices/presentation/parsePagination";
import { resolveTenantId } from "~/domains/notices/presentation/resolveTenantId.server";
import { throwNoticeLoaderError } from "~/domains/notices/presentation/throwNoticeLoaderError.server";
import { MainContainer } from "~/frontend/container";
import { useViewContext } from "~/frontend/context";

export async function loader({ request, params }: LoaderFunctionArgs) {
	const tenantId = await resolveTenantId(request, params.lang ?? "en");
	const { page, pageSize } = parsePagination(new URL(request.url));
	const listNoticesUseCase = getAppContext().get(ListNoticesUseCase);

	try {
		return await listNoticesUseCase.execute({ tenantId, page, pageSize });
	} catch (err) {
		throwNoticeLoaderError(err, {
			logMsg: "Unhandled error in notices list loader",
			url: request.url,
		});
	}
}

export default function NoticesIndexRoute() {
	const data = useLoaderData<typeof loader>();
	const ctx = useViewContext();
	return (
		<MainContainer title={ctx.t({ code: "notices", msg: "Notices" })}>
			<NoticeListPage data={data} />
		</MainContainer>
	);
}

export { NoticeErrorBoundary as ErrorBoundary };
