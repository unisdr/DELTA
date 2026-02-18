// rounds=10: ~10 hashes/sec
// this measurements is from another implementation

import bcrypt from "bcryptjs";

// https://github.com/kelektiv/node.bcrypt.js#readme
const bcryptRounds = 10;

export function passwordHash(password: string): string {
	return bcrypt.hashSync(password, bcryptRounds);
}

export async function passwordHashCompare(
	password: string,
	passwordHash: string,
) {
	if (password == "" || passwordHash == "") {
		return false;
	}
	return await bcrypt.compare(password, passwordHash);
}
