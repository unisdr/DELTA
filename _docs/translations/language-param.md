# Options for setting language

- URL path: /en-us/route
- Query param: ?lang=en-us
- Cookie

In general being able to link to specific language is valuable so having it in URL is better. Between two URL option path looks nicer. For a lot of link we build links like `route + item.id` or similar. Could actually be easier to add it to path than query param.

Decision: add in path

# Language Resolution and Propagation in Code

## Options for setting language

- URL path: /en-us/route
- Query param: ?lang=en-us
- Cookie

In general being able to link to specific language is valuable so having it in URL is better. Between two URL option path looks nicer. For a lot of link we build links like `route + item.id` or similar. Could actually be easier to add it to path than query param.

Decision: add in path

## Language Resolution our implementation

The language is retrieved from URL path like /en/route.

## Language in Application Context

The language is retrieved from URL in loaders and actions using the following code:

`let ctx = new BackendContext(routeArgs)`

or if not needed in backend and just want to pass to the view

`await getCommonData(routeArgs)`

The context is used on both server and client to pass data down to components and logic that need it.

The context includes:

- current language code like en us or de
- function for getting translated messages
- helpers to build internal links
- other commonly shared data, like user (this is not related to translations)

Both backend and view/client code has Context but the shape of the object is a bit different, since some methods only make sense on the backend.
