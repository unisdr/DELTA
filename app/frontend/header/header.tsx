import { useEffect, useState } from "react";
import { MegaMenu } from "~/frontend/megamenu2/megamenu";
import { Lvl1Item, mapNavLinks } from "~/frontend/megamenu2/common";
import { ViewContext } from "../context";

interface HeaderProps {
	ctx: ViewContext;
	loggedIn: boolean;
	siteName: string;
	siteLogo: string;
	userRole: string;
	isSuperAdmin?: boolean;
	isFormAuthSupported?: boolean;
}

interface LogoProps {
	src: string;
	alt: string;
}

const LogoComponent = ({ src, alt }: LogoProps) => {
	if (src.length === 0) {
		return "";
	} else {
		return <div className="dts-logo-img-container">
			<img src={src} alt={alt} />
		</div>
	}
};

export function Header({
	ctx,
	loggedIn,
	siteName,
	siteLogo,
	userRole,
	isSuperAdmin = false,
	isFormAuthSupported = true // Default to true for backward compatibility
}: HeaderProps) {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	let navItems = navItemsNotLoggedIn(ctx, userRole);
	if (loggedIn) {
		if (isSuperAdmin) {
			navItems = navItemsSuperAdmin(ctx);
		} else {
			navItems = navItemsLoggedIn(ctx, userRole, isFormAuthSupported);
		}
	}

	// add language prefix
	navItems = mapNavLinks(navItems, (s) => ctx.url(s))

	return (
		<>
			<header className={`dts-main-header ${isClient ? "js-enabled" : ""}`}>
				<div className="dts-logo-with-name">
					<LogoComponent src={siteLogo} alt="" />
					<span className="dts-title">{siteName}</span>
					<span className="dts-empty"></span>
				</div>
				<MegaMenu ctx={ctx} items={navItems} />
			</header>
		</>
	);
}

function navItemsNotLoggedIn(ctx: ViewContext, _userRole: string): Lvl1Item[] {
	return [
		{
			name: ctx.t({ "code": "nav.data", "msg": "Data" }),
			title: ctx.t({ "code": "nav.data_management", "msg": "Data management" }),
			icon: "other/data",
			lvl2: [
				{
					name: ctx.t({ "code": "nav.events_and_records", "msg": "Events and records" }),
					id: "group1",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.events", "msg": "Events" }),
							lvl4: [
								{
									name: ctx.t({ "code": "nav.hazardous_events", "msg": "Hazardous events" }),
									link: "/hazardous-event"
								},
								{
									name: ctx.t({ "code": "nav.disaster_events", "msg": "Disaster events" }),
									link: "/disaster-event"
								}
							],

						},
						{
							title: ctx.t({ "code": "nav.records", "msg": "Records" }),
							lvl4: [
								{ name: ctx.t({ "code": "nav.disaster_records", "msg": "Disaster records" }), link: "/disaster-record" },
							],
						},
					],
				},
			],
		},
		{
			name: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
			title: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
			icon: "other/analysis",
			lvl2: [
				{
					name: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
					id: "trends",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
							lvl4: [
								{ name: ctx.t({ "code": "nav.analysis.sectors", "msg": "Sectors" }), link: "/analytics/sectors" },
								{ name: ctx.t({ "code": "nav.analysis.hazards", "msg": "Hazards" }), link: "/analytics/hazards" },
								{ name: ctx.t({ "code": "nav.analysis.disaster_events", "msg": "Disaster events" }), link: "/analytics/disaster-events" },
							],
						},
					],
				},
			],
		},
		{
			name: ctx.t({ "code": "nav.about", "msg": "About" }),
			title: ctx.t({ "code": "nav.about_us", "msg": "About us" }),
			icon: "other/about",
			lvl2: [
				{
					name: ctx.t({ "code": "nav.general", "msg": "General" }),
					id: "project_info",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.general", "msg": "General" }),
							lvl4: [
								{ name: ctx.t({ "code": "nav.about_the_system", "msg": "About the system" }), link: "/about/about-the-system" },
								{ name: ctx.t({ "code": "nav.technical_specifications", "msg": "Technical specifications" }), link: "/about/technical-specifications" },
								{ name: ctx.t({ "code": "nav.partners", "msg": "Partners" }), link: "/about/partners" },
								{ name: ctx.t({ "code": "nav.methodologies", "msg": "Methodologies" }), link: "/about/methodologies" },
								{ name: ctx.t({ "code": "nav.support", "msg": "Support" }), link: "/about/support" },
							],
						},
					],
				},
			],
		},
		{
			name: ctx.t({ "code": "nav.sign_in", "msg": "Sign in" }),
			title: ctx.t({ "code": "nav.user_sign_in", "msg": "User sign in" }),
			icon: "other/user-profile",
			link: "/user/login",
		},
	];
}

