import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { sql } from "drizzle-orm";
import type { Tx } from "~/db.server";
import type { BackendContext } from "../../context";
import { parseFlexibleDate } from "../../utils/dateFilters";

interface TemporalValidationResult {
	isValid: boolean;
	errorMessage?: string;
	parentEventDates?: {
		startDate: string | null;
		endDate: string | null;
	};
	childEventDates?: {
		startDate: string | null;
		endDate: string | null;
	};
}

/**
 * Validates that a parent event's start date is not after the child's start date
 * @param tx Database transaction
 * @param childId ID of the child event
 * @param parentId ID of the potential parent event
 * @returns Validation result with status and error message if invalid
 */
export async function validateTemporalCausality(
	ctx: BackendContext,
	tx: Tx,
	childId: string,
	parentId: string,
): Promise<TemporalValidationResult> {
	// Get event dates and descriptions for both events
	const events = await tx
		.select({
			id: hazardousEventTable.id,
			startDate: hazardousEventTable.startDate,
			endDate: hazardousEventTable.endDate,
			description: hazardousEventTable.description,
		})
		.from(hazardousEventTable)
		.where(
			sql`${hazardousEventTable.id} = ${childId} OR ${hazardousEventTable.id} = ${parentId}`,
		);

	const parentEvent = events.find((e) => e.id === parentId);
	const childEvent = events.find((e) => e.id === childId);

	if (!parentEvent || !childEvent) {
		return {
			isValid: false,
			errorMessage: ctx.t({
				code: "events.events_not_found",
				msg: "One or both events could not be found",
			}),
		};
	}

	// Parse dates using the existing flexible date parser
	const parentStartDate = parentEvent.startDate
		? parseFlexibleDate(parentEvent.startDate.toString())
		: null;
	const childStartDate = childEvent.startDate
		? parseFlexibleDate(childEvent.startDate.toString())
		: null;

	// If either date is missing, we can't validate temporally
	if (!parentStartDate || !childStartDate) {
		return {
			isValid: true, // Don't block if dates aren't set
			parentEventDates: {
				startDate: parentStartDate,
				endDate: parentEvent.endDate?.toString() || null,
			},
			childEventDates: {
				startDate: childStartDate,
				endDate: childEvent.endDate?.toString() || null,
			},
		};
	}

	// Normalize dates for comparison
	const normalizedParent = normalizeDateForComparison(parentStartDate);
	const normalizedChild = normalizeDateForComparison(childStartDate);

	// Parent must start before or at the same time as child
	const isValid = normalizedParent <= normalizedChild;

	return {
		isValid,
		errorMessage: !isValid
			? createTemporalErrorMessage(
					parentEvent.description || `Event ${parentId.substring(0, 8)}`,
					childEvent.description || `Event ${childId.substring(0, 8)}`,
					parentStartDate,
					childStartDate,
				)
			: undefined,
		parentEventDates: {
			startDate: parentStartDate,
			endDate: parentEvent.endDate?.toString() || null,
		},
		childEventDates: {
			startDate: childStartDate,
			endDate: childEvent.endDate?.toString() || null,
		},
	};
}

/**
 * Normalizes dates to a consistent format for comparison
 * @param dateStr Date string in YYYY, YYYY-MM, or YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format for comparison
 */
function normalizeDateForComparison(dateStr: string): string {
	// If already in YYYY-MM-DD format, return as-is
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return dateStr;
	}

	// For YYYY-MM format, add day as 01
	if (/^\d{4}-\d{2}$/.test(dateStr)) {
		return `${dateStr}-01`;
	}

	// For YYYY format, add month and day as 01-01
	if (/^\d{4}$/.test(dateStr)) {
		return `${dateStr}-01-01`;
	}

	// For any other format, try to parse it as a date
	const date = new Date(dateStr);
	if (!isNaN(date.getTime())) {
		return date.toISOString().split("T")[0];
	}

	// If we can't parse it, return as-is (will likely fail comparison)
	return dateStr;
}

/**
 * Creates a user-friendly error message for temporal validation failures
 */
function createTemporalErrorMessage(
	parentName: string,
	childName: string,
	parentStartDate: string,
	childStartDate: string,
): string {
	const formatDateForDisplay = (dateStr: string): string => {
		if (/^\d{4}$/.test(dateStr)) return `the year ${dateStr}`;
		if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}`;
		return new Date(dateStr).toLocaleDateString();
	};

	const parentDisplay = formatDateForDisplay(parentStartDate);
	const childDisplay = formatDateForDisplay(childStartDate);

	return `Timeline conflict: '${parentName}' started in ${parentDisplay}, but '${childName}' started in ${childDisplay}. A parent event must occur before or at the same time as the event it causes. Please select a parent event that starts earlier or on the same date.`;
}

