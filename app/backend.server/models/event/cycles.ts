
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { sql } from "drizzle-orm";
import type { Tx } from "~/db.server";

/**
 * Creates a user-friendly error message for cycle detection
 */
export function createCycleErrorMessage(
	childId: string,
	potentialParentId: string,
	childDescription?: string | null,
	parentDescription?: string | null,
	hasExistingChain?: boolean,
): string {
	// Create user-friendly names from descriptions or fallback to IDs
	const childName = childDescription
		? childDescription.length > 50
			? childDescription.substring(0, 50) + "..."
			: childDescription
		: `Event ${childId.substring(0, 8)}`;

	const parentName = parentDescription
		? parentDescription.length > 50
			? parentDescription.substring(0, 50) + "..."
			: parentDescription
		: `Event ${potentialParentId.substring(0, 8)}`;

	const baseMessage = `Cannot set '${parentName}' as the cause of '${childName}' because it would create a circular relationship.`;

	if (hasExistingChain) {
		// TODO: TRANSLATE: uses base mesasge needs review on how to translate better
		// Indirect cycle - there's already a chain from parent to child
		return `${baseMessage} This would create a loop because '${childName}' already leads back to '${parentName}' through existing relationships. Please select a different parent event.`;
	} else {
		// Direct cycle - direct relationship exists
		return `${baseMessage} This would create a loop because '${childName}' already leads back to '${parentName}'. Please select a different parent event.`;
	}
}

// TODO: TRANSLATE: translate this by converting err to func that accepts ctx
export const RelationCycleError = {
	code: "ErrRelationCycle",
	message:
		"Event relation cycle not allowed. This event or one of it's children, is set as the parent.",
};

interface CycleCheckResult {
	has_cycle: boolean;
	cycle_path?: string[];
	event_names?: Record<string, string>;
	child_description?: string | null;
	parent_description?: string | null;
	has_existing_chain?: boolean;
}

export async function checkForCycle(
	tx: Tx,
	childId: string,
	potentialParentId: string,
): Promise<CycleCheckResult> {
	// Get event descriptions for better error messages
	const eventDescriptions = await tx
		.select({
			id: hazardousEventTable.id,
			description: hazardousEventTable.description,
		})
		.from(hazardousEventTable)
		.where(
			sql`${hazardousEventTable.id} = ${childId} OR ${hazardousEventTable.id} = ${potentialParentId}`,
		);

	const descriptionMap = eventDescriptions.reduce(
		(acc, event) => {
			acc[event.id] = event.description;
			return acc;
		},
		{} as Record<string, string | null>,
	);

	// Check for cycles using recursive query
	const result = await tx.execute(sql`
        WITH RECURSIVE cycle_check AS (
            -- Start from the potential parent
            SELECT child_id, parent_id, ARRAY[child_id] as path
            FROM event_relationship
            WHERE child_id = ${potentialParentId}
            
            UNION ALL
            
            -- Recursively find all parents
            SELECT er.child_id, er.parent_id, cc.path || er.parent_id
            FROM event_relationship er
            JOIN cycle_check cc ON er.child_id = cc.parent_id
            WHERE 
                -- Stop if we find the original child (cycle) or if the path gets too long
                NOT er.parent_id = ANY(cc.path) AND 
                array_length(cc.path, 1) < 10
        )
        -- Check if the child appears in any parent's ancestry
        SELECT EXISTS (
            SELECT 1 FROM cycle_check 
            WHERE ${childId} = ANY(path) OR parent_id = ${childId}
            LIMIT 1
        ) as has_cycle;
    `);

	// Return better error information
	if (result.rows[0]?.has_cycle) {
		return {
			has_cycle: true,
			cycle_path: [childId, potentialParentId],
			event_names: {
				[childId]:
					descriptionMap[childId] || `Event ${childId.substring(0, 8)}`,
				[potentialParentId]:
					descriptionMap[potentialParentId] ||
					`Event ${potentialParentId.substring(0, 8)}`,
			},
			child_description: descriptionMap[childId],
			parent_description: descriptionMap[potentialParentId],
			has_existing_chain: true, // Assume existing chain since cycle was detected
		};
	}

	return { has_cycle: false };
}


