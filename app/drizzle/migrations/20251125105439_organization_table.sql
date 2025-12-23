CREATE TABLE IF NOT EXISTS "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"api_import_id" text,
	"country_accounts_id" uuid,
	CONSTRAINT "organization___api_import_id_country_accounts_id" UNIQUE NULLS NOT DISTINCT(
		"name", 
		"api_import_id",
		"country_accounts_id"
	)
);