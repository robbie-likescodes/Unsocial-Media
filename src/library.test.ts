import { describe, expect, it } from 'vitest'
import {
  isSafeUrl,
  itemsInCollection,
  loadLibrary,
  saveToCollections,
  sortCollections,
  STORAGE_KEY,
} from './library'
import type { Collection, Item, Library } from './types'

const coffee: Collection = {
  id: 'coffee',
  name: 'Coffee',
  cover: '',
  visibility: 'private',
  shared: false,
  visits: 0,
  lastOpened: 0,
  createdAt: 1,
}
const travel: Collection = {
  ...coffee,
  id: 'travel',
  name: 'Travel',
  createdAt: 2,
}
const item: Item = {
  id: 'coffee-shop',
  type: 'place',
  title: 'A coffee shop',
  description: 'A place to return to.',
  location: { name: 'Anchorage', lat: 61.2, lng: -149.9 },
}
const emptyLibrary = (): Library => ({
  version: 1,
  collections: [coffee, travel],
  items: [],
  saved: [],
  feedback: [],
})

describe('saving to collections', () => {
  it('requires at least one existing collection before saving an item', () => {
    const library = emptyLibrary()
    expect(() => saveToCollections(library, item, [])).toThrow(
      'Choose at least one collection.',
    )
    expect(() => saveToCollections(library, item, ['missing'])).toThrow(
      'Choose at least one collection.',
    )
    expect(library.items).toEqual([])
    expect(library.saved).toEqual([])
  })

  it('shares one item across collections and ignores repeated or invalid selections', () => {
    const library = emptyLibrary()
    const saved = saveToCollections(
      library,
      item,
      ['coffee', 'travel', 'coffee', 'missing'],
      100,
    )
    expect(saved.items).toEqual([item])
    expect(saved.saved).toEqual([
      { itemId: item.id, collectionId: 'coffee', addedAt: 100 },
      { itemId: item.id, collectionId: 'travel', addedAt: 100 },
    ])
    expect(itemsInCollection(saved, 'coffee')).toEqual([item])
    expect(itemsInCollection(saved, 'travel')).toEqual([item])
    expect(library).toEqual(emptyLibrary())
  })

  it('saving again neither duplicates membership nor resets its original added date', () => {
    const first = saveToCollections(emptyLibrary(), item, ['coffee'], 100)
    const again = saveToCollections(first, item, ['coffee', 'travel'], 200)
    expect(again.items).toHaveLength(1)
    expect(again.saved).toEqual([
      { itemId: item.id, collectionId: 'coffee', addedAt: 100 },
      { itemId: item.id, collectionId: 'travel', addedAt: 200 },
    ])
  })
})

describe('collection ordering', () => {
  it('returns newly added items first without changing stored order', () => {
    const secondItem: Item = {
      ...item,
      id: 'coffee-recipe',
      type: 'note',
      title: 'Coffee recipe',
    }
    const first = saveToCollections(emptyLibrary(), item, ['coffee'], 100)
    const library = saveToCollections(first, secondItem, ['coffee'], 200)
    expect(
      itemsInCollection(library, 'coffee').map((saved) => saved.id),
    ).toEqual(['coffee-recipe', 'coffee-shop'])
    expect(library.saved.map((saved) => saved.itemId)).toEqual([
      'coffee-shop',
      'coffee-recipe',
    ])
    expect(itemsInCollection(library, 'missing')).toEqual([])
  })

  it('can elevate a frequently revisited collection even when another is more recent', () => {
    const recentlyOpened = { ...coffee, visits: 1, lastOpened: 7 * 86400000 }
    const oftenOpened = { ...travel, visits: 12, lastOpened: 6 * 86400000 }
    const collections = [recentlyOpened, oftenOpened]
    expect(
      sortCollections(collections).map((collection) => collection.id),
    ).toEqual(['travel', 'coffee'])
    expect(collections).toEqual([recentlyOpened, oftenOpened])
    expect(sortCollections([])).toEqual([])
  })
})

describe('browser persistence', () => {
  it('loads a saved library with an item in multiple collections intact', () => {
    const library = saveToCollections(
      emptyLibrary(),
      item,
      ['coffee', 'travel'],
      100,
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    expect(loadLibrary()).toEqual(library)
  })

  it.each([
    'not json',
    '{"version":2,"collections":[],"items":[],"saved":[],"feedback":[]}',
    '{"version":1,"collections":null}',
  ])('recovers from unsupported or broken local storage (%s)', (raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    const library = loadLibrary()
    expect(library.version).toBe(1)
    expect(library.collections.length).toBeGreaterThan(0)
    expect(
      library.collections.every(
        (collection) => collection.visibility === 'private',
      ),
    ).toBe(true)
  })

  const valid = saveToCollections(emptyLibrary(), item, ['coffee'], 100)
  it.each([
    ['null collection', { ...valid, collections: [null] }],
    [
      'missing item title',
      { ...valid, items: [{ ...item, title: undefined }] },
    ],
    [
      'unsafe source URL',
      { ...valid, items: [{ ...item, url: 'javascript:alert(1)' }] },
    ],
    [
      'invalid event date',
      { ...valid, items: [{ ...item, date: 'tomorrow' }] },
    ],
    [
      'out-of-range coordinates',
      {
        ...valid,
        items: [
          { ...item, location: { name: 'Impossible', lat: 91, lng: -149.9 } },
        ],
      },
    ],
    [
      'missing collection membership',
      {
        ...valid,
        saved: [{ itemId: item.id, collectionId: 'missing', addedAt: 100 }],
      },
    ],
    [
      'missing item membership',
      {
        ...valid,
        saved: [{ itemId: 'missing', collectionId: 'coffee', addedAt: 100 }],
      },
    ],
    [
      'invalid feedback kind',
      {
        ...valid,
        feedback: [
          {
            itemId: 'discover-coffee',
            collectionId: 'coffee',
            kind: 'invalid',
          },
        ],
      },
    ],
  ])('recovers from malformed nested storage: %s', (_name, value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    const loaded = loadLibrary()
    expect(loaded.items.some((item) => item.id === 'pour-over')).toBe(true)
    expect(
      loaded.collections.some((collection) => collection.id === 'coffee'),
    ).toBe(true)
  })
})

describe('external URLs', () => {
  it.each(['https://en.wikipedia.org/wiki/Coffee', 'http://example.com'])(
    'permits web links (%s)',
    (value) => {
      expect(isSafeUrl(value)).toBe(true)
    },
  )

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '/relative-link',
    'not a url',
    '',
  ])('rejects non-web or malformed links (%s)', (value) => {
    expect(isSafeUrl(value)).toBe(false)
  })
})
