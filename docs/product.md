# Product decisions

These decisions describe the intended product. They do not imply every feature is implemented in the starter.

## Purpose

Rabbit Hole — **unsocial media** — helps people remember what they encounter and choose what they give their attention to. It combines a personal reference collection with deliberate discovery inside a subject.

Examples include remembering Agnes Martin after a museum visit, collecting coffee tutorials, rehearsing jokes, finding kayaking friends, recording places for a future trip, and following a festival's dates.

## Home and visual direction

- Design for phones first. Desktop is a later refinement.
- Open on the user's collections, never an explore feed.
- Order home collections by recent and frequent interaction.
- Show visual collection cards and generate an initial cover from collection content. Let the owner change that cover later.
- Use a full-width home grid without a permanent sidebar.
- Keep a collection-search field available as the user scrolls.
- Use a warm, playful storybook aesthetic inspired by illustrated rabbit stories: cream paper, muted moss green, dusty rose, warm brown, botanical details, and serif headings.
- Keep rabbit decoration subtle. A rabbit jumping into a hole is suitable for a loading animation; respect reduced-motion settings.
- Use simpler photo cards inside collections, with consistent sizes in a scrollable, two-column grid on phones.

## Collections and saving

- Collections serve as tags for the initial product. There is no separate required tagging step.
- An item can belong to multiple collections. The underlying item stays consistent across those views.
- Saving requires at least one collection. There is no automatic inbox in the initial workflow.
- The save picker shows recent collections, supports searching, and allows creating a collection directly from a new name.
- Collections open on **Saved**. Their other tabs are **Discover** and **Create**.
- Saved items default to recently added first. Home ordering and item ordering are distinct.
- A card's main behavior depends on its item type and selected view. It can play media, expand a note, or show a person or place; an explicit expand/learn-more control exposes details and sources.

## Creating items

Create opens a menu of types, rather than a single composer that guesses the type. It supports notes, links, photos or videos, people, places, and events. The current collection is selected automatically.

Items may include a name, image, description, source links, private notes, dates, or locations as appropriate. People can be represented by manually created private cards; a public online profile is not a prerequisite.

Notes, links, and places are useful first prototype paths. All item types belong in the broader design.

## Discovery and attention

- Infer a collection's subject from its name and saved items. Do not require a topic description.
- Allow closely related subjects, while keeping discovery anchored to the selected collection.
- **Not relevant** means an item does not belong to this subject. **Dislike** means it fits, but the user does not want that kind of content.
- Hiding an artist, person, or source applies only within the collection currently being browsed.
- Discover excludes items already saved in the current collection. An item saved in a different collection may still appear.
- Keep Saved and Discover separate. A reference collection should not be mixed with unsolicited recommendations.
- Do not display follower or like counts. Popularity can contribute to discovery ranking, alongside relevance; the user has not settled the precise algorithm.

An eventual discovery system should help a coffee-learning session stay about coffee rather than following engagement toward unrelated entertainment. Rehearsal and structured study are possible future modes, not settled requirements for the starter.

## Locations, events, and reminders

- A place does not have to come from a feed. Users can drop a standalone pin for anything they want to remember.
- Show map views only when a collection contains locations, and calendar views only when it contains dates or reminders.
- A map icon on an item supports adding it to the map. A clock icon supports dates, reminders, and calendar tracking.
- The eventual event service should find an authoritative festival source, extract dates and locations, and monitor meaningful updates.
- Confirmed event changes update Rabbit Hole's calendar automatically and notify the user.
- Start with Rabbit Hole's own calendar. External calendar synchronization is outside the first version.

Monitoring depends on source access and trustworthy change detection. Demo dates and manually changed dates are not live event tracking.

## Sharing and collaboration

- Collections default to private. Owners can choose public or link-only sharing.
- Public collections can be browsed through a person's published collections; link-only collections are accessible through a shared link.
- Items from another person's collection can be saved into the viewer's own collections.
- That save carries a “Found through” credit and a link to the source collection. Independently finding the same item does not automatically assign that credit.
- If a source collection becomes private, attribution and links back to that collection disappear from other people's saved versions. The saved item itself remains.
- Private personal notes do not become public merely because an item appears in a shared collection. Published reviews or descriptions are explicit contributions.
- Multiple contributors may add items to a collection. Contributors manage their own contributions; the owner manages the collection as a whole.
- Support personal invitations and join links. Join-link requests require owner acceptance or denial.
- Owners can revoke a join link or a contributor's access at any time.

## Open design details

- Search must always make collections easy to find. Whether the same field also searches current-collection items remains to be tested.
- Final item-type fields, contribution editing semantics, invitation lifetimes, and ranking weights need implementation-level decisions.
- Public moderation, account recovery, import permissions, retention, and notification delivery need design before a public service launches.
