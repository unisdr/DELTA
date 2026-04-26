ALTER TABLE "hazardous_event"
	ALTER COLUMN "description" DROP NOT NULL,
	ALTER COLUMN "description" DROP DEFAULT,
	ALTER COLUMN "chains_explanation" DROP NOT NULL,
	ALTER COLUMN "chains_explanation" DROP DEFAULT,
	ALTER COLUMN "magnitude" DROP NOT NULL,
	ALTER COLUMN "magnitude" DROP DEFAULT,
	ALTER COLUMN "record_originator" DROP NOT NULL,
	ALTER COLUMN "record_originator" DROP DEFAULT,
	ALTER COLUMN "national_specification" DROP NOT NULL,
	ALTER COLUMN "national_specification" DROP DEFAULT,
	ALTER COLUMN "data_source" DROP NOT NULL,
	ALTER COLUMN "data_source" DROP DEFAULT;
