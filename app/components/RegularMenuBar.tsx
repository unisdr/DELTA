import { Menubar } from "primereact/menubar";
import { Divider } from "primereact/divider";
import { Avatar } from "primereact/avatar";
import { useRef } from "react";
import { Button } from "primereact/button";
import { urlLang } from "~/utils/url";
import { Link, useLocation, useNavigate, useSubmit } from "react-router";
import { ViewContext } from "../frontend/context";
import { Menu } from "primereact/menu";

interface Props {
    isLoggedIn: boolean;
    isCountryAccountSelected: boolean;
    siteName?: string;
    userRole: string;
    firstName?: string;
    lastName?: string;
    activeInstanceCount?: number;
}

export default function RegularMenuBar({
    isLoggedIn,
    userRole,
    isCountryAccountSelected,
    siteName,
    firstName,
    lastName,
    activeInstanceCount = 0,
}: Props) {
    const menu = useRef<Menu>(null);
    const ctx = new ViewContext();
    const location = useLocation();
    const submit = useSubmit();
    const navigate = useNavigate();

    const avatarLabel = `${(firstName || "").trim().charAt(0)}${(lastName || "").trim().charAt(0)}`.toUpperCase();

    const openInstanceSwitcher = () => {
        const redirectTo = `${location.pathname}${location.search}`;
        navigate(
            `${ctx.url("/user/select-instance")}?redirectTo=${encodeURIComponent(redirectTo)}`,
        );
    };

    const userAvatarMenu = [
        {
            label: ctx.t({ code: "nav.profile", msg: "Profile" }),
            icon: "pi pi-user",
            command: () => {
                navigate(ctx.url("/user/profile"));
            },
        },
        {
            label: ctx.t({
                code: "nav.change_password",
                msg: "Change password",
            }),
            icon: "pi pi-lock-open",
            command: () => {
                navigate(ctx.url("/user/change-password"));
            },
        },
        {
            label: ctx.t({ code: "nav.totp_2fa", msg: "TOTP (2FA)" }),
            icon: "pi pi-shield",
            command: () => {
                navigate(ctx.url("/user/totp-enable"));
            },
        },
        {
            separator: true,
        },
        {
            label: ctx.t({ code: "nav.sign_out", msg: "Sign out" }),
            icon: "pi pi-sign-out",
            command: () => {
                submit(null, {
                    method: "post",
                    action: ctx.url("/user/logout"),
                });
            },
        },
    ];

    const itemRenderer = (item: any) => (
        <a className="flex align-items-center p-menuitem-link">
            <div className="flex items-center gap-3">
                <span className={item.icon} />
                <div>
                    <div className="flex flex-col">
                        <div
                            className={`font-bold 'text-[#004F91]' `}
                            style={{ fontSize: "var(--text-base)" }}
                        >
                            {item.label}
                        </div>
                    </div>
                    <div
                        className="text-muted-foreground leading-tight mt-0.5"
                        style={{ fontSize: "12px" }}
                    >
                        {item.description}
                    </div>
                </div>
            </div>
        </a>
    );

    const start = (
        <div className="flex flex-1 min-w-0 items-center gap-2 overflow-hidden pe-2 md:gap-3 md:pe-6">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#004F91] rounded-lg flex items-center justify-center shrink-0">
                <i className="pi pi-globe text-white !text-base md:!text-2xl"></i>
            </div>
            <div className="flex flex-col shrink-0">
                <span className="font-bold text-base md:text-xl leading-none tracking-tight text-[#004F91]">
                    DELTA
                </span>
                <span className="hidden md:block text-[10px] uppercase font-bold text-muted-foreground tracking-[0.1em] mt-0.5">
                    Resilience
                </span>
            </div>
            <Divider layout="vertical" className="hidden md:block" />
            {siteName && (
                <>
                    <div className="flex min-w-0 flex-1 items-center gap-1 md:hidden">
                        <span
                            className="max-w-[90px] truncate text-xs font-semibold text-[#004F91]"
                            title={siteName}
                        >
                            {siteName}
                        </span>

                        {isLoggedIn && activeInstanceCount > 1 && (
                            <Button
                                type="button"
                                icon="pi pi-sync"
                                text
                                rounded
                                size="small"
                                onClick={openInstanceSwitcher}
                                aria-label={ctx.t({ code: "nav.switch_instance", msg: "Switch" })}
                                className="!p-1"
                            />
                        )}
                    </div>

                    <div className="hidden md:flex items-end gap-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.1em]">
                                Site
                            </span>
                            <span className="font-semibold text-sm leading-none tracking-tight text-[#004F91] mt-0.5 max-w-[140px] truncate">
                                {siteName}
                            </span>
                        </div>

                        {isLoggedIn && activeInstanceCount > 1 && (
                            <Button
                                type="button"
                                icon="pi pi-sync"
                                label={ctx.t({ code: "nav.switch_instance", msg: "Switch" })}
                                outlined
                                size="small"
                                onClick={openInstanceSwitcher}
                                className="!py-1 !px-2"
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );

    const end = isLoggedIn ? (
        <div className="ml-auto shrink-0 flex items-center gap-1 md:gap-2">
            <Divider layout="vertical" className="hidden md:block !mx-1" />

            <button
                className="p-link inline-flex items-center no-underline hover:surface-hover border-round p-1 md:p-1.5 transition-colors transition-duration-200"
                onClick={(e) => menu.current?.toggle(e)}
                title={ctx.t({ code: "nav.profile", msg: "Profile" })}
            >
                <Avatar
                    label={avatarLabel || undefined}
                    icon={avatarLabel ? undefined : "pi pi-user"}
                    shape="circle"
                />
            </button>

            <Menu
                model={userAvatarMenu}
                popup
                popupAlignment={ctx.lang === "ar" ? "right" : "left"}
                ref={menu}
                pt={{
                    menu: { className: "min-w-[180px]" },
                    menuitem: { className: "p-2" },
                }}
            />
        </div>
    ) : location.pathname.includes(ctx.url("user/login")) ? (
        ""
    ) : (
        <div className="ml-auto shrink-0 flex items-center gap-1 md:gap-2">
            <Divider layout="vertical" className="hidden md:block !mx-1" />

            <Link to={urlLang(ctx.lang, "/user/login")}>
                <Button
                    label={ctx.t({
                        code: "common.signin",
                    })}
                />
            </Link>
        </div>
    );

    const items: any[] = [
        ...(isLoggedIn && isCountryAccountSelected
            ? [
                {
                    label: ctx.t({ code: "nav.data", msg: "Data" }).toUpperCase(),
                    icon: "pi pi-database",
                    items: [
                        {
                            label: ctx.t({
                                code: "nav.disaster_events",
                                msg: "Disaster events",
                            }),
                            icon: "pi pi-database",
                            description: "View all disaster events",
                            template: itemRenderer,
                            command: () => navigate(ctx.url("/disaster-event")),
                        },
                        {
                            label: ctx.t({
                                code: "nav.hazardous_events",
                                msg: "Hazardous events",
                            }),
                            icon: "pi pi-database",
                            description: "Monitor hazardous situations",
                            template: itemRenderer,
                            command: () => navigate(ctx.url("/hazardous-event")),
                        },
                        {
                            label: ctx.t({
                                code: "nav.disaster_records",
                                msg: "Disaster records",
                            }),
                            icon: "pi pi-database",
                            description: "Complete disaster documenations",
                            template: itemRenderer,
                            command: () => navigate(ctx.url("/disaster-record")),
                        },
                    ],
                },
            ]
            : []),
        ...(isLoggedIn && isCountryAccountSelected
            ? [
                {
                    label: ctx.t({ code: "nav.analysis", msg: "Analysis" }).toUpperCase(),
                    icon: "pi pi-chart-bar",
                    items: [
                        {
                            label: ctx.t({ code: "nav.analysis.sectors", msg: "Sectors" }),
                            icon: "pi pi-chart-bar",
                            description: "Analyze data by sectors",
                            template: itemRenderer,
                            command: () => navigate(ctx.url("/analytics/sectors")),
                        },
                        {
                            label: ctx.t({ code: "nav.analysis.hazards", msg: "Hazards" }),
                            icon: "pi pi-chart-bar",
                            description: "Analyze data by hazards",
                            template: itemRenderer,
                            command: () => navigate(ctx.url("/analytics/hazards")),
                        },
                        {
                            label: ctx.t({
                                code: "nav.analysis.disaster_events",
                                msg: "Disaster events",
                            }),
                            icon: "pi pi-chart-bar",
                            description: "Analyze data by disaster events",
                            template: itemRenderer,
                            command: () => navigate(ctx.url("/analytics/disaster-events")),
                        },
                    ],
                },
            ]
            : []),
        {
            label: ctx.t({ code: "nav.about", msg: "About" }).toUpperCase(),
            icon: "pi pi-info-circle",
            items: [
                {
                    label: ctx.t({
                        code: "nav.about_the_system",
                        msg: "About the system",
                    }),
                    icon: "pi pi-info-circle",
                    description: "System information",
                    command: () => navigate(ctx.url("/about/about-the-system")),
                    template: itemRenderer,
                },
                {
                    label: ctx.t({
                        code: "nav.technical_specifications",
                        msg: "Technical specifications",
                    }),
                    icon: "pi pi-info-circle",
                    command: () => navigate(ctx.url("/about/technical-specifications")),
                    template: itemRenderer,
                },
                {
                    label: ctx.t({ code: "nav.partners", msg: "Partners" }),
                    icon: "pi pi-info-circle",
                    command: () => navigate(ctx.url("about/partners")),
                    template: itemRenderer,
                },
                {
                    label: ctx.t({
                        code: "nav.methodologies",
                        msg: "Methodologies",
                    }),
                    icon: "pi pi-info-circle",
                    command: () => navigate(ctx.url("/about/methodologies")),
                    template: itemRenderer,
                },
                {
                    label: ctx.t({ code: "nav.support", msg: "Support" }),
                    icon: "pi pi-info-circle",
                    command: () => navigate(ctx.url("/about/support")),
                    template: itemRenderer,
                },
                {
                    label: ctx.t({ code: "nav.faq", msg: "FAQ" }),
                    icon: "pi pi-question-circle",
                    command: () => navigate(ctx.url("/faq")),
                    template: itemRenderer,
                },
            ],
        },
        ...(isLoggedIn && userRole === "admin"
            ? [
                {
                    label: ctx.t({ code: "nav.settings", msg: "Settings" }).toUpperCase(),
                    icon: "pi pi-cog",
                    items: [
                        {
                            label: ctx.t({
                                code: "nav.system_settings",
                                msg: "System settings",
                            }),
                            icon: "pi pi-cog",
                            description: "Configure system preferences",
                            command: () => navigate(ctx.url("/settings/system")),
                            template: itemRenderer,
                        },
                        {
                            label: ctx.t({
                                code: "nav.access_management",
                                msg: "Access management",
                            }),
                            icon: "pi pi-users",
                            description: "Manager user permissions",
                            command: () => navigate(ctx.url("/settings/access-mgmnt")),
                            template: itemRenderer,
                        },
                        {
                            label: ctx.t({
                                code: "nav.organization_management",
                                msg: "Organization management",
                            }),
                            icon: "pi pi-building",
                            description: "Manage organizations",
                            command: () => navigate(ctx.url("/settings/organizations")),
                            template: itemRenderer,
                        },
                        {
                            label: ctx.t({
                                code: "nav.geographic_levels",
                                msg: "Geographic levels",
                            }),
                            icon: "pi pi-sitemap",
                            command: () => navigate(ctx.url("/settings/geography")),
                            template: itemRenderer,
                        },
                        {
                            label: ctx.t({ code: "nav.sectors", msg: "Sectors" }),
                            icon: "pi pi-th-large",
                            command: () => navigate(ctx.url("/settings/sectors")),
                            template: itemRenderer,
                        },
                        {
                            label: ctx.t({ code: "nav.api_keys", msg: "API keys" }),
                            icon: "pi pi-key",
                            command: () => navigate(ctx.url("/settings/api-key")),
                            template: itemRenderer,
                        },
                        {
                            label: ctx.t({ code: "nav.assets", msg: "Assets" }),
                            icon: "pi pi-box",
                            command: () => navigate(ctx.url("/settings/assets")),
                            template: itemRenderer,
                        },
                    ],
                },
            ]
            : []),
    ];

    return (
        <Menubar
            model={items}
            start={start}
            end={end}
            pt={{
                root: {
                    className: "w-full",
                },
                start: {
                    className: "flex-1 min-w-0",
                },
                end: {
                    className: "shrink-0 ml-auto",
                },
                submenu: {
                    className: "min-w-[260px] w-[300px] md:w-[340px]",
                },
                menu: {
                    className: "min-w-0 md:flex-1 md:flex md:justify-end",
                },
            }}
        />
    );
}
