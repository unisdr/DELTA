See the translation system documentation for how to use `ctx.t()` in loaders and views.

Basic example: call `ctx.t({ code: "key", msg: "Fallback" })` anywhere that needs a translated string.
Run `yarn i18n:extractor` after adding new translation keys to update locale files.
