import { createDemoLibrary } from './data'
import type { Collection, Item, Library } from './types'
export const STORAGE_KEY = 'rabbit-hole.library.v1'
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function isLibrary(value: unknown): value is Library {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.collections) ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.saved) ||
    !Array.isArray(value.feedback)
  )
    return false
  const string = (value: unknown) => typeof value === 'string'
  const finite = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value)
  if (
    !value.collections.every(
      (c) =>
        isRecord(c) &&
        string(c.id) &&
        string(c.name) &&
        string(c.cover) &&
        ['private', 'link', 'public'].includes(String(c.visibility)) &&
        typeof c.shared === 'boolean' &&
        finite(c.visits) &&
        finite(c.lastOpened) &&
        finite(c.createdAt),
    )
  )
    return false
  if (
    !value.items.every(
      (i) =>
        isRecord(i) &&
        string(i.id) &&
        string(i.title) &&
        string(i.description) &&
        ['note', 'link', 'photo', 'video', 'person', 'place', 'event'].includes(
          String(i.type),
        ) &&
        (i.image === undefined || string(i.image)) &&
        (i.url === undefined ||
          (string(i.url) && isSafeUrl(i.url as string))) &&
        (i.date === undefined ||
          (string(i.date) &&
            /^\d{4}-\d{2}-\d{2}$/.test(i.date as string) &&
            !Number.isNaN(Date.parse(i.date as string)))) &&
        (i.location === undefined ||
          (isRecord(i.location) &&
            string(i.location.name) &&
            finite(i.location.lat) &&
            finite(i.location.lng) &&
            Math.abs(i.location.lat as number) <= 90 &&
            Math.abs(i.location.lng as number) <= 180)),
    )
  )
    return false
  const collections = new Set(value.collections.map((c) => c.id))
  const items = new Set(value.items.map((i) => i.id))
  return (
    value.saved.every(
      (s) =>
        isRecord(s) &&
        items.has(s.itemId) &&
        collections.has(s.collectionId) &&
        finite(s.addedAt),
    ) &&
    value.feedback.every(
      (f) =>
        isRecord(f) &&
        string(f.itemId) &&
        collections.has(f.collectionId) &&
        ['irrelevant', 'dislike'].includes(String(f.kind)),
    )
  )
}
export function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDemoLibrary()
    const parsed = JSON.parse(raw) as Library
    if (!isLibrary(parsed)) return createDemoLibrary()
    return parsed
  } catch {
    return createDemoLibrary()
  }
}
export function saveToCollections(
  library: Library,
  item: Item,
  collectionIds: string[],
  addedAt = Date.now(),
): Library {
  const validIds = [...new Set(collectionIds)].filter((id) =>
    library.collections.some((collection) => collection.id === id),
  )
  if (!validIds.length) throw new Error('Choose at least one collection.')
  return {
    ...library,
    items: library.items.some((existing) => existing.id === item.id)
      ? library.items
      : [...library.items, item],
    saved: [
      ...library.saved,
      ...validIds
        .filter(
          (id) =>
            !library.saved.some(
              (saved) => saved.itemId === item.id && saved.collectionId === id,
            ),
        )
        .map((collectionId) => ({ collectionId, itemId: item.id, addedAt })),
    ],
  }
}
export function itemsInCollection(
  library: Library,
  collectionId: string,
): Item[] {
  return library.saved
    .filter((saved) => saved.collectionId === collectionId)
    .sort((a, b) => b.addedAt - a.addedAt)
    .flatMap((saved) => {
      const item = library.items.find((item) => item.id === saved.itemId)
      return item ? [item] : []
    })
}
export function sortCollections(collections: Collection[]): Collection[] {
  const mostRecent = Math.max(
    ...collections.map((collection) => collection.lastOpened),
    0,
  )
  const score = (collection: Collection) =>
    collection.visits +
    Math.max(0, 7 - (mostRecent - collection.lastOpened) / 86400000)
  return [...collections].sort(
    (a, b) => score(b) - score(a) || b.createdAt - a.createdAt,
  )
}
export function isSafeUrl(value: string): boolean {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
