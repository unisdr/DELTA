# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the DELTA project, using the [MADR format](https://adr.github.io/madr/).

## What is an ADR?

An ADR captures a significant architectural decision — what was decided, why, and what the consequences are. It is written at decision time and committed alongside the code it informs. It does not get updated when the decision is revisited — instead a new ADR is written that supersedes it.

## Format

Each ADR follows this structure:

```markdown
# ADR-NNN: Title

## Status
Accepted | Proposed | Deprecated | Superseded by ADR-NNN

## Date
YYYY-MM-DD

## Context
Why this decision was needed. What problem or constraint drove it.

## Decision
What was decided. Specific, unambiguous.

## Consequences
What changes as a result. Positive outcomes, negative trade-offs, and follow-on work.

## References
Related ADRs, external standards, or documentation.
```

## When to Write an ADR

- Introducing a new library or framework
- Choosing a data storage pattern that affects multiple domains
- Defining a cross-cutting architectural convention (error handling, logging, i18n, etc.)
- Making a decision that would be hard to reverse
- Any decision a future developer would ask "why did they do it this way?"

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-multilingual-strategy.md) | Multi-lingual Strategy | Proposed |
| [ADR-002](ADR-002-timezone-handling.md) | Timezone Handling | Proposed |
| [ADR-003](ADR-003-error-handling-architecture.md) | Error Handling Architecture | Proposed |
| [ADR-004](ADR-004-logging-and-traceability.md) | Logging and Traceability | Proposed |
| [ADR-005](ADR-005-currency-storage-and-conversion.md) | Currency Storage and Conversion | Proposed |
