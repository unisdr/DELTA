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

			route("assets", "routes/settings/assets/_index.tsx");
			route("assets/new", "routes/settings/assets/new.tsx");
			route("assets/:id", "routes/settings/assets/$id.tsx");
			route("assets/:id/edit", "routes/settings/assets/edit.tsx");
			route("assets/:id/delete", "routes/settings/assets/delete.tsx");
			route(
				"assets/content-picker-datasource",
				"routes/settings/assets/content-picker-datasource.tsx",
			);

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

		route(
			"analytics/content-picker-config",
			"routes/analytics/content-picker-config.tsx",
		);
		route(
			"analytics/content-picker-datasource",
			"routes/analytics/content-picker-datasource.tsx",
		);
		route("analytics/disaster-events", "routes/analytics/disaster-events.tsx");
		route(
			"analytics/disaster-events/sector",
			"routes/analytics/disaster-events.sector.tsx",
		);
		route("analytics/hazards", "routes/analytics/hazards.tsx");
		route("analytics/sectors", "routes/analytics/sectors.tsx");

		route("error/unauthorized", "routes/error/unauthorized.tsx");
		route("faq", "routes/faq/_index.tsx");

		route("sso/azure-b2c/login", "routes/sso/azure-b2c.login.tsx");
		route("sso/azure-b2c/invite", "routes/sso/azure-b2c.invite.tsx");
	});

	const disasterEventRoutes = defineRoutes((route) => {
		route("disaster-event/new", "routes/disaster-event/new.tsx");
		route("disaster-event/:id", "routes/disaster-event/$id.tsx");
		route("disaster-event", "routes/disaster-event/_index.tsx");
		route("disaster-event/csv-export", "routes/disaster-event/csv-export.ts");
		route("disaster-event/csv-import", "routes/disaster-event/csv-import.tsx");
		route("disaster-event/:id/delete", "routes/disaster-event/delete.tsx");
		route("disaster-event/:id/edit", "routes/disaster-event/edit.tsx");
		route(
			"disaster-event/file-pre-upload",
			"routes/disaster-event/file-pre-upload.tsx",
		);
		route(
			"disaster-event/file-temp-viewer",
			"routes/disaster-event/file-temp-viewer.tsx",
		);
		route(
			"disaster-event/file-viewer",
			"routes/disaster-event/file-viewer.tsx",
		);
		route("disaster-event/picker", "routes/disaster-event/picker.tsx");
	});

	const hazardousEventRoutes = defineRoutes((route) => {
		route("hazardous-event/:id", "routes/hazardous-event/$id.tsx");
		route("hazardous-event", "routes/hazardous-event/_index.tsx");
		route("hazardous-event/new", "routes/hazardous-event/new.tsx");
		route("hazardous-event/:id/delete", "routes/hazardous-event/delete.tsx");
		route("hazardous-event/:id/edit", "routes/hazardous-event/edit.tsx");
	});

	const disasterRecordRoutes = defineRoutes((route) => {
		route("disaster-record/:id", "routes/disaster-record/$id.tsx");
		route("disaster-record", "routes/disaster-record/_index.tsx");
		route(
			"disaster-record/content-picker-config",
			"routes/disaster-record/content-picker-config.tsx",
		);
		route(
			"disaster-record/content-picker-datasource",
			"routes/disaster-record/content-picker-datasource.tsx",
		);
		route("disaster-record/csv-export", "routes/disaster-record/csv-export.ts");
		route(
			"disaster-record/csv-import",
			"routes/disaster-record/csv-import.tsx",
		);
		route("disaster-record/:id/delete", "routes/disaster-record/delete.tsx");
		route("disaster-record/:id/edit", "routes/disaster-record/edit.tsx");
		route(
			"disaster-record/edit-sec/:disRecId",
			"routes/disaster-record/edit-sec.$disRecId/_index.tsx",
		);
		route(
			"disaster-record/edit-sec/:disRecId/delete",
			"routes/disaster-record/edit-sec.$disRecId/delete.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/damages/:id",
			"routes/disaster-record/edit-sub.$disRecId/damages/$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/damages",
			"routes/disaster-record/edit-sub.$disRecId/damages/_index.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/damages/csv-export",
			"routes/disaster-record/edit-sub.$disRecId/damages/csv-export.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/damages/csv-import",
			"routes/disaster-record/edit-sub.$disRecId/damages/csv-import.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/damages/:id/delete",
			"routes/disaster-record/edit-sub.$disRecId/damages/delete.$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/damages/:id/edit",
			"routes/disaster-record/edit-sub.$disRecId/damages/edit.$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/disruptions/:id",
			"routes/disaster-record/edit-sub.$disRecId/disruptions/$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/disruptions",
			"routes/disaster-record/edit-sub.$disRecId/disruptions/_index.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/disruptions/csv-export",
			"routes/disaster-record/edit-sub.$disRecId/disruptions/csv-export.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/disruptions/csv-import",
			"routes/disaster-record/edit-sub.$disRecId/disruptions/csv-import.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/disruptions/:id/delete",
			"routes/disaster-record/edit-sub.$disRecId/disruptions/delete.$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/disruptions/:id/edit",
			"routes/disaster-record/edit-sub.$disRecId/disruptions/edit.$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/human-effects",
			"routes/disaster-record/edit-sub.$disRecId/human-effects/_index.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/human-effects/clear",
			"routes/disaster-record/edit-sub.$disRecId/human-effects/clear.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/human-effects/csv-export",
			"routes/disaster-record/edit-sub.$disRecId/human-effects/csv-export.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/human-effects/csv-import",
			"routes/disaster-record/edit-sub.$disRecId/human-effects/csv-import.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/human-effects/delete-all-data",
			"routes/disaster-record/edit-sub.$disRecId/human-effects/delete-all-data.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/human-effects/load",
			"routes/disaster-record/edit-sub.$disRecId/human-effects/load.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/human-effects/save",
			"routes/disaster-record/edit-sub.$disRecId/human-effects/save.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/losses/:id",
			"routes/disaster-record/edit-sub.$disRecId/losses/$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/losses",
			"routes/disaster-record/edit-sub.$disRecId/losses/_index.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/losses/csv-export",
			"routes/disaster-record/edit-sub.$disRecId/losses/csv-export.ts",
		);
		route(
			"disaster-record/edit-sub/:disRecId/losses/csv-import",
			"routes/disaster-record/edit-sub.$disRecId/losses/csv-import.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/losses/:id/delete",
			"routes/disaster-record/edit-sub.$disRecId/losses/delete.$id.tsx",
		);
		route(
			"disaster-record/edit-sub/:disRecId/losses/:id/edit",
			"routes/disaster-record/edit-sub.$disRecId/losses/edit.$id.tsx",
		);
		route(
			"disaster-record/file-pre-upload",
			"routes/disaster-record/file-pre-upload.tsx",
		);
		route(
			"disaster-record/file-temp-viewer",
			"routes/disaster-record/file-temp-viewer.tsx",
		);
		route(
			"disaster-record/file-viewer",
			"routes/disaster-record/file-viewer.tsx",
		);
		route(
			"disaster-record/non-economic-losses/:id",
			"routes/disaster-record/non-economic-losses.$id/_index.tsx",
		);
		route(
			"disaster-record/non-economic-losses/:id/delete",
			"routes/disaster-record/non-economic-losses.$id/delete.ts",
		);
	});

	const apiRoutes = defineRoutes((route) => {
		route("api", "routes/api/_index.tsx");
		route("api/asset", "routes/api/asset/_index.tsx");
		route("api/asset/add", "routes/api/asset/add.ts");
		route("api/asset/fields", "routes/api/asset/fields.ts");
		route("api/asset/getassets", "routes/api/asset/getassets.ts");
		route("api/asset/list", "routes/api/asset/list.ts");
		route("api/asset/update", "routes/api/asset/update.ts");
		route("api/asset/upsert", "routes/api/asset/upsert.ts");
		route("api/categories/list", "routes/api/categories/list.ts");
		route("api/client-log", "routes/api/client-log.ts");
		route("api/damage", "routes/api/damage/_index.tsx");
		route("api/damage/add", "routes/api/damage/add.ts");
		route(
			"api/damage/csv-import-example",
			"routes/api/damage/csv-import-example.ts",
		);
		route("api/damage/fields", "routes/api/damage/fields.ts");
		route("api/damage/list", "routes/api/damage/list.ts");
		route("api/damage/update", "routes/api/damage/update.ts");
		route("api/damage/upsert", "routes/api/damage/upsert.ts");
		route("api/disaster-event", "routes/api/disaster-event/_index.tsx");
		route("api/disaster-event/add", "routes/api/disaster-event/add.ts");
		route(
			"api/disaster-event/csv-import-example",
			"routes/api/disaster-event/csv-import-example.ts",
		);
		route("api/disaster-event/fields", "routes/api/disaster-event/fields.ts");
		route("api/disaster-event/list", "routes/api/disaster-event/list.ts");
		route(
			"api/disaster-event/tags-sectors",
			"routes/api/disaster-event/tags-sectors.ts",
		);
		route("api/disaster-event/update", "routes/api/disaster-event/update.ts");
		route("api/disaster-event/upsert", "routes/api/disaster-event/upsert.ts");
		route(
			"api/disaster-events/:disaster_event_id/recovery-cost",
			"routes/api/disaster-events.$disaster_event_id/recovery-cost.ts",
		);
		route(
			"api/disaster-events/:disaster_event_id/rehabilitation-cost",
			"routes/api/disaster-events.$disaster_event_id/rehabilitation-cost.tsx",
		);
		route(
			"api/disaster-events/:disaster_event_id/repair-cost",
			"routes/api/disaster-events.$disaster_event_id/repair-cost.tsx",
		);
		route(
			"api/disaster-events/:disaster_event_id/replacement-cost",
			"routes/api/disaster-events.$disaster_event_id/replacement-cost.tsx",
		);
		route("api/disaster-record", "routes/api/disaster-record/_index.tsx");
		route("api/disaster-record/add", "routes/api/disaster-record/add.ts");
		route(
			"api/disaster-record/csv-import-example",
			"routes/api/disaster-record/csv-import-example.ts",
		);
		route(
			"api/disaster-record/delete/:id",
			"routes/api/disaster-record/delete.$id.ts",
		);
		route("api/disaster-record/fields", "routes/api/disaster-record/fields.ts");
		route("api/disaster-record/list", "routes/api/disaster-record/list.ts");
		route("api/disaster-record/update", "routes/api/disaster-record/update.ts");
		route("api/disaster-record/upsert", "routes/api/disaster-record/upsert.ts");
		route("api/disruption", "routes/api/disruption/_index.tsx");
		route("api/disruption/add", "routes/api/disruption/add.ts");
		route(
			"api/disruption/csv-import-example",
			"routes/api/disruption/csv-import-example.ts",
		);
		route("api/disruption/fields", "routes/api/disruption/fields.ts");
		route("api/disruption/list", "routes/api/disruption/list.ts");
		route("api/disruption/update", "routes/api/disruption/update.ts");
		route("api/disruption/upsert", "routes/api/disruption/upsert.ts");
		route("api/division", "routes/api/division/_index.tsx");
		route("api/division/delete_all", "routes/api/division/delete_all.ts");
		route("api/division/list", "routes/api/division/list.ts");
		route("api/division/upload", "routes/api/division/upload.ts");
		route("api/geojson/:id", "routes/api/geojson.$id.ts");
		route("api/hips", "routes/api/hips/_index.tsx");
		route("api/hips/cluster", "routes/api/hips/cluster/_index.tsx");
		route("api/hips/cluster/list", "routes/api/hips/cluster/list.ts");
		route("api/hips/hazard", "routes/api/hips/hazard/_index.tsx");
		route("api/hips/hazard/list", "routes/api/hips/hazard/list.ts");
		route("api/hips/type", "routes/api/hips/type/_index.tsx");
		route("api/hips/type/list", "routes/api/hips/type/list.ts");
		route("api/human-effects", "routes/api/human-effects/_index.tsx");
		route(
			"api/human-effects/category-presence-save",
			"routes/api/human-effects/category-presence-save.tsx",
		);
		route("api/human-effects/clear", "routes/api/human-effects/clear.tsx");
		route("api/human-effects/list", "routes/api/human-effects/list.tsx");
		route("api/human-effects/save", "routes/api/human-effects/save.tsx");
		route("api/losses", "routes/api/losses/_index.tsx");
		route("api/losses/add", "routes/api/losses/add.ts");
		route(
			"api/losses/csv-import-example",
			"routes/api/losses/csv-import-example.ts",
		);
		route("api/losses/fields", "routes/api/losses/fields.ts");
		route("api/losses/list", "routes/api/losses/list.ts");
		route("api/losses/update", "routes/api/losses/update.ts");
		route("api/losses/upsert", "routes/api/losses/upsert.ts");
		route("api/mcp", "routes/api/mcp.ts");
		route("api/nonecolosses", "routes/api/nonecolosses/_index.tsx");
		route("api/nonecolosses/add", "routes/api/nonecolosses/add.ts");
		route(
			"api/nonecolosses/csv-import-example",
			"routes/api/nonecolosses/csv-import-example.ts",
		);
		route("api/nonecolosses/fields", "routes/api/nonecolosses/fields.ts");
		route("api/nonecolosses/list", "routes/api/nonecolosses/list.ts");
		route("api/nonecolosses/update", "routes/api/nonecolosses/update.ts");
		route("api/nonecolosses/upsert", "routes/api/nonecolosses/upsert.ts");
		route("api/organization", "routes/api/organization/_index.tsx");
		route("api/organization/add", "routes/api/organization/add.ts");
		route("api/organization/fields", "routes/api/organization/fields.ts");
		route("api/qrcode", "routes/api/qrcode.tsx");
		route("api/sector", "routes/api/sector/_index.tsx");
		route("api/sector/list", "routes/api/sector/list.ts");
		route(
			"api/sector-disaster-record-relation",
			"routes/api/sector-disaster-record-relation/_index.tsx",
		);
		route(
			"api/sector-disaster-record-relation/add",
			"routes/api/sector-disaster-record-relation/add.ts",
		);
		route(
			"api/sector-disaster-record-relation/fields",
			"routes/api/sector-disaster-record-relation/fields.ts",
		);
		route(
			"api/sector-disaster-record-relation/list",
			"routes/api/sector-disaster-record-relation/list.ts",
		);
		route(
			"api/sector-disaster-record-relation/update",
			"routes/api/sector-disaster-record-relation/update.ts",
		);
		route(
			"api/sector-disaster-record-relation/upsert",
			"routes/api/sector-disaster-record-relation/upsert.ts",
		);
		route(
			"api/spatial-footprint-geojson",
			"routes/api/spatial-footprint-geojson.ts",
		);
		route("api/subsectors", "routes/api/subsectors.tsx");
	});

	return {
		...rootRoutes,
		...settingsRoutes,
		...userRoutes,
		...adminRoutes,
		...setupRoutes,
		...infoRoutes,
		...disasterEventRoutes,
		...hazardousEventRoutes,
		...disasterRecordRoutes,
		...apiRoutes,
	};
}) satisfies RouteConfig;
