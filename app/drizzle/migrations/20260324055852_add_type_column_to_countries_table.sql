ALTER TABLE countries 
ADD COLUMN type VARCHAR NOT NULL DEFAULT 'Real'
CHECK (type IN ('Real', 'Fictional'));

UPDATE countries SET type = 'Real' WHERE name <> 'Disaster Land';
UPDATE countries SET type = 'Fictional' WHERE name = 'Disaster Land';