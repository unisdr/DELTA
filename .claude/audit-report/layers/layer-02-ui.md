## Layer 2 — UI Components & Design System

### Three-plus directories with no documented convention

UI code is spread across four locations:

| Directory                  | Files | Role                                                                           |
| -------------------------- | ----- | ------------------------------------------------------------------------------ |
| `app/components/`          | 30    | Generic, reusable, domain-agnostic UI — charts, maps, file uploaders, menu     |
| `app/frontend/`            | 80    | Domain-specific UI — field definitions, forms, list views per entity           |
| `app/frontend/components/` | 14    | Shared helper components — delete dialog, date picker, filters, error boundary |
| `app/pages/`               | 2     | Full-page PrimeReact components (emerging pattern, undocumented)               |

No written convention guides which directory a new component should go in. The `app/pages/` directory appeared quietly — `AccessManagementPage.tsx` and `OrganizationManagementPage.tsx` are the only occupants, both imported by layout routes. It establishes a new convention without documenting it.

`app/frontend/components/` nested inside `app/frontend/` adds further confusion — components within frontend and generic components at the top level look equivalent to a developer navigating the tree.

---

### Old vs new system — source files and migration status

**Old system is rooted in two files:**

`app/frontend/form.tsx` — the old form engine (~800 lines). Contains `Field`, `FormMessage`, `formScreen()`, form error types, `ActionLinks`, `DataScreen`. Still imported by every domain form (`hazardeventform.tsx`, `disastereventform.tsx`, `disaster-record/form.tsx`).

`app/frontend/container.tsx` — the old page shell:

```tsx
export function MainContainer(props) {
    return (
        <div className="mg-container dts-page-header">
            <header className="dts-page-title">
                <div className="mg-container">
                    <h1 className="dts-heading-1">{props.title}</h1>
```

Pure old CSS — `mg-container`, `dts-page-header`, `dts-heading-1`. Every page using `MainContainer` is visually in the old system.

`app/frontend/data_screen.tsx` — a hybrid transition component wrapping `MainContainer` (old) while including a PrimeReact `Button`. Bridge state during migration.

**Migration completion by section (estimated):**

| Section                                              | Status                                                            | ~%  |
| ---------------------------------------------------- | ----------------------------------------------------------------- | --- |
| User/auth pages                                      | Fully PrimeReact                                                  | 85% |
| Admin pages (country accounts, fictitious countries) | Mostly PrimeReact, layout still on old shell                      | 70% |
| Settings pages                                       | Mostly PrimeReact                                                 | 65% |
| Analytics pages                                      | Mixed — some sections PrimeReact, others still old table patterns | 50% |
| Hazardous/disaster event list pages                  | Hybrid: PrimeReact Tooltip + old `mg-button` + old `DataScreen`   | 40% |
| All create/edit forms                                | Still entirely on `formScreen()` / `fieldsDef` old system         | 15% |
| Shared components (`delete-dialog`, filters)         | New structure but still emit old CSS classes                      | 30% |
| Core infrastructure (`form.tsx`, `container.tsx`)    | Untouched old code                                                | 0%  |

**Overall: ~35–40% migrated.** The visible surface (login, settings, admin) looks modern. The data-entry core — every create/edit form for the three main entities — is fully on the old system.

---

### CSS approach is fragmented

`app/styles/all.css` is the global entry point — 7 lines of imports:

```css
@import "~/frontend/dtsmap/styles.css";
@import "react-toastify/dist/ReactToastify.css";
@import "tailwindcss";
/* + 3 more component imports */
```

Beyond that: 11 scattered component-scoped `.css` files across the tree, no CSS Modules, no CSS-in-JS. Old `dts-*`/`mg-*` global class names coexist with Tailwind utilities on the same elements in hybrid components.

**Critical issue — no design tokens:** The UNDRR brand blue (`#004F91`) is hardcoded as arbitrary Tailwind values in multiple files:

```tsx
// MainMenuBar.tsx
className={`font-bold 'text-[#004F91]' `}  // also has a bug: quotes inside the string
```

No `tailwind.config.ts` defines `colors.brand.primary`. If the brand color changes, every file needs a grep. Tracked as P1-11.

---

### Leaflet loaded via global namespace — no type safety

`app/components/ContentRepeater/index.tsx` uses Leaflet via a `declare namespace L` workaround:

