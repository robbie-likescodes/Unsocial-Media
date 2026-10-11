# Architecture and development boundaries

## Starter

The initial application is a React and TypeScript single-page app built with Vite. It starts without a database or credentials so the saving and retrieval workflow can be exercised before backend integration.

Browser-local demo state is appropriate for a prototype. It does not provide cross-device synchronization, collaborative permissions, durable backups, or a security boundary. Anything displayed as discovery content is a sample until an actual retrieval service is connected.

The npm scripts provide development, static analysis, unit tests, browser tests, and a production build. GitHub Actions runs these checks on pushes and pull requests. No deployment service is provisioned by this repository.

## Persistent data direction

Supabase is the intended starting point for PostgreSQL storage and account authentication. Migration scaffolding is kept separate from the frontend prototype. A database migration file does not create an account system or connect the application on its own. Follow [the database instructions](../supabase/README.md) to exercise the schema independently.

The core concepts should stay distinct:

| Concept      | Responsibility                                                                  |
| ------------ | ------------------------------------------------------------------------------- |
| Item         | The thing being remembered, with a type, content, and optional location or date |
| Collection   | A user's named subject and its visibility settings                              |
| Contribution | An item's membership in a collection, its contributor, and its added date       |
| Private note | Personal context that does not become public with a collection                  |
| Attribution  | The source collection a save came from, displayed only when visibility permits  |
| Preference   | Collection-specific feedback about a recommendation or source                   |
| Membership   | Owner and approved contributors, with server-enforced roles                     |

Do not duplicate an item merely because it belongs to several collections. Collection-specific added dates and permissions belong on the contribution relationship.

The planned UI label **link-only** maps to the database visibility value `unlisted`. Shared links use hashed random tokens and database functions rather than making every unlisted row anonymously readable. The schema also separates private item notes, published contribution reviews, collection-local feedback, and contributor memberships.

Before wiring authentication, verify row-level security with real owner, contributor, viewer, and unauthenticated identities. Check revocation as well as initial access: private-source attribution, join-link requests, and removed memberships must not leak through reads or cached frontend state.

## Services to add later

Imports and event monitoring should run through a server-side service. They may need API credentials, scheduled execution, source-specific adapters, and source attribution. Use permitted source access and explicit user intent; arbitrary URLs must not give a server unrestricted access to private network destinations.

Keep source records and retrieved metadata distinguishable from user edits. A new event date from an authoritative source can update a tracked event, while ambiguous changes need a clear status rather than a fabricated confirmation.

Discovery should combine the current collection's topic, saved membership, and local feedback. One collection's dislike must not become a global preference by accident.

Maps will need a renderer and a map-data provider with appropriate usage terms. The first prototype can establish adding and finding pins without claiming a production mapping service.

## Next useful increments

1. Validate adding, finding, and reopening real personal items on a phone-sized viewport.
2. Connect authentication and persistent storage, preserving the existing collection and item behavior.
3. Implement publication and contributor permissions, with authorization tests and revocation checks.
4. Connect a narrow import path, such as a supported link preview or Wikipedia lookup.
5. Add real maps, event-source tracking, and notification delivery with explicit service configuration.
6. Add collection-focused discovery once topic inference and feedback can be evaluated with real content.

Do not gate the first prototype on live recommendations or social media integrations. Its core test is whether saving something now makes it easy to retrieve later.
