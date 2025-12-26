import { initServer, endServer } from '~/init.server';
import '~/backend.server/all_test'
import '~/frontend/all_test'
import { before, after } from 'node:test';
import { loadEnvFile } from "~/util/env";

loadEnvFile("test")

before(async () => {
	try {
		initServer()
	} catch (err) {
		console.log(err)
		process.exit(1)
	}
});

after(async () => {
	endServer()
});



