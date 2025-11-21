import { LangLink } from "~/util/link";
import { ViewContext } from "../context";

interface FooterProps {
	ctx: ViewContext;
	siteName: string;
	urlPrivacyPolicy: string;
	urlTermsConditions: string;
}

export function Footer({
	ctx,
	siteName,
	urlPrivacyPolicy,
	urlTermsConditions,
}: FooterProps) {
	return (
		<>
			<div className="dts-footer">
				<div className="mg-container">
					<div className="dts-footer__top-bar">
						<div>{siteName}</div>
						<nav>
							<ul>
								<li>
									<LangLink lang={ctx.lang} to="/about/about-the-system">General</LangLink>
								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/technical-specifications">
										Technical specification
									</LangLink>
								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/partners">Partners</LangLink>
								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/methodologies">Methodologies</LangLink>
								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/support">Support</LangLink>
								</li>
							</ul>
						</nav>
					</div>
					<div className="dts-footer__bottom-bar">
						<div className="dts-footer__bottom-bar-text">
							Tracking the costs of disasters is a vital step toward
							risk-informed development, and investing in disaster risk
							reduction.
						</div>
						<nav>
							<ul>
								{urlPrivacyPolicy && urlPrivacyPolicy.length > 0 && (
									<li>
										<a href={urlPrivacyPolicy} target="_blank">
											Privacy policy
										</a>
									</li>
								)}
								{urlTermsConditions && urlTermsConditions.length > 0 && (
									<li>
										<a href={urlTermsConditions} target="_blank">
											Terms and conditions
										</a>
									</li>
								)}
							</ul>
						</nav>
					</div>
				</div>
			</div>
		</>
	);
}
