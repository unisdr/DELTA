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
									<LangLink lang={ctx.lang} to="/about/about-the-system">
										{ctx.t({ "code": "nav.general", "msg": "General" })}
									</LangLink>
								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/technical-specifications">
										{ctx.t({ "code": "nav.technical_specifications", "msg": "Technical specifications" })}
									</LangLink>

								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/partners">
										{ctx.t({ "code": "nav.partners", "msg": "Partners" })}
									</LangLink>
								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/methodologies">
										{ctx.t({ "code": "nav.methodologies", "msg": "Methodologies" })}
									</LangLink>
								</li>
								<li>
									<LangLink lang={ctx.lang} to="/about/support">
										{ctx.t({ "code": "nav.support", "msg": "Support" })}
									</LangLink>
								</li>
							</ul>
						</nav>
					</div>
					<div className="dts-footer__bottom-bar">
						<div className="dts-footer__bottom-bar-text">
							{ctx.t({
								"code": "footer.tracking_disaster_costs_description",
								"msg": "Tracking the costs of disasters is a vital step toward risk‑informed development, and investing in disaster risk reduction."
							})}
						</div>
						<nav>
							<ul>
								{urlPrivacyPolicy && urlPrivacyPolicy.length > 0 && (
									<li>
										<a href={urlPrivacyPolicy} target="_blank">
											{ctx.t({ "code": "footer.privacy_policy", "msg": "Privacy policy" })}
										</a>
									</li>
								)}
								{urlTermsConditions && urlTermsConditions.length > 0 && (
									<li>
										<a href={urlTermsConditions} target="_blank">
											{ctx.t({ "code": "footer.terms_and_conditions", "msg": "Terms and conditions" })}
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
