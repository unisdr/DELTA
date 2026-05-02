import QRCode from "qrcode";
import { authLoaderAllowNoTotp } from "~/utils/auth";

const maxQrTextLength = 4096;

export const loader = authLoaderAllowNoTotp(async ({ request }) => {
	const url = new URL(request.url);
	const text = url.searchParams.get("text") || "";

	if (!text) {
		throw new Response("Missing text query parameter", { status: 400 });
	}

	if (text.length > maxQrTextLength) {
		throw new Response("Text is too long", { status: 400 });
	}

	const png = await QRCode.toBuffer(text, {
		type: "png",
		width: 220,
		margin: 1,
		errorCorrectionLevel: "M",
	});
	const pngBytes = Uint8Array.from(png);

	return new Response(pngBytes, {
		status: 200,
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "no-store",
		},
	});
});
