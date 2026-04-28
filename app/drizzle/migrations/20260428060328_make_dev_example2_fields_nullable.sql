-- Make field1, field2, field3 nullable in dev_example2 table
ALTER TABLE "dev_example2" ALTER COLUMN "field1" DROP NOT NULL;
ALTER TABLE "dev_example2" ALTER COLUMN "field2" DROP NOT NULL;
ALTER TABLE "dev_example2" ALTER COLUMN "field3" DROP NOT NULL;
