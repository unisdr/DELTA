import { NavLink } from "@remix-run/react";
import { useLocation } from "@remix-run/react";
import { useMemo } from "react";
import { ViewContext } from "~/frontend/context";


interface NavSettingsProps {
	ctx: ViewContext;
	userRole?: string | undefined;
}

export function NavSettings({ ctx, userRole = "" }: NavSettingsProps) {
	const location = useLocation();

	// Memoize menu to prevent unnecessary recalculations
	const menu = useMemo(() => {
		if (location.pathname.includes("/analytics")) {
			return [
				{ link: "analytics/sectors", text: ctx.t({ "code": "nav.sectors", "msg": "Sectors" }) },
				{ link: "analytics/hazards", text: ctx.t({ "code": "nav.hazards", "msg": "Hazards" }) },
				{ link: "analytics/disaster-events", text: ctx.t({ "code": "nav.disaster_events", "msg": "Disaster Events" }) }
			];
		}

		if (location.pathname.includes("/settings")) {
			if (userRole !== 'admin') {
				return [
					{ link: "analytics/sectors", text: ctx.t({ "code": "nav.sectors", "msg": "Sectors" }) }
				];
			}
			return [
				{ link: "settings/system", text: ctx.t({ "code": "nav.system_settings", "msg": "System settings" }) },
				{ link: "settings/geography", text: ctx.t({ "code": "nav.geographic_levels", "msg": "Geographic levels" }) },
				{ link: "settings/sectors", text: ctx.t({ "code": "nav.sectors", "msg": "Sectors" }) },
				{ link: "settings/access-mgmnt", text: ctx.t({ "code": "nav.access_management", "msg": "Access management" }) },
				{ link: "settings/organizations", text: ctx.t({ "code": "nav.organizations", "msg": "Organizations" }) },
			];
		}

		if (location.pathname.includes("/about")) {
			return [
				{ link: "about/about-the-system", text: ctx.t({ "code": "nav.about_the_system", "msg": "About the System" }) },
				{ link: "about/technical-specifications", text: ctx.t({ "code": "nav.technical_specifications", "msg": "Technical Specifications" }) },
				{ link: "about/partners", text: ctx.t({ "code": "nav.partners", "msg": "Partners" }) },
				{ link: "about/methodologies", text: ctx.t({ "code": "nav.methodologies", "msg": "Methodologies" }) },
				{ link: "about/support", text: ctx.t({ "code": "nav.support", "msg": "Support" }) },
			];
		}

		return [];
	}, [location.pathname]);

	// If location is not available during SSR, render a placeholder
	if (!location) {
		return null;
	}

	return (
		<div className="mg-container">
			<nav className="dts-sub-navigation">
				<div className="mg-container">
					<div className="dts-sub-navigation__container">
						<ul className="dts-sub-navigation__list">
							{menu.map(({ link, text }) => {
								const isCurrent = location.pathname.startsWith(`/${link}`);

								return (
									<li
										key={link}
										className={`dts-sub-navigation__item${isCurrent ? " dts-sub-navigation__item--current" : ""
											}`}
									>
										<NavLink to={ctx.url(`/${link}`)} className="dts-sub-navigation__link">
											{text}
										</NavLink>
									</li>
								);
							})}
						</ul>
					</div>
				</div>
			</nav>
		</div>
	);
}
