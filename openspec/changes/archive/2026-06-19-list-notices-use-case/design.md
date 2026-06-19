## Context

The Notices domain currently has `CreateNoticeUseCase` (Phase 4c) and a fully-defined
`INoticeRepository` port with `findAll(tenantId, pagination): Promise<Notice[]>` (Phase 4b).
`NoticeDto` and `toNoticeDto()` were delivered in Phase 4d. The next required application-
layer piece is a listing use case that orchestrates the port and mapper into a single,
testable unit for consumers (loaders, API handlers).

The `Notice` entity stores `titleJson` and `bodyJson` as `LocaleMap = Record<string, string>`,
a BCP 47 locale-keyed map (e.g. `{ en: "Title", fr: "Titre" }`). A listing caller always
knows the UI locale (passed down from the React Router `$lang` segment) and expects a
resolved string, not the raw map, for display purposes. However, `NoticeDto` deliberately
preserves the full `LocaleMap` so the presentation layer can access all translations.
The locale resolution is therefore the use case's responsibility for any `resolvedTitle` /
`resolvedBody` surface it exposes — but since `NoticeDto` already carries the full map,
the simplest contract is to return `NoticeDto[]` and let the use case log the locale it
was given, deferring any per-locale string extraction to the presentation layer.

After discussion, the decision is: **the use case returns `NoticeDto[]` with full
`LocaleMap` intact** (same as `toNoticeDto()`). Locale resolution (picking a single string
from the map) is a presentation-layer concern — it belongs in the route/component, not in
the use case. The use case accepts `locale` in its query so it can log and pass it forward
if needed by future locale-aware filtering, but it does NOT strip or transform the maps.

## Goals / Non-Goals

**Goals:**

- Introduce `ListNoticesQuery` value type (`tenantId`, `page`, `pageSize`).
- Implement `ListNoticesUseCase.execute(query)` returning `Promise<NoticeDto[]>`.
- Delegate pagination to `INoticeRepository.findAll(tenantId, { page, pageSize })`.
- Map each `Notice` entity to `NoticeDto` via the existing `toNoticeDto()` function.
- Return an empty array (not an error) when `findAll` returns zero results.
- Inject `ILogger` and `INoticeRepository` via constructor, matching `CreateNoticeUseCase`.
- Emit one `logger.info` event per successful execution: `{ msg, tenantId, count }`.

**Non-Goals:**

- Locale-level string extraction from `LocaleMap` — presentation-layer concern.
- Sorting or filtering beyond what the repository port already supports.
- Total count / pagination metadata (not in `findAll` signature; deferred to Phase 4g+).
- Any DB migration — this is pure application-layer code.
- fieldsDef / Form-CSV-API pipeline impact — not applicable to domain use cases.

## Decisions

### Decision 1 — `locale` is removed from `ListNoticesQuery`

**Chosen**: `ListNoticesQuery` contains only `tenantId`, `page`, and `pageSize`. There is
no `locale` field.

**Rationale**: The use case does not use locale to transform any DTO field — `toNoticeDto()`
preserves the full `LocaleMap` and the presentation layer (route loader, component) resolves
a single locale string from the map using the `$lang` URL segment it already has. Carrying
`locale` in the query would be misleading — it would signal to callers that the use case
performs locale resolution when it does not. A parameter that only serves logging does not
belong in a value type; the route adapter can include locale in its own log event where it
genuinely has meaning. ADR-001 confirms locale is passed explicitly to use cases that need
it for translation; this use case does not.

**Alternative rejected**: `ListNoticesQuery` with `locale: string` used only for logging —
rejected because a field with no functional role in the use case creates a false contract
and pollutes the query type. Observability is a cross-cutting concern; it does not justify
widening the domain query shape.

**Alternative rejected**: A separate `LocalisedNoticeDto` with `title: string` and
`body: string | null` — rejected because locale resolution belongs at the presentation
boundary, not in the application layer. Introducing a parallel DTO hierarchy for a display
concern would violate Clean Architecture layer rules.

### Decision 2 — Constructor injection order matches `CreateNoticeUseCase`

**Chosen**: `constructor(private readonly logger: ILogger, private readonly noticeRepository: INoticeRepository)`

**Rationale**: Consistent with the existing use case. Tests use the same `makeRepository()`
and `NoOpLogger` helper patterns established in `CreateNotice.test.ts`.

### Decision 3 — Return type is `NoticeDto[]`, not a paginated wrapper

**Chosen**: `execute()` returns `Promise<NoticeDto[]>`.

**Rationale**: No pagination metadata (total count, page count) is available from the
current `findAll()` port signature. Introducing a wrapper object (`{ items, total }`) before
the port supports it would force a breaking change at archive time. When Phase 4g adds
`findAllWithCount()`, a separate `ListNoticesWithMetaUseCase` (or port extension) can
deliver the wrapper — this use case remains stable.

## Risks / Trade-offs

- [Risk] Callers that need a single locale string must resolve it themselves from the
  `LocaleMap` in `NoticeDto` (e.g. `titleJson[lang] ?? titleJson["en"] ?? ""`).
  → Mitigation: document the canonical fallback pattern in the Phase 5a route adapter
    where it first appears; extract to a shared utility (e.g. `app/shared/i18n/resolveLocale.ts`)
    if the pattern recurs three or more times across future presentation-layer files.

- [Risk] Without a total-count return, UI pagination controls cannot know how many pages exist.
  → Mitigation: accepted as a known Phase 4e limitation; Phase 4g extends the port and use
    case to return metadata. The current interface is additive — extending it later is safe.

