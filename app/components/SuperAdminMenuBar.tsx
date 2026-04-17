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
    siteName?: string;
    firstName?: string;
    lastName?: string;
}

export default function SuperAdminMenuBar({
    isLoggedIn,
    siteName,
    firstName,
    lastName,
}: Props) {
    const menu = useRef<Menu>(null);
    const ctx = new ViewContext();
    const location = useLocation();
    const submit = useSubmit();
    const navigate = useNavigate();

    const avatarLabel = `${(firstName || "").trim().charAt(0)}${(lastName || "").trim().charAt(0)}`.toUpperCase();

    const avatarMenuModel = [
        {
            label: ctx.t({ code: "nav.sign_out", msg: "Sign out" }),
            icon: "pi pi-sign-out",
            command: () => {
                submit(null, {
                    method: "post",
                    action: ctx.url("/admin/logout"),
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
            {/* <div className="w-8 h-8 md:w-10 md:h-10 bg-[#004F91] rounded-lg flex items-center justify-center shrink-0">
                <i className="pi pi-globe text-white !text-base md:!text-2xl"></i>
            </div> */}
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
                    </div>
                </>
            )}
        </div>
    );

    const end = isLoggedIn ? (
        <div className="shrink-0 flex items-center gap-1 md:gap-2"
            style={{ marginInlineStart: "auto" }}    >
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
                model={avatarMenuModel}
                popup
                popupAlignment={ctx.lang === "ar" ? "right" : "left"}
                ref={menu}
                pt={{
                    menu: { className: "min-w-[180px]" },
                    menuitem: { className: "p-2" },
                }}
            />
        </div>
    ) : location.pathname.includes(ctx.url("admin/login")) ? (
        ""
    ) : (
        <div className="shrink-0 flex items-center gap-1 md:gap-2"
            style={{ marginInlineStart: "auto" }}>
            <Divider layout="vertical" className="hidden md:block !mx-1" />

            <Link to={urlLang(ctx.lang, "/admin/login")}>
                <Button
                    label={ctx.t({
                        code: "common.signin",
                    })}
                />
            </Link>
        </div>
    );

    const items: any[] = [
        ...(isLoggedIn
            ? [
                {
                    label: ctx.t({ code: "nav.super_admin", msg: "Super Admin" }).toUpperCase(),
                    icon: "pi pi-shield",
                    items: [
                        {
                            label: "Country Accounts Management",
                            icon: "pi pi-globe",
                            description: "Manage country accounts",
                            command: () => navigate(ctx.url("/admin/country-accounts")),
                            template: itemRenderer,
                        },
                        {
                            label: "Fictitious Country Management",
                            icon: "pi pi-map",
                            description: "Manage fictitious countries",
                            command: () => navigate(ctx.url("/admin/fictitious-country-mgmt")),
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
                    className: "shrink-0",
                    style: { marginInlineStart: "auto" },
                },
                submenu: {
                    className:
                        "min-w-[16rem] w-[min(21.25rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]",
                    style: {
                        insetInlineStart: "auto",
                        insetInlineEnd: 0,
                    },

                },
                menu: {
                    className: "min-w-0 md:flex-1 md:flex md:justify-end",
                },
            }}
        />
    );
}
