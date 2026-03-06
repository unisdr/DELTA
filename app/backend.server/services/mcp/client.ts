export async function callInternalApi(
	request: Request,
	endpoint: string,
	method: string = "GET",
	body?: any,
): Promise<any> {
	const url = new URL(request.url);
	const apiUrl = new URL(endpoint, url.origin);

	const headers: HeadersInit = {
		"X-Auth": request.headers.get("X-Auth") || "",
	};

	if (body) {
		headers["Content-Type"] = "application/json";
	}

	const response = await fetch(apiUrl.toString(), {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	const data = await response.json();

	if (!response.ok || data.ok === false) {
		throw new Error(JSON.stringify(data, null, 2));
	}

	return data;
}
