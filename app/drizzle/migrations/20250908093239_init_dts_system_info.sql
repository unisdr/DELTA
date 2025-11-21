-- Custom SQL migration file, put your code below! --
DELETE FROM public.dts_system_info;

INSERT INTO
	public.dts_system_info (id, version_no)
VALUES
	('73f0defb-4eba-4398-84b3-5e6737fec2b7', '0.1.2');