function navItemsSuperAdmin(ctx: ViewContext): Lvl1Item[] {
	return [
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: "",
			title: "",
			link: "",
		},
		{
			name: ctx.t({ "code": "nav.sign_out", "msg": "Sign out" }),
			title: ctx.t({ "code": "nav.super_admin_logout", "msg": "Super Admin Logout" }),
			icon: "other/user-profile",
			link: "/admin/logout",
		}
	];
}

function navItemsLoggedIn(ctx: ViewContext, userRole: string, isFormAuthSupported: boolean): Lvl1Item[] {
	// Build the "Your profile" lvl4 items conditionally
	const yourProfileItems = [];

	const isLoggedInUserAdmin = userRole === "admin";

	// Only add "Change password" if form auth is supported
	if (isFormAuthSupported) {
		yourProfileItems.push({
			name: ctx.t({ "code": "nav.change_password", "msg": "Change password" }),
			link: "/user/change-password"
		});
	}

	// Always add TOTP option
	yourProfileItems.push({ name: ctx.t({ "code": "nav.totp_2fa", "msg": "TOTP (2FA)" }), link: "/user/totp-enable" });

	// this case should only happen for instance selection only /user/select-instance
	if (userRole === "") {
		return [
			{
				name: "",
				title: "",
				link: "",
			},
			{
				name: "",
				title: "",
				link: "",
			},
			{
				name: "",
				title: "",
				link: "",
			},
			{
				name: "",
				title: "",
				link: "",
			},
			{
				name: ctx.t({ "code": "nav.sign_out", "msg": "Sign out" }),
				title: ctx.t({ "code": "nav.user_sign_out", "msg": "User sign out" }),
				icon: "other/user-profile",
				link: "/user/logout",
			},
		];
	}


	return [
		{
			name: ctx.t({ "code": "nav.data", "msg": "Data" }),
			title: ctx.t({ "code": "nav.data_management", "msg": "Data management" }),
			icon: "other/data",
			lvl2: [
				{
					name: ctx.t({ "code": "nav.events_and_records", "msg": "Events and records" }),
					id: "group1",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.events", "msg": "Events" }),
							lvl4: [
								{ name: ctx.t({ "code": "nav.hazardous_events", "msg": "Hazardous events" }), link: "/hazardous-event" },
								{ name: ctx.t({ "code": "nav.disaster_events", "msg": "Disaster events" }), link: "/disaster-event" },
							],
						},
						{
							title: ctx.t({ "code": "nav.records", "msg": "Records" }),
							lvl4: [
								{ name: ctx.t({ "code": "nav.disaster_records", "msg": "Disaster records" }), link: "/disaster-record" },
							],
						},
					],
				},
			],
		},
		{
			name: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
			title: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
			icon: "other/analysis",
			lvl2: [
				{
					name: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
					id: "trends",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.analysis", "msg": "Analysis" }),
							lvl4: [
								{ name: ctx.t({ "code": "nav.analysis.sectors", "msg": "Sectors" }), link: "/analytics/sectors" },
								{ name: ctx.t({ "code": "nav.analysis.hazards", "msg": "Hazards" }), link: "/analytics/hazards" },
								{ name: ctx.t({ "code": "nav.analysis.disaster_events", "msg": "Disaster events" }), link: "/analytics/disaster-events" },
							],
						},
					],
				},
			],
		},
		{
			name: ctx.t({ "code": "nav.about", "msg": "About" }),
			title: ctx.t({ "code": "nav.about_us", "msg": "About us" }),
			icon: "other/about",
			lvl2: [
				{
					name: ctx.t({ "code": "nav.general", "msg": "General" }),
					id: "project_info",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.general", "msg": "General" }),
							lvl4: [
								{ name: ctx.t({ "code": "nav.about_the_system", "msg": "About the system" }), link: "/about/about-the-system" },
								{ name: ctx.t({ "code": "nav.technical_specifications", "msg": "Technical specifications" }), link: "/about/technical-specifications" },
								{ name: ctx.t({ "code": "nav.partners", "msg": "Partners" }), link: "/about/partners" },
								{ name: ctx.t({ "code": "nav.methodologies", "msg": "Methodologies" }), link: "/about/methodologies" },
								{ name: ctx.t({ "code": "nav.support", "msg": "Support" }), link: "/about/support" },
							],
						},
					],
				},
			],
		},
		{
			name: ctx.t({ "code": "nav.settings", "msg": "Settings" }),
			title: ctx.t({ "code": "nav.user_and_system_settings", "msg": "User and system settings" }),
			icon: "other/settings",
			lvl2: [
				{
					name: ctx.t({ "code": "nav.main_settings", "msg": "Main settings" }),
					id: "main-settings",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.system", "msg": "System" }),
							lvl4: isLoggedInUserAdmin
								? [
									{ name: ctx.t({ "code": "nav.access_management", "msg": "Access management" }), link: "/settings/access-mgmnt" },
									{ name: ctx.t({ "code": "nav.system_settings", "msg": "System settings" }), link: "/settings/system" },
									{ name: ctx.t({ "code": "nav.geographic_levels", "msg": "Geographic levels" }), link: "/settings/geography" },
									{ name: ctx.t({ "code": "nav.sectors", "msg": "Sectors" }), link: "/settings/sectors" },
									{ name: ctx.t({ "code": "nav.api_keys", "msg": "API keys" }), link: "/settings/api-key" },
									{ name: ctx.t({ "code": "nav.assets", "msg": "Assets" }), link: "/settings/assets" },
								]
								: [
									{ name: ctx.t({ "code": "nav.sectors", "msg": "Sectors" }), link: "/settings/sectors" },
									{ name: ctx.t({ "code": "nav.assets", "msg": "Assets" }), link: "/settings/assets" },
								],
						},
						{
							title: ctx.t({ "code": "nav.your_profile", "msg": "Your profile" }),
							lvl4: yourProfileItems,
						},
					],
				},
				{
					name: ctx.t({ "code": "nav.user", "msg": "User" }),
					id: "user-settings",
					lvl3: [
						{
							title: ctx.t({ "code": "nav.account", "msg": "Account" }),
							lvl4: isFormAuthSupported
								? [
									// Only show password-related options if form auth is supported

									{ name: ctx.t({ "code": "nav.change_password", "msg": "Change password" }), link: "/user/change-password" },
									{ name: ctx.t({ "code": "nav.change_email", "msg": "Change email" }), link: "#" },
								]
								: [
									// Only show non-password options when form auth is disabled

									{ name: ctx.t({ "code": "nav.change_email", "msg": "Change email" }), link: "#" },
								],
						},
					],
				},
			],
		},
		{
			name: ctx.t({ "code": "nav.sign_out", "msg": "Sign out" }),
			title: ctx.t({ "code": "nav.user_sign_out", "msg": "User sign out" }),
			icon: "other/user-profile",
			link: "/user/logout",
		}
	];
}
