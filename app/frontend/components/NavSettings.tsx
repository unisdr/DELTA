import { useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import { TabPanel, TabView, TabViewTabChangeEvent } from "primereact/tabview";
import { ViewContext } from "~/frontend/context";

interface NavSettingsProps {
    ctx: ViewContext;
    userRole?: string | undefined;
}

export function NavSettings({ ctx, userRole = "" }: NavSettingsProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const menu = useMemo(() => {
        if (location.pathname.includes("/analytics")) {
            return [
                {
                    link: "analytics/sectors",
                    text: ctx.t({ code: "nav.sectors", msg: "Sectors" }),
                },
                {
                    link: "analytics/hazards",
                    text: ctx.t({ code: "nav.hazards", msg: "Hazards" }),
                },
                {
                    link: "analytics/disaster-events",
                    text: ctx.t({ code: "nav.disaster_events", msg: "Disaster events" }),
                },
            ];
        }

        if (location.pathname.includes("/settings")) {
            if (userRole !== "admin") {
                return [
                    {
                        link: "analytics/sectors",
                        text: ctx.t({ code: "nav.sectors", msg: "Sectors" }),
                    },
                ];
            }

            return [
                {
                    link: "settings/system",
                    text: ctx.t({ code: "nav.system_settings", msg: "System settings" }),
                },
                {
                    link: "settings/access-mgmnt",
                    text: ctx.t({
                        code: "nav.access_management",
                        msg: "Access management",
                    }),
                },
                {
                    link: "settings/organizations",
                    text: ctx.t({ code: "nav.organizations", msg: "Organizations" }),
                },
                {
                    link: "settings/geography",
                    text: ctx.t({
                        code: "nav.geographic_levels",
                        msg: "Geographic levels",
                    }),
                },
                {
                    link: "settings/sectors",
                    text: ctx.t({ code: "nav.sectors", msg: "Sectors" }),
                },
                {
                    link: "settings/api-key",
                    text: ctx.t({ code: "nav.api_keys", msg: "API keys" }),
                },
                {
                    link: "settings/assets",
                    text: ctx.t({ code: "nav.assets", msg: "Assets" }),
                },
            ];
        }

        if (location.pathname.includes("/about")) {
            return [
                {
                    link: "about/about-the-system",
                    text: ctx.t({
                        code: "nav.about_the_system",
                        msg: "About the system",
                    }),
                },
                {
                    link: "about/technical-specifications",
                    text: ctx.t({
                        code: "nav.technical_specifications",
                        msg: "Technical specifications",
                    }),
                },
                {
                    link: "about/partners",
                    text: ctx.t({ code: "nav.partners", msg: "Partners" }),
                },
                {
                    link: "about/methodologies",
                    text: ctx.t({ code: "nav.methodologies", msg: "Methodologies" }),
                },
                {
                    link: "about/support",
                    text: ctx.t({ code: "nav.support", msg: "Support" }),
                },
            ];
        }

        return [];
    }, [ctx, location.pathname, userRole]);

    const activeIndex = useMemo(() => {
        const idx = menu.findIndex(({ link }) =>
            location.pathname.startsWith(ctx.url(`/${link}`)),
        );
        return idx >= 0 ? idx : 0;
    }, [ctx, location.pathname, menu]);

    function onTabChange(e: TabViewTabChangeEvent) {
        const selected = menu[e.index];
        if (!selected) {
            return;
        }
        navigate(ctx.url(`/${selected.link}`));
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