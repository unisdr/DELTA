import { OffsetLimit } from "~/frontend/pagination/api.server";
import { authLoaderApi } from "~/utils/auth";
import { executeQueryForPagination3 } from "~/frontend/pagination/api.server";

export async function getItem2<T>(
	params: Record<string, any>,
	q: (id: any) => T,
): Promise<T> {
	const id = params["id"];

	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const res = await q(id);

	if (!res) {
		throw new Response("Item not found", { status: 404 });
	}

	return res;
}

export function createApiListLoader<T>(
	countTotalItems: () => Promise<number>,
	fetchData: (offsetLimit: OffsetLimit) => Promise<T[]>,
) {
	return authLoaderApi(async (loaderArgs) => {
		const { request } = loaderArgs;

		const totalItems = await countTotalItems();
		const dataFetcher = async (offsetLimit: OffsetLimit) => {
			return await fetchData(offsetLimit);
		};

		const res = await executeQueryForPagination3(
			request,
			totalItems,
			dataFetcher,
			[],
		);

		return Response.json({ data: res });
	});
}
