import { ValidationError } from "~/shared/errors";

/** Maps a BCP 47 locale code to its translated string value, e.g. `{ en: "Title", fr: "Titre" }`. */
export type LocaleMap = Record<string, string>;

/**
 * Who can see a published notice.
 * Mirrors the `audience` constraint on the `notices` DB table.
 */
export type Audience = "public" | "private" | "all";

/** Full set of persisted fields for a Notice, using domain names rather than raw DB column names. */
export interface NoticeProps {
	/** UUID primary key. */
	id: string;
	/** The tenant this notice belongs to. Maps to `country_accounts_id` in the DB. */
	tenantId: string;
	/** Locale-keyed title map. NOT NULL in the DB — a notice must always have a title. */
	titleJson: LocaleMap;
	/** Locale-keyed body map. Null when no body has been authored yet. */
	bodyJson: LocaleMap | null;
	/** Whether this notice is visible to its audience. */
	isPublished: boolean;
	/** Who the notice is targeted at. */
	audience: Audience;
	/**
	 * When the notice was first published.
	 * MUST be null when `isPublished` is false — the domain enforces this invariant
	 * in `Notice.create()` so that unpublished drafts never carry a spurious timestamp.
	 */
	publishedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Notice domain entity.
 *
 * Instances can only be created through the static `create()` factory, which
 * validates all business invariants before construction. This guarantees that
 * every `Notice` object in memory is valid — no separate validation step can
 * be accidentally skipped by a caller.
 */
export class Notice {
	private constructor(private readonly props: NoticeProps) {}

	/**
	 * Validated factory for `Notice` instances.
	 *
	 * Enforces two invariants before constructing the entity:
	 * 1. `titleJson` must have at least one key whose trimmed value is non-empty,
	 *    because a notice without any title is meaningless.
	 * 2. `publishedAt` must be null when `isPublished` is false, because setting
	 *    a publication timestamp on a draft introduces a data-integrity contradiction
	 *    that downstream use-cases cannot safely resolve.
	 *
	 * @throws {ValidationError} when either invariant is violated.
	 */
	static create(props: NoticeProps): Notice {
		const hasValidTitle = Object.values(props.titleJson).some(
			(v) => v.trim().length > 0,
		);
		if (!hasValidTitle) {
			throw new ValidationError(
				"titleJson must have at least one non-empty locale entry",
			);
		}

		if (!props.isPublished && props.publishedAt !== null) {
			throw new ValidationError(
				"publishedAt must be null when isPublished is false",
			);
		}

		return new Notice(props);
	}

	get id(): string {
		return this.props.id;
	}

	get tenantId(): string {
		return this.props.tenantId;
	}

	get titleJson(): LocaleMap {
		return this.props.titleJson;
	}

	get bodyJson(): LocaleMap | null {
		return this.props.bodyJson;
	}

	get isPublished(): boolean {
		return this.props.isPublished;
	}

	get audience(): Audience {
		return this.props.audience;
	}

	get publishedAt(): Date | null {
		return this.props.publishedAt;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}

	get updatedAt(): Date {
		return this.props.updatedAt;
	}
}