```ts
declare namespace L {
	export const map: any;
	export const tileLayer: any;
	// ...20+ more, all typed as `any`
}
```

Leaflet is loaded externally (CDN or `<script>` tag), not as an npm import. No TypeScript type safety — any API change or script load failure is invisible until runtime.

---

### `pagination/api.server.ts` in the wrong directory

`app/frontend/pagination/api.server.ts` contains server-only request parsing (query string → pagination params). It has the `.server.ts` suffix correctly, but lives inside `app/frontend/` which is the client-side UI directory. Another server/client boundary violation extending the scope of P1-4.

---

### `DeleteButton` emits old CSS inside a "new" component

`app/frontend/components/delete-dialog.tsx` was written as part of the new component layer — it uses `useFetcher` and `ConfirmDialog`. But the button itself emits:

```tsx
className = "mg-button mg-button-table";
```

Old CSS inside a component intended for the new system. The migration boundary is not consistent even within new files.

---

### `ViewContext` — a class calling React hooks in its constructor

`app/frontend/context.ts`:

```ts
export class ViewContext implements DContext {
	constructor() {
		const rootData = useRouteLoaderData("root") as CommonData;
		// ...hooks called inside constructor
	}
}
```

Every component creates `new ViewContext()` at the top of its render. This works in practice because the constructor is called synchronously during rendering, but it violates React's rules of hooks — hooks must only be called at the top level of a function component or custom hook, not inside a class constructor.

Consequences:

- Cannot render any component outside a React Router context (breaks unit tests, breaks Storybook)
- Cannot mock or inject a `ViewContext` in tests — `new ViewContext()` throws without a router context
- Cannot memoize the context object — every component creates a new instance every render
- Every component is implicitly coupled to the root route loader's output shape

Tracked as P1-10.

---

### Page components tightly coupled to their route loaders

`app/pages/AccessManagementPage.tsx`:

```ts
import type { loader } from "../routes/$lang+/settings+/access-mgmnt+/_layout";
const ld = useLoaderData<typeof loader>();
```

The page imports the loader type directly from the route file and calls `useLoaderData` internally. This is still 1:1 page-to-route coupling — just with the component extracted to a separate file. The page cannot be used by any other route, cannot be unit tested without mocking the full router context, and cannot receive different data shapes.

The correct pattern: the route calls `useLoaderData`, extracts needed data, and passes it as typed props to the page component. The page is then a pure component with no hooks depending on route context. Tracked as P1-12.

---

### Direction of the migration — inferred end state

The emerging pattern (from what's been migrated):

```
Route file          → thin shell: loader, action, meta only
Page component      → full PrimeReact page, receives props from route
Shared components   → domain-agnostic: charts, maps, dialogs, filters
```

Intended end directory structure:

```
app/
├── routes/       ← thin: loader, action, meta only. No JSX beyond <PageComponent />
├── pages/        ← full-page components, one per route section, pure props-in
├── components/   ← generic, domain-agnostic UI (charts, maps, file uploaders)
└── frontend/     ← transitional; to be dissolved:
    ├── context.ts     → replace with useViewContext() hook
    ├── form.tsx       → delete after all forms migrated
    ├── container.tsx  → delete after MainContainer replaced by PrimeReact Card
    └── utils/, hooks/ → move to app/utils/
```

Three decisions must be made before the migration scales further, or the new system will repeat the old system's coupling problems in a newer framework:

1. **Component contract:** page components receive typed props from routes — they do not call `useLoaderData` or `useRouteLoaderData` internally (P1-12)
2. **Design tokens:** define brand colours and spacing in `tailwind.config.ts` — no hardcoded hex values in components (P1-11)
3. **ViewContext refactor:** replace class-with-constructor-hooks with `useViewContext()` hook (P1-10)

---

### What works well

- `app/components/` has genuinely reusable, well-scoped widgets: charts, `ContentRepeater` (file upload + geospatial mapper), `ContentPicker`, `AuditLogHistory` — real business value
- `frontend/components/` has the right building blocks: `ConfirmDialog`, `DeleteButton`, `ErrorBoundary`, `LoadingSpinner` — foundation for the new system is there
- `fieldsDef` on models is a clean abstraction that must survive the form migration — CSV import/export and REST API depend on it even after `formScreen()` is gone
- `ViewContext` as a single DI object carrying `lang`, translator, and `url()` is the right concept — only the implementation (class vs hook) needs fixing

---

