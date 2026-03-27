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
}

export default function MainMenuBar({ isLoggedIn, userRole, isCountryAccountSelected, siteName, firstName, lastName }: Props) {
    const menu = useRef<Menu>(null);
    const ctx = new ViewContext();
    const location = useLocation();
    const submit = useSubmit();
    const navigate = useNavigate();

    const avatarLabel = `${(firstName || "").trim().charAt(0)}${(lastName || "").trim().charAt(0)}`.toUpperCase();
    const isSuperAdmin = userRole === "super_admin";

    const userAvatarMenu = [
        {
            label: ctx.t({ code: "nav.profile", msg: "Profile" }),
            icon: 'pi pi-user',
            command: () => {
                navigate(ctx.url("/user/profile"));
            }
        },
        {
            label: ctx.t({
                code: "nav.change_password",
                msg: "Change password",
            }),
            icon: 'pi pi-key',
            command: () => {
                navigate(ctx.url("/user/change-password"));
            }
        },
        {
            label: ctx.t({ code: "nav.totp_2fa", msg: "TOTP (2FA)" }),
            icon: 'pi pi-shield',
            command: () => {
                navigate(ctx.url("/user/totp-enable"));
            }
        },
        {
            separator: true
        },
        {
            label: ctx.t({ code: "nav.sign_out", msg: "Sign out" }),
            icon: 'pi pi-sign-out',
            command: () => {
                submit(null, {
                    method: "post",
                    action: location.pathname.startsWith(ctx.url("/admin/")) ? ctx.url("/admin/logout") : ctx.url("/user/logout")
                });
            }
        }
    ];

    const superAdminAvatarMenu = [
        {
            label: ctx.t({ code: "nav.sign_out", msg: "Sign out" }),
            icon: 'pi pi-sign-out',
            command: () => {
                submit(null, {
                    method: "post",
                    action: location.pathname.startsWith(ctx.url("/admin/")) ? ctx.url("/admin/logout") : ctx.url("/user/logout")
                });
            }
        }
    ];

    let avatarMenuModel = userAvatarMenu;
    if (isSuperAdmin) {
        avatarMenuModel = superAdminAvatarMenu;
    }

    const itemRenderer = (item: any) => (
        <a className="flex align-items-center p-menuitem-link">
            <div className="flex items-center gap-3">
                <span className={item.icon} />
                <div>
                    <div className="flex flex-col">
                        <div className={`font-bold 'text-[#004F91]' `} style={{ fontSize: 'var(--text-base)' }}>
                            {item.label}
                        </div>
                    </div>
                    <div className="text-muted-foreground leading-tight mt-0.5" style={{ fontSize: '12px' }}>
                        {item.description}
                    </div>
                </div>
            </div>
        </a>
    );
    const start = (
        <div className="flex items-center gap-3 pe-6">
            <div className="w-10 h-10 bg-[#004F91] rounded-lg flex items-center justify-center">
                <i className="pi pi-globe w-6 h-6 text-white" style={{ fontSize: "1.5rem" }} ></i>
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-xl leading-none tracking-tight text-[#004F91]">DELTA</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.1em] mt-0.5">Resilience</span>
            </div>
            <Divider layout="vertical" />
            {/* Site name */}
            {siteName && (
                <>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.1em]">Site</span>
                        <span className="font-semibold text-sm leading-none tracking-tight text-[#004F91] mt-0.5 max-w-[140px] truncate">
                            {siteName}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
    const end = isLoggedIn ? (
        <div className="flex items-center gap-3">
            <Divider layout="vertical" />

            <button
                className="p-link inline-flex items-center no-underline hover:surface-hover border-round p-2 transition-colors transition-duration-200"
                onClick={(e) => menu.current?.toggle(e)}
                title={ctx.t({ code: "nav.profile", msg: "Profile" })}
            >
                <Avatar
                    label={avatarLabel || undefined}
                    icon={avatarLabel ? undefined : "pi pi-user"}
                    shape="circle"
                    size="large"
                />
            </button>

            <Menu
                model={avatarMenuModel}
                popup
                popupAlignment={ctx.lang === "ar" ? "right" : "left"}
                ref={menu}
                pt={{
                    menu: { className: 'min-w-[180px]' },
                    menuitem: { className: 'p-2' }
                }}
            />
        </div>
    ) : (
        location.pathname.includes(ctx.url("user/login")) ||
            location.pathname.includes(ctx.url("admin/login")) ? "" :
            <div className="flex items-center gap-3">
                <Divider layout="vertical" />

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
        ...(isLoggedIn && isCountryAccountSelected ? [
            {
                label: ctx.t({ code: "nav.data", msg: "Data" }).toUpperCase(),
                icon: 'pi pi-database',
                items: [
                    {
                        label: ctx.t({
                            code: "nav.disaster_events",
                            msg: "Disaster events",
                        }),
                        icon: 'pi pi-database',
                        description: 'View all disaster events',
                        template: itemRenderer,
                        command: () => navigate(ctx.url("/disaster-event"))
                    },
                    {
                        label: ctx.t({
                            code: "nav.hazardous_events",
                            msg: "Hazardous events",
                        }),
                        icon: 'pi pi-database',
                        description: 'Monitor hazardous situations',
                        template: itemRenderer,
                        command: () => navigate(ctx.url("/hazardous-event"))
                    },
                    {
                        label: ctx.t({
                            code: "nav.disaster_records",
                            msg: "Disaster records",
                        }),
                        icon: 'pi pi-database',
                        description: 'Complete disaster documenations',
                        template: itemRenderer,
                        command: () => navigate(ctx.url("/disaster-record"))
                    },
                ]

            }] : []),
        ...(isLoggedIn && isCountryAccountSelected ? [
            {
                label: ctx.t({ code: "nav.analysis", msg: "Analysis" }).toUpperCase(),
                icon: 'pi pi-chart-bar',
                items: [
                    {
                        label: ctx.t({ code: "nav.analysis.sectors", msg: "Sectors" }),
                        icon: 'pi pi-chart-bar',
                        description: "Analyze data by sectors",
                        template: itemRenderer,
                        command: () => navigate(ctx.url("/analytics/sectors"))
                    },
                    {
                        label: ctx.t({ code: "nav.analysis.hazards", msg: "Hazards" }),
                        icon: 'pi pi-chart-bar',
                        description: "Analyze data by hazards",
                        template: itemRenderer,
                        command: () => navigate(ctx.url("/analytics/hazards"))
                    },
                    {
                        label: ctx.t({
                            code: "nav.analysis.disaster_events",
                            msg: "Disaster events",
                        }),
                        icon: 'pi pi-chart-bar',
                        description: "Analyze data by disaster events",
                        template: itemRenderer,
                        command: () => navigate(ctx.url("/analytics/disaster-events"))
                    },
                ]
            }] : []),
        {
            label: ctx.t({ code: "nav.about", msg: "About" }).toUpperCase(),
            icon: 'pi pi-info-circle',
            items: [
                {
                    label: ctx.t({
                        code: "nav.about_the_system",
                        msg: "About the system",
                    }),
                    icon: 'pi pi-info-circle',
                    description: "System information",
                    command: () => navigate(ctx.url("/about/about-the-system")),
                    template: itemRenderer
                },
                {
                    label: ctx.t({
                        code: "nav.technical_specifications",
                        msg: "Technical specifications",
                    }),
                    icon: 'pi pi-info-circle',
                    command: () => navigate(ctx.url("/about/technical-specifications")),
                    template: itemRenderer
                },
                {
                    label: ctx.t({ code: "nav.partners", msg: "Partners" }),
                    icon: 'pi pi-info-circle',
                    command: () => navigate(ctx.url("about/partners")),
                    template: itemRenderer
                },
                {
                    label: ctx.t({
                        code: "nav.methodologies",
                        msg: "Methodologies",
                    }),
                    icon: 'pi pi-info-circle',
                    command: () => navigate(ctx.url("/about/methodologies")),
                    template: itemRenderer
                },
                {
                    label: ctx.t({ code: "nav.support", msg: "Support" }),
                    icon: 'pi pi-info-circle',
                    command: () => navigate(ctx.url("/about/support")),
                    template: itemRenderer
                },
            ]
        },
        ...(isLoggedIn && userRole === 'admin' ? [
            {
                label: ctx.t({ code: "nav.settings", msg: "Settings" }).toUpperCase(),
                icon: 'pi pi-cog',
                items: [
                    {
                        label: ctx.t({
                            code: "nav.system_settings",
                            msg: "System settings",
                        }),
                        icon: 'pi pi-cog',
                        description: "Configure system preferences",
                        command: () => navigate(ctx.url("/settings/system")),
                        template: itemRenderer
                    },
                    {
                        label: ctx.t({
                            code: "nav.access_management",
                            msg: "Access management",
                        }),
                        icon: 'pi pi-users',
                        description: "Manager user permissions",
                        command: () => navigate(ctx.url("/settings/access-mgmnt")),
                        template: itemRenderer
                    },
                    {
                        label: ctx.t({
                            code: "nav.organization_management",
                            msg: "Organization management",
                        }),
                        icon: 'pi pi-building',
                        description: "Manage organizations",
                        command: () => navigate(ctx.url("/settings/organizations")),
                        template: itemRenderer
                    },
                    {
                        label: ctx.t({
                            code: "nav.geographic_levels",
                            msg: "Geographic levels",
                        }),
                        icon: 'pi pi-sitemap',
                        command: () => navigate(ctx.url("/settings/geography")),
                        template: itemRenderer
                    },
                    {
                        label: ctx.t({ code: "nav.sectors", msg: "Sectors" }),
                        icon: 'pi pi-th-large',
                        // description: "Manager alerts and notifications",
                        command: () => navigate(ctx.url("/settings/sectors")),
                        template: itemRenderer
                    },
                    {
                        label: ctx.t({ code: "nav.api_keys", msg: "API keys" }),
                        icon: 'pi pi-key',
                        // description: "Manager alerts and notifications",
                        command: () => navigate(ctx.url("/settings/api-key")),
                        template: itemRenderer
                    },
                    {
                        label: ctx.t({ code: "nav.assets", msg: "Assets" }),
                        icon: 'pi pi-box',
                        // description: "Manager alerts and notifications",
                        command: () => navigate(ctx.url("/settings/assets")),
                        template: itemRenderer
                    }
                ]
            }] : [])
        , ...(isLoggedIn && userRole === 'super_admin' ? [
            {
                label: ctx.t({ code: "nav.super_admin", msg: "Super Admin" }).toUpperCase(),
                icon: 'pi pi-shield',
                items: [
                    {
                        label: "Country Accounts Management",
                        icon: 'pi pi-globe',
                        description: "Manage country accounts",
                        command: () => navigate(ctx.url("/admin/country-accounts")),
                        template: itemRenderer
                    },
                    {
                        label: "Fictitious Country Management",
                        icon: 'pi pi-map',
                        description: "Manage fictitious countries",
                        command: () => navigate(ctx.url("/admin/fictitious-country-mgmt")),
                        template: itemRenderer
                    }
                ]
            }
        ] : [])
    ];
    return (
        <Menubar model={items} start={start} end={end}
            pt={{
                submenu: {
                    className: 'min-w-[260px] w-[300px] md:w-[340px]'
                },
                menu: {
                    className: 'flex-1 flex justify-end'
                }
            }} />
    )
}