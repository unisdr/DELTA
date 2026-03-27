## Using translations in the server side code

Some server-side logic lives in reusable classes (e.g. `app/components/ContentRepeater/PreUploadFile.tsx`) rather than directly in route files. These classes receive `request` and `params` from the Remix action handler.

To use translations in such a class:

1. Accept `params` in the action signature alongside `request`:

```typescript
static async action({ request, params }: { request: Request; params: { lang?: string } }) {
```

2. Construct a `BackendContext` using `params` at the top of the action:

```typescript
const ctx = new BackendContext({ params });
```

3. Use `ctx.t()` as normal for any translatable strings:

```typescript
ctx.t(
    {
        code: "my_namespace.unique_key",
        desc: "{placeholder} is replaced with the value.",
        msg: "Something went wrong: {placeholder}",
    },
    { placeholder: someValue },
),
```

The `params.lang` value is provided automatically by Remix when the route is under the `$lang+` path segment — no changes are needed to the route files that export this action.

**Note:** `BackendContext` will throw if `params.lang` is absent. This will not happen, as nearly all our routes are under under `$lang+`.

## Do not change any files inside locales/app/

`locales/app/en.json` is the **source-of-truth** file for English strings. It feeds Weblate, which manages all non-English translations.

We have a tool that generates that file from the codebase. If you don't have access to that tool, skip changing file directly, the UI will work using values from ctx.t. That [string extraction](./string-extraction) tool could be run after multiple changes instead as a separate step.
