import { Menubar } from "primereact/menubar";
import { Divider } from "primereact/divider";
import { Avatar } from "primereact/avatar";
import { useRef } from "react";
import { Button } from "primereact/button";

import { Link, useLocation, useNavigate, useSubmit } from "react-router";
import { Menu } from "primereact/menu";
import { urlLang } from "~/utils/url";

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
    const location = useLocation();
    const submit = useSubmit();
    const navigate = useNavigate();

    const avatarLabel = `${(firstName || "").trim().charAt(0)}${(lastName || "").trim().charAt(0)}`.toUpperCase();

    const openInstanceSwitcher = () => {
        const redirectTo = `${location.pathname}${location.search}`;
        navigate(
            `${"/user/select-instance"}?redirectTo=${encodeURIComponent(redirectTo)}`,
        );
    };

    const userAvatarMenu = [
        {
            label: "Profile",
            icon: "pi pi-user",
            command: () => {
                navigate("/user/profile");
            },
        },
        {
            label: "Change password",
            icon: "pi pi-lock-open",
            command: () => {
                navigate("/user/change-password");
            },
        },
        {
            label: "TOTP (2FA)",
            icon: "pi pi-shield",
            command: () => {
                navigate("/user/totp-enable");
            },
        },
        {
            separator: true,
        },
        {
            label: "Sign out",
            icon: "pi pi-sign-out",
            command: () => {
                submit(null, {
                    method: "post",
                    action: "/user/logout",
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
                                aria-label={"Switch"}
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
                                label={"Switch"}
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
                title={"Profile"}
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
                popupAlignment="left"
                ref={menu}
                pt={{
                    menu: { className: "min-w-[180px]" },
                    menuitem: { className: "p-2" },
                }}
            />
        </div>
    ) : location.pathname.includes("/user/login") ? (
        ""
    ) : (
        <div className="ml-auto shrink-0 flex items-center gap-1 md:gap-2">
            <Divider layout="vertical" className="hidden md:block !mx-1" />

            <Link to={urlLang('en', "/user/login")}>
                <Button
                    label="Sign in"
                />
            </Link>
        </div>
    );

    const items: any[] = [
        ...(isLoggedIn && isCountryAccountSelected
            ? [
                {
                    label: "Data".toUpperCase(),
                    icon: "pi pi-database",
                    items: [
                        {
                            label: "Disaster events",
                            icon: "pi pi-database",
                            description: "View all disaster events",
                            template: itemRenderer,
                            command: () => navigate("/disaster-event"),
                        },
                        {
                            label: "Hazardous events",
                            icon: "pi pi-database",
                            description: "Monitor hazardous situations",
                            template: itemRenderer,
                            command: () => navigate("/hazardous-event"),
                        },
                        {
                            label: "Disaster records",
                            icon: "pi pi-database",
                            description: "Complete disaster documenations",
                            template: itemRenderer,
                            command: () => navigate("/disaster-record"),
                        },
                    ],
                },
            ]
            : []),
        ...(isLoggedIn && isCountryAccountSelected
            ? [
                {
                    label: "Analysis".toUpperCase(),
                    icon: "pi pi-chart-bar",
                    items: [
                        {
                            label: "Sectors",
                            icon: "pi pi-chart-bar",
                            description: "Analyze data by sectors",
                            template: itemRenderer,
                            command: () => navigate("/analytics/sectors"),
                        },
                        {
                            label: "Hazards",
                            icon: "pi pi-chart-bar",
                            description: "Analyze data by hazards",
                            template: itemRenderer,
                            command: () => navigate("/analytics/hazards"),
                        },
                        {
                            label: "Disaster events",
                            icon: "pi pi-chart-bar",
                            description: "Analyze data by disaster events",
                            template: itemRenderer,
                            command: () => navigate("/analytics/disaster-events"),
                        },
                    ],
                },
            ]
            : []),
        {
            label: "About".toUpperCase(),
            icon: "pi pi-info-circle",
            items: [
                {
                    label: "About the system",
                    icon: "pi pi-info-circle",
                    description: "System information",
                    command: () => navigate("/about/about-the-system"),
                    template: itemRenderer,
                },
                {
                    label: "Technical specifications",
                    icon: "pi pi-info-circle",
                    command: () => navigate("/about/technical-specifications"),
                    template: itemRenderer,
                },
                {
                    label: "Partners",
                    icon: "pi pi-info-circle",
                    command: () => navigate("/about/partners"),
                    template: itemRenderer,
                },
                {
                    label: "Methodologies",
                    icon: "pi pi-info-circle",
                    command: () => navigate("/about/methodologies"),
                    template: itemRenderer,
                },
                {
                    label: "Support",
                    icon: "pi pi-info-circle",
                    command: () => navigate("/about/support"),
                    template: itemRenderer,
                },
                {
                    label: "FAQ",
                    icon: "pi pi-question-circle",
                    command: () => navigate("/faq"),
                    template: itemRenderer,
                },
            ],
        },
        ...(isLoggedIn && userRole === "admin"
            ? [
                {
                    label: "Settings".toUpperCase(),
                    icon: "pi pi-cog",
                    items: [
                        {
                            label: "System settings",
                            icon: "pi pi-cog",
                            description: "Configure system preferences",
                            command: () => navigate("/settings/system"),
                            template: itemRenderer,
                        },
                        {
                            label: "Access management",
                            icon: "pi pi-users",
                            description: "Manager user permissions",
                            command: () => navigate("/settings/access-mgmnt"),
                            template: itemRenderer,
                        },
                        {
                            label: "Organization management",
                            icon: "pi pi-building",
                            description: "Manage organizations",
                            command: () => navigate("/settings/organizations"),
                            template: itemRenderer,
                        },
                        {
                            label: "Geographic levels",
                            icon: "pi pi-sitemap",
                            command: () => navigate("/settings/geography"),
                            template: itemRenderer,
                        },
                        {
                            label: "Sectors",
                            icon: "pi pi-th-large",
                            command: () => navigate("/settings/sectors"),
                            template: itemRenderer,
                        },
                        {
                            label: "API keys",
                            icon: "pi pi-key",
                            command: () => navigate("/settings/api-key"),
                            template: itemRenderer,
                        },
                        {
                            label: "Assets",
                            icon: "pi pi-box",
                            command: () => navigate("/settings/assets"),
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
