CREATE TABLE IF NOT EXISTS "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_accounts_id" uuid NOT NULL,
	"title_json" jsonb,
	"body_json" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"audience" text DEFAULT 'private' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "notices_country_accounts_id_fk" FOREIGN KEY ("country_accounts_id")
		REFERENCES "country_accounts"("id")
		ON DELETE CASCADE
);
