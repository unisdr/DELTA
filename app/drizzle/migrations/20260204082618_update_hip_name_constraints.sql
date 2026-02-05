ALTER TABLE hip_class DROP CONSTRAINT name_en_not_empty;
ALTER TABLE hip_cluster DROP CONSTRAINT name_en_not_empty;
ALTER TABLE hip_hazard DROP CONSTRAINT name_en_not_empty;
ALTER TABLE hip_hazard DROP CONSTRAINT description_en_not_empty;

ALTER TABLE hip_class
ADD CONSTRAINT name_en_not_empty
CHECK ((name->>'en') IS NOT NULL AND TRIM(COALESCE((name->>'en'), '')) <> '');

ALTER TABLE hip_cluster
ADD CONSTRAINT name_en_not_empty
CHECK ((name->>'en') IS NOT NULL AND TRIM(COALESCE((name->>'en'), '')) <> '');

ALTER TABLE hip_hazard
ADD CONSTRAINT name_en_not_empty
CHECK ((name->>'en') IS NOT NULL AND TRIM(COALESCE((name->>'en'), '')) <> '');

ALTER TABLE hip_hazard
ADD CONSTRAINT description_en_not_empty
CHECK ((description->>'en') IS NOT NULL AND TRIM(COALESCE((description->>'en'), '')) <> '');
