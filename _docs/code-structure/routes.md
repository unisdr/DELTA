- [Code structure](code-structure.md)

# Routes

`app/routes`

Follows React Router v7 flat-routes conventions.

https://reactrouter.com/

We use the remix-flat-routes plugin to organise routes into folders. Folders ending with `+` are grouped by the plugin and map directly to URL path segments.

https://github.com/kiliman/remix-flat-routes

## Language prefix

All user-facing routes live under `app/routes/$lang+/`. The `$lang` param is the active locale (e.g. `en`, `fr`) and is present on every URL. Use `LangLink` (from `~/utils/link`) instead of React Router's `<Link>` for internal navigation — it automatically forwards the current `$lang` value.

```ts
import { LangLink } from "~/utils/link";
// <LangLink to="/dashboard" /> → renders as /en/dashboard (or current lang)
```

## API routes

`app/routes/$lang+/api+` contains routes that return JSON or QR code images rather than standard page responses.

## Notes on specific routes

### API

Contains routes that return JSON or QR code images, not standard loader results.
