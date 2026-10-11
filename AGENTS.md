# Working on Rabbit Hole

Rabbit Hole is a phone-first personal media organizer. The slogan is “unsocial media.” Read `docs/product.md` for settled product decisions and `docs/architecture.md` for current boundaries.

## Development workflow

- Use the existing checkout. Cloud tasks already run in an isolated environment; do not create a worktree unless the user asks for one.
- Use Node.js 24 and npm. Install existing dependencies with `npm ci` and commit `package-lock.json` when intentionally changing dependencies.
- Run the application with `npm run dev`. For an externally accessible cloud preview, append `-- --host 0.0.0.0`.
- For code changes, run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Run `npm run test:e2e` when changing user flows or UI behavior. Install the browser with `npm exec -- playwright install --with-deps chromium` if needed.
- Use focused tests for meaningful behavior, including saving, permissions, and privacy. Avoid tests that merely repeat implementation details.

## Product and interface

- Design for small phone screens first, then allow the layout to expand. Keep item grids at two columns on phones.
- Home is the user's collections, not a public feed. Keep collection search easy to reach while scrolling.
- Use simple photo cards inside collections. Keep rabbit and storybook decoration subtle, and preserve readable contrast and visible focus states.
- Use native buttons and form controls where practical. Give icon-only controls accessible names and keep touch targets comfortable.
- Require a collection when saving. Do not introduce a separate mandatory tagging workflow or an automatic inbox.
- Clearly distinguish demo content from connected services. Do not claim live imports, monitoring, sharing, or synchronization until those features work end to end.

## Data and security

- Items can appear in several collections. Avoid duplicating the underlying item simply to display it in another collection.
- Preferences and discovery exclusions belong to the collection currently being browsed.
- Personal notes are private by default. Publishing a collection does not automatically publish private notes.
- Enforce sharing and contributor permissions at the database or server boundary; hidden UI controls are not authorization.
- Source attribution must respect the source collection's current visibility. Do not expose a private collection through a stale credit, link, notification, or cached response.
- Never commit credentials, dump environment values, or put a server secret in a `VITE_` variable. Client configuration is visible to the browser.
- Follow source platform rules for imports, and retain source attribution. Do not promise unrestricted access to social media platforms.

## Repository hygiene

- Keep application code typed and components focused. Use the current toolchain before adding another framework.
- Keep dependencies purposeful; do not add services or packages for future features without a concrete need.
- Do not commit `node_modules`, build output, local environment files, browser-test output, or machine-specific configuration.
- Update the relevant documentation when adding a real service, changing a workflow, or replacing a demo feature.
