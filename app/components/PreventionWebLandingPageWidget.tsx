/**
 * PreventionWebLandingPageWidget Component
 *
 * This component dynamically loads and initializes the PreventionWeb widget script.
 * It is used to display a widget for specific landing pages on the PreventionWeb or UNDRR platforms.
 *
 * @param {string} pageId - The unique identifier for the landing page.
 * @param {"www.undrr.org" | "www.preventionweb.net"} activeDomain - The domain where the widget is active.
 * @param {boolean} [includeMetaTags=true] - Whether to include meta tags in the widget.
 * @param {boolean} [includeCss=true] - Whether to include the widget's CSS.
 * @param {"en" | "es"} [langCode="en"] - The language code for the widget (English or Spanish).
 *
 * @returns {JSX.Element} - A div containing the dynamically loaded widget.
 */

import { useEffect } from "react";

interface Props {
	pageId: string;
	activeDomain:
	| "www.undrr.org"
	| "www.preventionweb.net"
	| "syndication.preventionweb.net";
	includeMetaTags?: boolean;
	includeCss?: boolean;
	langCode?: "en" | "es";
}

export default function PreventionWebLandingPageWidget({
	pageId,
	activeDomain,
	includeMetaTags = false,
	includeCss = false,
	langCode = "en",
}: Props) {
	const scopedClassName = `pw-widget-${pageId}`;
	const scopedFallbackCss = `
		.${scopedClassName} {
			background: #ffffff;
			border: 1px solid #e2e8f0;
			border-radius: 10px;
			padding: 1rem;
			box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
			font-family: var(--font-family, "Segoe UI", Tahoma, sans-serif);
			line-height: 1.65;
			color: #0f172a;
		}
		@media (min-width: 768px) {
			.${scopedClassName} {
				padding: 1.25rem 1.5rem;
			}
		}
		.${scopedClassName} .field--name-body {
			max-width: 100%;
		}
		.${scopedClassName} h1,
		.${scopedClassName} h2,
		.${scopedClassName} h3,
		.${scopedClassName} h4,
		.${scopedClassName} h5,
		.${scopedClassName} h6 {
			margin: 1.5rem 0 0.75rem;
			line-height: 1.25;
			font-weight: 700;
			color: #0f172a;
		}
		.${scopedClassName} h1 { font-size: 2rem; }
		.${scopedClassName} h2 { font-size: 1.5rem; }
		.${scopedClassName} h3 { font-size: 1.25rem; }
		.${scopedClassName} h2:first-child {
			margin-top: 0;
		}
		.${scopedClassName} p {
			margin: 0 0 1rem;
		}
		.${scopedClassName} ul,
		.${scopedClassName} ol {
			margin: 0 0 1rem 1.5rem;
			padding: 0;
		}
		.${scopedClassName} li {
			margin: 0.35rem 0;
		}
		.${scopedClassName} a {
			color: #0ea5e9;
			text-decoration: underline;
			text-underline-offset: 2px;
		}
		.${scopedClassName} a:hover {
			color: #0284c7;
		}
		.${scopedClassName} img,
		.${scopedClassName} iframe,
		.${scopedClassName} video,
		.${scopedClassName} table {
			max-width: 100%;
		}
		.${scopedClassName} table {
			border-collapse: collapse;
			margin: 1rem 0;
		}
		.${scopedClassName} th,
		.${scopedClassName} td {
			border: 1px solid #cbd5e1;
			padding: 0.5rem 0.65rem;
			text-align: left;
		}
	`;

	useEffect(() => {
		// Dynamically load the script when the component mounts
		const script = document.createElement("script");
		script.id = pageId;
		script.src = `https://publish.preventionweb.net/widget.js?rand='${pageId}'`;
		script.type = "text/javascript";
		// script.integrity =
		//   "sha512-b6PolUa59uPjYAU+abyKpXNBPC7xOFXsyYG9T8uhnof3hsxc0GDbDPwx5d54Fu+TOxrSt55/tdS9DXWWB/jMcg==";
		script.crossOrigin = "anonymous";
		script.onload = () => {
			// Initialize the widget after the script is loaded
			if (window.PW_Widget) {
				window.PW_Widget.initialize({
					contenttype: "landingpage",
					pageid: pageId,
					activedomain: activeDomain,
					includemetatags: includeMetaTags,
					includecss: includeCss,
					langcode: langCode,
					suffixID: pageId,
				});
			}
		};
		document.body.appendChild(script);

		// Cleanup the script on component unmount
		return () => {
			document.body.removeChild(script);
		};
	}, [pageId, activeDomain, includeMetaTags, includeCss, langCode]);

	return (
		<>
			{!includeCss && <style>{scopedFallbackCss}</style>}
			<div className={scopedClassName}>Loading...</div>
		</>
	);
}
