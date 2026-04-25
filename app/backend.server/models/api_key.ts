import { dr } from "~/db.server";
import { apiKeyTable, SelectApiKey } from "~/drizzle/schema/apiKeyTable";
import { eq } from "drizzle-orm";

import { userTable } from "~/drizzle/schema";

// NEW: Extended interface for user-centric token creation
export interface UserCentricApiKeyFields extends Omit<
	SelectApiKey,
	"id" | "secret" | "createdAt" | "updatedAt"
> {
	assignedToUserId?: string; // The actual user who will use this token
}

/**
 * NEW: Token Assignment Parser - extracts user assignment from token name
 * Backward compatible approach without schema changes
 */
export class TokenAssignmentParser {
	/**
	 * Extracts assigned user ID from token name using embedded pattern
	 * @param tokenName - Token name that may contain user assignment
	 * @returns number | null - Assigned user ID or null if not assigned
	 */
	static parseAssignedUserId(tokenName: string): string | null {
		if (!tokenName) return null;

		const match = tokenName.match(/__ASSIGNED_USER_(.+)$/);
		return match ? match[1] : null;
	}

	/**
	 * Gets clean display name without assignment suffix
	 * @param tokenName - Full token name with potential assignment
	 * @returns string - Clean display name
	 */
	static getCleanTokenName(tokenName: string): string {
		if (!tokenName) return "";

		return tokenName.replace(/__ASSIGNED_USER_\d+$/, "");
	}

	/**
	 * Gets token assignment details
	 * @param key - API key object
	 * @returns Object with assignment info
	 */
	static getTokenAssignment(key: SelectApiKey): {
		assignedUserId: string | null;
		isUserAssigned: boolean;
		cleanName: string;
		managedByUserId: string;
	} {
		const assignedUserId = this.parseAssignedUserId(key.name);

		return {
			assignedUserId,
			isUserAssigned: assignedUserId !== null,
			cleanName: this.getCleanTokenName(key.name),
			managedByUserId: key.managedByUserId,
		};
	}
}

/**
 * ENHANCED: User status validation service - supports both admin and assigned user validation
 */
class UserStatusValidator {
	/**
	 * Validates if user should have API access based on existing schema fields
	 * @param userId - User ID to validate
	 * @returns Promise<boolean> - true if user is active for API access
	 */
	static async isUserActiveForApi(userId: string): Promise<boolean> {
		try {
			const user = await dr.query.userTable.findFirst({
				where: eq(userTable.id, userId),
			});

			if (!user) {
				return false;
			}

			return this.validateUserActiveStatus(user);
		} catch (error) {
			console.error(`Error validating user ${userId} status:`, error);
			return false; // Fail closed for security
		}
	}

	/**
	 * Internal validation logic - extracted for DRY principle
	 */
	private static validateUserActiveStatus(user: any): boolean {
		// User is active if email verified and not in pending/reset state
		const hasVerifiedEmail = user.emailVerified;
		const hasPendingInvite =
			user.inviteCode &&
			user.inviteExpiresAt &&
			user.inviteExpiresAt > new Date();
		const hasActivePasswordReset =
			user.resetPasswordToken &&
			user.resetPasswordExpiresAt &&
			user.resetPasswordExpiresAt > new Date();

		return hasVerifiedEmail && !hasPendingInvite && !hasActivePasswordReset;
	}

	/**
	 * Get detailed user status with reasons - for audit purposes
	 */
	static async getUserStatusDetails(user: any): Promise<{
		isActive: boolean;
		issues: string[];
	}> {
		const issues: string[] = [];

		if (!user) {
			issues.push("User not found");
			return { isActive: false, issues };
		}

		if (!user.emailVerified) issues.push("Email not verified");
		if (
			user.inviteCode &&
			user.inviteExpiresAt &&
			user.inviteExpiresAt > new Date()
		) {
			issues.push("Pending invite");
		}
		if (
			user.resetPasswordToken &&
			user.resetPasswordExpiresAt &&
			user.resetPasswordExpiresAt > new Date()
		) {
			issues.push("In password reset");
		}

		return {
			isActive: issues.length === 0,
			issues,
		};
	}

