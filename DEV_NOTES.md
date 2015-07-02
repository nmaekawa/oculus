# Development Notes

## Known issues/potential future issues

- Whole lotta DOM parsing going on, with the usual memory/performance concerns thereof
- Ajax proxy maintains list of mimetypes to methods, rather than maintaining the mimetype of the response it proxies for
- A lot of Harvard-specific code lives directly in the view; any uptake of this software by external institutions would pretty much require refactoring this out or else a fork.
