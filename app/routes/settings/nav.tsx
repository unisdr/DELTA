import { useLocation } from "react-router";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { TabPanel, TabView, TabViewTabChangeEvent } from "primereact/tabview";

interface NavSettingsProps {
	userRole?: string | undefined;
}

export function NavSettings({ userRole = "" }: NavSettingsProps) {
	const location = useLocation();
	const navigate = useNavigate();

	// Memoize menu to prevent unnecessary recalculations
	const menu = useMemo(() => {
		if (location.pathname.includes("/analytics")) {
			return [
				{
					link: "analytics/sectors",
					text: "Sectors",
				},
				{
					link: "analytics/hazards",
					text: "Hazards",
				},
				{
					link: "analytics/disaster-events",
					text: "Disaster events",
				},
			];
		}

		if (location.pathname.includes("/settings")) {
			if (userRole !== "admin") {
				return [
					{
						link: "analytics/sectors",
						text: "Sectors",
					},
				];
			}
			return [
				{
					link: "settings/system",
					text: "System settings",
				},
				{
					link: "settings/geography",
					text: "Geographic levels",
				},
				{
					link: "settings/sectors",
					text: "Sectors",
				},
				{
					link: "settings/access-mgmnt",
					text: "Access management",
				},
				{ link: "settings/organizations", text: "Organizations" },
			];
		}

		if (location.pathname.includes("/about")) {
			return [
				{
					link: "about/about-the-system",
					text: "About the system",
				},
				{
					link: "about/technical-specifications",
					text: "Technical specifications",
				},
				{
					link: "about/partners",
					text: "Partners",
				},
				{
					link: "about/methodologies",
					text: "Methodologies",
				},
				{
					link: "about/support",
					text: "Support",
				},
			];
		}

		return [];
	}, [location.pathname]);

	const activeIndex = useMemo(() => {
		const idx = menu.findIndex(({ link }) =>
			location.pathname.startsWith(`/${link}`),
		);
		return idx >= 0 ? idx : 0;
	}, [location.pathname, menu]);

	function onTabChange(e: TabViewTabChangeEvent) {
		const selected = menu[e.index];
		if (!selected) {
			return;
		}
		navigate(`/${selected.link}`);
	}

	return (
		<div className="mg-container">
			<TabView
				activeIndex={activeIndex}
				onTabChange={onTabChange}
				className="mx-4 md:mx-6"
				pt={{
					nav: { className: "!bg-transparent " },
					panelContainer: { className: "!bg-transparent !border-0" },
				}}
			>
				{menu.map(({ link, text }) => (
					<TabPanel
						key={link}
						header={text}
						pt={{
							headerAction: { className: "!bg-transparent" },
						}}
					>
					</TabPanel>
				))}
			</TabView>
		</div>
	);
}