	/**
	 * NEW: Validates token access based on assignment model
	 * @param key - API key to validate
	 * @returns Promise<{isValid: boolean, reason?: string}> - Validation result
	 */
	static async validateTokenAccess(key: SelectApiKey): Promise<{
		isValid: boolean;
		reason?: string;
		validatedUser?: "admin" | "assigned_user";
	}> {
		const assignment = TokenAssignmentParser.getTokenAssignment(key);

		// If token is assigned to a specific user, validate that user
		if (assignment.isUserAssigned && assignment.assignedUserId) {
			const assignedUserActive = await this.isUserActiveForApi(
				assignment.assignedUserId,
			);

			if (!assignedUserActive) {
				return {
					isValid: false,
					reason: `Assigned user ${assignment.assignedUserId} is inactive`,
					validatedUser: "assigned_user",
				};
			}

			return {
				isValid: true,
				validatedUser: "assigned_user",
			};
		}

		// Fallback to admin validation for non-assigned tokens
		const adminActive = await this.isUserActiveForApi(
			assignment.managedByUserId,
		);

		if (!adminActive) {
			return {
				isValid: false,
				reason: `Managing admin ${assignment.managedByUserId} is inactive`,
				validatedUser: "admin",
			};
		}

		return {
			isValid: true,
			validatedUser: "admin",
		};
	}
}

/**
 * ENHANCED: API Security Audit Service - now supports user-centric tokens
 */
export class ApiSecurityAudit {
	/**
	 * Performs complete security audit of all API keys with assignment details
	 */
	static async auditApiKeysSecurity(): Promise<{
		total: number;
		adminManaged: number;
		userAssigned: number;
		active: number;
		withInactiveUsers: number;
		details: Array<{
			keyId: string;
			keyName: string;
			cleanName: string;
			managingUserEmail: string;
			assignedUserId?: string;
			assignedUserEmail?: string;
			tokenType: "admin_managed" | "user_assigned";
			issues: string[];
		}>;
	}> {
		try {
			const keys = await dr.query.apiKeyTable.findMany({
				with: {
					managedByUser: true,
				},
			});

			const results = {
				total: keys.length,
				adminManaged: 0,
				userAssigned: 0,
				active: 0,
				withInactiveUsers: 0,
				details: [] as Array<{
					keyId: string;
					keyName: string;
					cleanName: string;
					managingUserEmail: string;
					assignedUserId?: string;
					assignedUserEmail?: string;
					tokenType: "admin_managed" | "user_assigned";
					issues: string[];
				}>,
			};

			for (const key of keys) {
				const auditResult = await ApiSecurityAudit.auditSingleKeyEnhanced(key);

				if (auditResult.tokenType === "admin_managed") {
					results.adminManaged++;
				} else {
					results.userAssigned++;
				}

				if (auditResult.issues.length === 0) {
					results.active++;
				} else {
					results.withInactiveUsers++;
				}

				results.details.push({
					keyId: auditResult.keyId,
					keyName: auditResult.keyName,
					cleanName: auditResult.cleanName,
					managingUserEmail: auditResult.managingUserEmail,
					assignedUserId: auditResult.assignedUserId,
					assignedUserEmail: auditResult.assignedUserEmail,
					tokenType: auditResult.tokenType,
					issues: auditResult.issues,
				});
			}

			return results;
		} catch (error) {
			console.error("Security audit failed:", error);
			throw new Error("Failed to perform security audit");
		}
	}

	/**
	 * NEW: Enhanced single key audit with assignment details
	 */
	static async auditSingleKeyEnhanced(key: any): Promise<{
		keyId: string;
		keyName: string;
		cleanName: string;
		managingUserEmail: string;
		assignedUserId?: string;
		assignedUserEmail?: string;
		tokenType: "admin_managed" | "user_assigned";
		issues: string[];
	}> {
		const assignment = TokenAssignmentParser.getTokenAssignment(key);
		const managingUser = key.managedByUser;
		let issues: string[] = [];
		let assignedUserEmail: string | undefined;

		// Validate managing user
		if (!managingUser) {
			issues.push("Managing user deleted");
		} else {
			const managingUserStatus =
				await UserStatusValidator.getUserStatusDetails(managingUser);
			if (!managingUserStatus.isActive) {
				issues.push(
					`Managing admin inactive: ${managingUserStatus.issues.join(", ")}`,
				);
			}
		}

		// Validate assigned user if applicable
		if (assignment.isUserAssigned && assignment.assignedUserId) {
			try {
				const assignedUser = await dr.query.userTable.findFirst({
					where: eq(userTable.id, assignment.assignedUserId),
				});

				if (!assignedUser) {
					issues.push("Assigned user deleted");
				} else {
					assignedUserEmail = assignedUser.email;
					const assignedUserStatus =
						await UserStatusValidator.getUserStatusDetails(assignedUser);
					if (!assignedUserStatus.isActive) {
						issues.push(
							`Assigned user inactive: ${assignedUserStatus.issues.join(", ")}`,
						);
					}
				}
			} catch (error) {
				issues.push("Error validating assigned user");
			}
		}

		return {
			keyId: key.id,
			keyName: key.name || "Unnamed",
			cleanName: assignment.cleanName,
			managingUserEmail: managingUser?.email || "DELETED_USER",
			assignedUserId: assignment.assignedUserId || undefined,
			assignedUserEmail,
			tokenType: assignment.isUserAssigned ? "user_assigned" : "admin_managed",
			issues,
		};
	}

