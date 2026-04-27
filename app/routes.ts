import type { RouteConfig } from "@react-router/dev/routes";
import { remixRoutesOptionAdapter } from "@react-router/remix-routes-option-adapter";

export default remixRoutesOptionAdapter((defineRoutes) => {
	const rootRoutes = defineRoutes((route) => {
		route("/", "routes/_index.tsx");
		route("*", "routes/$.tsx");
	});

	const settingsRoutes = defineRoutes((route) => {
		route("settings", "routes/settings/route.tsx", () => {
			route("organizations", "routes/settings/organizations/index.tsx", () => {
				route("new", "routes/settings/organizations/new.tsx");
				route(":id/edit", "routes/settings/organizations/edit.tsx");
				route(":id/delete", "routes/settings/organizations/delete.tsx");
			});

			route("api-key", "routes/settings/api-key/index.tsx", () => {
				route("new", "routes/settings/api-key/new.tsx");
				route(":id/edit", "routes/settings/api-key/edit.tsx");
				route(":id/delete", "routes/settings/api-key/delete.tsx");
			});

			route("system", "routes/settings/system/index.tsx", () => {
				route("edit", "routes/settings/system/edit.tsx");
			});

			route("access-mgmnt", "routes/settings/access-mgmnt/_layout.tsx", () => {
				route("", "routes/settings/access-mgmnt/_index.tsx");
				route("new", "routes/settings/access-mgmnt/new.tsx");
				route(":id/edit", "routes/settings/access-mgmnt/edit.tsx");
				route(":id/delete", "routes/settings/access-mgmnt/delete.tsx");
				route(
					":id/resend-invitation",
					"routes/settings/access-mgmnt/resend-invitation.tsx",
				);
			});

			route("assets", "routes/settings/assets/_index.tsx", () => {
				route("new", "routes/settings/assets/new.tsx");
				route(":id/edit", "routes/settings/assets/edit.tsx");
				route(":id/delete", "routes/settings/assets/delete.tsx");
			});
			route("assets/:id", "routes/settings/assets/$id.tsx");

			route("geography", "routes/settings/geography/_index.tsx");
			route("geography/:id", "routes/settings/geography/$id.tsx");
			route("geography/:id/edit", "routes/settings/geography/edit.tsx");
			route("geography/upload", "routes/settings/geography/upload.tsx");
			route("geography/csv-export", "routes/settings/geography/csv-export.ts");

			route(
				"human-effects-dsg",
				"routes/settings/human-effects-dsg/_index.tsx",
			);
			route(
				"human-effects-dsg/custom",
				"routes/settings/human-effects-dsg/custom.tsx",
			);

			route("sectors", "routes/settings/sectors.tsx");
		});
	});

	const userRoutes = defineRoutes((route) => {
		route("user/login", "routes/user/login.tsx");
		route("user/logout", "routes/user/logout.tsx");
		route("user/welcome", "routes/user/welcome.tsx");
		route("user/select-instance", "routes/user/select-instance.tsx");
		route("user/refresh-session", "routes/user/refresh-session.tsx");
		route("user/accept-invite", "routes/user/accept-invite.tsx");
		route(
			"user/accept-invite-welcome",
			"routes/user/accept-invite-welcome.tsx",
		);
		route("user/forgot-password", "routes/user/forgot-password.tsx");
		route("user/reset-password", "routes/user/reset-password.tsx");
		route("user/change-password", "routes/user/change-password.tsx");
		route("user/totp-login", "routes/user/totp-login.tsx");
		route("user/totp-enable", "routes/user/totp-enable.tsx");
		route("user/totp-disable", "routes/user/totp-disable.tsx");

		route("user/profile", "routes/user/profile/_layout.tsx", () => {
			route("", "routes/user/profile/_index.tsx");
			route("edit", "routes/user/profile/edit.tsx");
		});
	});

	const adminRoutes = defineRoutes((route) => {
		route("admin/login", "routes/admin/login.tsx");
		route("admin/logout", "routes/admin/logout.tsx");

		route(
			"admin/country-accounts",
			"routes/admin/country-accounts/_layout.tsx",
			() => {
				route("", "routes/admin/country-accounts/_index.tsx");
				route("new", "routes/admin/country-accounts/new.tsx");
				route(":id/edit", "routes/admin/country-accounts/edit.tsx");
				route(":id/delete", "routes/admin/country-accounts/delete.tsx");
				route(":id/clone", "routes/admin/country-accounts/clone.tsx");
				route(
					":id/resend-invitation",
					"routes/admin/country-accounts/resend-invitation.tsx",
				);
			},
		);

		route(
			"admin/fictitious-country-mgmt",
			"routes/admin/fictitious-country-mgmt/index.tsx",
			() => {
				route("new", "routes/admin/fictitious-country-mgmt/new.tsx");
				route(":id/edit", "routes/admin/fictitious-country-mgmt/edit.tsx");
				route(":id/delete", "routes/admin/fictitious-country-mgmt/delete.tsx");
			},
		);
	});

	const setupRoutes = defineRoutes((route) => {
		route("setup/admin-account-sso", "routes/setup/admin-account-sso.tsx");
	});

	const infoRoutes = defineRoutes((route) => {
		route("about/about-the-system", "routes/about/about-the-system.tsx");
		route("about/methodologies", "routes/about/methodologies.tsx");
		route("about/partners", "routes/about/partners.tsx");
		route("about/support", "routes/about/support.tsx");
		route(
			"about/technical-specifications",
			"routes/about/technical-specifications.tsx",
		);

		route("faq", "routes/faq/_index.tsx");

		route("sso/azure-b2c/login", "routes/sso/azure-b2c.login.tsx");
		route("sso/azure-b2c/invite", "routes/sso/azure-b2c.invite.tsx");
	});

	const hazardousEventRoutes = defineRoutes((route) => {
		route("hazardous-event/:id", "routes/hazardous-event/$id.tsx");
		route("hazardous-event", "routes/hazardous-event/_index.tsx", () => {
			route(":id/delete", "routes/hazardous-event/delete.tsx");
		});
		route("hazardous-event/new", "routes/hazardous-event/new.tsx");
		route("hazardous-event/:id/edit", "routes/hazardous-event/edit.tsx");
	});

	const disasterEventRoutes = defineRoutes((route) => {
		route("disaster-event/:id", "routes/disaster-event/$id.tsx");
		route("disaster-event", "routes/disaster-event/_index.tsx", () => {
			route(":id/delete", "routes/disaster-event/delete.tsx");
		});
		route("disaster-event/new", "routes/disaster-event/new.tsx");
		route("disaster-event/:id/edit", "routes/disaster-event/edit.tsx");
	});

	return {
		...rootRoutes,
		...settingsRoutes,
		...userRoutes,
		...adminRoutes,
		...setupRoutes,
		...infoRoutes,
		...hazardousEventRoutes,
		...disasterEventRoutes,
	};
}) satisfies RouteConfig;
