-- Add column only if it does not exist
ALTER TABLE "human_dsg_config"
ADD COLUMN IF NOT EXISTS "country_accounts_id" uuid;

-- Add foreign key constraint only if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'human_dsg_config_country_accounts_id_country_accounts_id_fk'
    ) THEN
        ALTER TABLE "human_dsg_config"
        ADD CONSTRAINT "human_dsg_config_country_accounts_id_country_accounts_id_fk"
        FOREIGN KEY ("country_accounts_id")
        REFERENCES "public"."country_accounts"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
    END IF;
END$$;