	/**
	 * ORIGINAL: Audits a single API key - backward compatibility
	 */
	static async auditSingleKey(key: any): Promise<{
		keyId: string;
		keyName: string;
		userEmail: string;
		issues: string[];
	}> {
		const user = key.managedByUser;
		let issues: string[] = [];
		let userEmail = "DELETED_USER";

		if (!user) {
			issues.push("Managing user deleted");
		} else {
			userEmail = user.email;
			const userStatus = await UserStatusValidator.getUserStatusDetails(user);
			issues = userStatus.issues;
		}

		return {
			keyId: key.id,
			keyName: key.name || "Unnamed",
			userEmail,
			issues,
		};
	}

	/**
	 * ENHANCED: Get API keys managed by specific user with assignment details
	 */
	static async getUserManagedApiKeys(userId: string): Promise<
		Array<
			SelectApiKey & {
				userIsActive: boolean;
				issues: string[];
				assignedUserId?: string;
				tokenType: "admin_managed" | "user_assigned";
				cleanName: string;
			}
		>
	> {
		try {
			const keys = await dr.query.apiKeyTable.findMany({
				where: eq(apiKeyTable.managedByUserId, userId),
				with: {
					managedByUser: true,
				},
			});

			const userIsActive = await UserStatusValidator.isUserActiveForApi(userId);

			const results = [];
			for (const key of keys) {
				const assignment = TokenAssignmentParser.getTokenAssignment(key);
				const user = key.managedByUser;
				const userStatus = user
					? await UserStatusValidator.getUserStatusDetails(user)
					: { isActive: false, issues: ["User not found"] };

				results.push({
					...key,
					userIsActive,
					issues: userStatus.issues,
					assignedUserId: assignment.assignedUserId || undefined,
					tokenType: assignment.isUserAssigned
						? ("user_assigned" as const)
						: ("admin_managed" as const),
					cleanName: assignment.cleanName,
				});
			}

			return results;
		} catch (error) {
			console.error(`Error getting API keys for user ${userId}:`, error);
			return [];
		}
	}

	/**
	 * NEW: Get tokens assigned to a specific user (not managed by them)
	 */
	static async getTokensAssignedToUser(userId: string): Promise<
		Array<{
			keyId: string;
			keyName: string;
			cleanName: string;
			managingUserId: string;
			managingUserEmail?: string;
			isActive: boolean;
			issues: string[];
		}>
	> {
		try {
			// Find all tokens that contain this user ID in their assignment
			const allKeys = await dr.query.apiKeyTable.findMany({
				with: {
					managedByUser: true,
				},
			});

			const assignedKeys = allKeys.filter((key) => {
				const assignment = TokenAssignmentParser.getTokenAssignment(key);
				return assignment.assignedUserId === userId;
			});

			const results = [];
			for (const key of assignedKeys) {
				const validation = await UserStatusValidator.validateTokenAccess(key);
				const assignment = TokenAssignmentParser.getTokenAssignment(key);

				results.push({
					keyId: key.id,
					keyName: key.name,
					cleanName: assignment.cleanName,
					managingUserId: key.managedByUserId,
					managingUserEmail: key.managedByUser?.email,
					isActive: validation.isValid,
					issues: validation.reason ? [validation.reason] : [],
				});
			}

			return results;
		} catch (error) {
			console.error(`Error getting tokens assigned to user ${userId}:`, error);
			return [];
		}
	}
}
