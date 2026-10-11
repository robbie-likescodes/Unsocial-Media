# Database foundation

This is the Supabase/PostgreSQL foundation for Rabbit Hole. The initial browser prototype uses local demo data; this schema is not connected to the interface yet. It contains no credentials and does not provision a hosted Supabase project.

## Local setup

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) and Docker, then run these commands from the repository root:

```sh
supabase start
supabase db reset
```

`db reset` destroys and recreates the **local** development database. It applies `migrations/20261011000000_initial_schema.sql`. This project does not ship a seed containing real people or credentials. The browser application remains usable without this optional database stack.

To validate the schema and RLS without running the full Supabase stack, use Docker:

```sh
bash supabase/tests/run.sh
```

This script uses a digest-pinned PostgreSQL 17 image, starts a disposable container with no exposed ports or container networking, installs minimal Supabase auth-role stubs, applies the migrations, runs the permission regression checks, and removes only its own container. GitHub Actions runs the same script. It exercises real PostgreSQL row-level security, but does not replace full Supabase Auth/storage integration testing.

Against a running local Supabase stack, with PostgreSQL's `psql` available, run:

```sh
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  -v ON_ERROR_STOP=1 -f supabase/tests/permissions.sql
```

The local password above is the Supabase CLI development default, not a hosted credential. The SQL checks create test users within a transaction and roll everything back. They assert privacy, contributor permissions, approval gating, atomic saves requiring a collection, collection-scoped preferences, attribution suppression, and revocation.

## Tables and their responsibilities

| Table                          | Purpose                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `profiles`                     | Public identity fields only: display name, avatar, bio. Authentication email is never copied here.          |
| `collections`                  | Private by default; `unlisted` means link-only; `public` means discoverable.                                |
| `items`                        | Reusable notes, links, photos, videos, people, places, and events; optional coordinates/dates/source links. |
| `collection_items`             | Many-to-many saves, contributor identity, recently-added ordering, and an explicitly published review.      |
| `private_item_notes`           | A user's personal note about an item, visible only to that user even if the item is shared.                 |
| `collection_memberships`       | Contributor/viewer invitations, pending join requests, and accepted memberships.                            |
| `collection_share_links`       | Hashed, optionally expiring, revocable view or join tokens.                                                 |
| `collection_link_access`       | Authenticated access obtained through a view link; validated against current link status on every read.     |
| `collection_item_attributions` | Optional “Found through” credit linking a save to its source collection.                                    |
| `collection_feedback`          | Private “Not relevant”, “Dislike”, and hidden-entity preferences scoped to a collection.                    |

The owner role is represented by `collections.owner_id`. Contributors can manage their own collection contributions; the owner can manage every contribution and the membership list. Canonical item content is editable only by its creator. A contributor who saves somebody else's item can edit their own published review, rather than rewriting the original item for everyone.

## API contract for the next integration

After Supabase sign-in, create the user's `profiles` row with `id = auth.uid()`. There is no automatic signup trigger yet. Use the signed-in client and row-level security for ordinary table operations. All RPC arguments below use their SQL names:

| RPC                                                                      | Behavior                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_saved_item(target_collections, item_data)`                       | Atomically create and save an item; requires at least one collection and contribution permission for every target. `item_data` requires `kind` and `title`; other item fields are optional. |
| `save_existing_item(target_collection, target_item, source_collection?)` | Save an accessible item; optional valid source adds attribution. Repeated saves do not change the original contributor or credit.                                                           |
| `create_collection_link(target_collection, link_kind, expires_at?)`      | Owner-only. Returns `link_id` and a random `token` once. View links require unlisted/public visibility; join links work with private collections.                                           |
| `revoke_collection_link(target_link)`                                    | Owner-only revocation; existing redeemed view-link access stops immediately.                                                                                                                |
| `get_shared_collection(token)`                                           | Anonymous or authenticated curated view-link snapshot. Returns `null` for expired/revoked/private links and for join tokens. Never includes personal notes or feedback.                     |
| `redeem_collection_link(token)`                                          | Authenticated view access for normal RLS-protected queries; does not grant editing permission.                                                                                              |
| `request_collection_access(token)`                                       | Authenticated join request; never automatically approves membership.                                                                                                                        |
| `accept_collection_invitation(target_collection)`                        | Accept an owner-created personal invitation; cannot approve a join request.                                                                                                                 |

Owners invite by inserting a membership with `status = 'invited'`. They approve a request by updating its status to `accepted`, deny it by deleting the pending membership, and revoke a contributor by deleting the accepted membership. Revoking a join link stops future requests; it does not remove already accepted members. A denied/revoked user may request again through a still-valid join link, so revoke that link too when appropriate.

Share tokens are bearer capabilities. Build links with a token in a URL fragment, keep tokens out of logs and analytics, and avoid third-party requests before removing the fragment. Store only the token digest in the database. Do not expose a service-role credential to browser code. Anonymous snapshots are for browsing; a viewer who wants to save content signs in and redeems the view link.

## Privacy boundaries and remaining work

- RLS is enabled on every table. Private collections are readable only by the owner and accepted members. Unlisted collections additionally permit valid redeemed view links. A join request or invitation alone provides no collection-content access.
- Attribution is queried separately from item content. When a source becomes private, its credit is hidden, including from the source owner. An unlisted source's credit is visible only to readers with access to it. The anonymous snapshot exposes source credits only for public sources. Never cache a source's name or owner in a repost card as permanent attribution; re-query the protected attribution row when rendering.
- Turning a collection private hides its link snapshots and attribution. It does not retract information somebody already saved or erase copies that were made while it was public. Saved items remain accessible through their destination collection. Other accepted contributors retain access until the owner revokes their membership.
- Shared collections publish each item's content and location plus that contribution's `published_review`. Put personal context in `private_item_notes`, not `items.content` or `published_review`, when it should stay private.
- `create_saved_item` enforces the initial at-least-one-collection workflow. Direct item inserts are available for future import workflows and can create temporary unassigned items; the application should use the atomic RPC for user saves.
- Remove a saved item by deleting its `collection_items` row. Deleting a canonical `items` row removes all of its saves through foreign-key cascades; no UI should expose that destructive operation casually. Canonical content updates affect all collections referencing that item.
- This is a foundation, not a production authorization audit. Frontend Auth and database adapters, invite UI, input/rate limits, token delivery, uploads and storage-bucket policies, recommendation services, and account lifecycle handling remain to be implemented. Create private storage buckets and signed media URLs before enabling uploads; a private database row does not make a publicly hosted image URL private.
- Coordinates and event timestamps are stored, but geocoding, map tiles, notification delivery, official-source verification, event-update workers, and calendar update history are not implemented. Do not claim a festival is being monitored until a trusted worker actually performs those checks.
- Recommendation filtering should exclude items already in the current collection and apply only that collection's feedback. There is no ranking algorithm in this migration.
