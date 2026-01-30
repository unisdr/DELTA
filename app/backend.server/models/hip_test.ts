import { dr } from '~/db.server'
import {sql} from 'drizzle-orm'

import { hipTypeTable, hipClusterTable, hipHazardTable } from '~/drizzle/schema'

export async function createTestData() {
	await dr.execute(sql`TRUNCATE ${hipTypeTable}, ${hipClusterTable}, ${hipHazardTable} CASCADE`)

	let id = 0

	const [tp] = await dr
		.insert(hipTypeTable)
		.values({ id: "type1", name: {en: 'Test Type'} })
		.onConflictDoUpdate({
			target: hipTypeTable.id,
			set: { name: {en: 'Test Type'} },
		})
		.returning({ id: hipTypeTable.id })

	for (let i = 1; i <= 2; i++) {
		const [cluster] = await dr
			.insert(hipClusterTable)
			.values({
				id: "cluster" + i,
				typeId: tp.id,
				name: {en: `Test Cluster ${i}`},
			})
			.returning({ id: hipClusterTable.id })

		for (let j = 1; j <= 3; j++) {
			id++
			await dr
				.insert(hipHazardTable)
				.values({
					id: `hazard${id}`,
					clusterId: cluster.id,
					name: {en: `Test Hazard ${i}-${j}`},
					description: {en: `Description for Hazard ${i}-${j}`},
				})
		}
	}
}

