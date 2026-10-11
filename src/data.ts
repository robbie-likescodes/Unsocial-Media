import type { Collection, Item, Library } from './types'

const now = Date.now()
const collection = (
  id: string,
  name: string,
  cover: string,
  order: number,
  shared = false,
): Collection => ({
  id,
  name,
  cover,
  visibility: 'private',
  shared,
  visits: 8 - order,
  lastOpened: now - order * 86400000,
  createdAt: now - 30 * 86400000,
})
export const demoItems: Item[] = [
  {
    id: 'pour-over',
    type: 'link',
    title: 'A slower morning',
    description:
      'A gentle introduction to pour-over coffee. Start with fresh beans, a medium grind, and a little patience.',
    image: '/images/coffee.jpg',
    url: 'https://en.wikipedia.org/wiki/Drip_coffee',
  },
  {
    id: 'coffee-note',
    type: 'note',
    title: 'My morning recipe',
    description:
      '18 g coffee · 300 g water\nMedium grind. Bloom for 40 seconds, then pour in slow circles.\nTry a little coarser next time.',
    image: '/images/notebook.jpg',
  },
  {
    id: 'coffee-place',
    type: 'place',
    title: 'A coffee stop in Anchorage',
    description:
      'A sample pin for planning a quiet morning downtown. Replace this with your favorite spot.',
    image: '/images/coffee.jpg',
    location: { name: 'Downtown Anchorage', lat: 61.2176, lng: -149.8997 },
  },
  {
    id: 'alaska-place',
    type: 'place',
    title: 'A weekend by the mountains',
    description:
      'Remember to leave a whole afternoon for the view. This is a sample travel pin.',
    image: '/images/alaska.jpg',
    location: { name: 'Chugach State Park', lat: 61.083, lng: -149.583 },
  },
  {
    id: 'martin',
    type: 'person',
    title: 'Agnes Martin',
    description:
      'An artist to return to: quiet grids, subtle colors, and a remarkable sense of stillness. Add your own museum memories here.',
    image: '/images/art.jpg',
    url: 'https://en.wikipedia.org/wiki/Agnes_Martin',
  },
  {
    id: 'joke',
    type: 'note',
    title: 'One for the next dinner party',
    description:
      'Why did the scarecrow win an award?\n\nBecause they were outstanding in their field.',
    image: '/images/notebook.jpg',
  },
  {
    id: 'bluegrass',
    type: 'link',
    title: 'Follow the banjo',
    description:
      'A starting point for a collection of bluegrass music, musicians, and evenings worth remembering.',
    image: '/images/music.jpg',
    url: 'https://en.wikipedia.org/wiki/Bluegrass_music',
  },
  {
    id: 'kayak',
    type: 'note',
    title: 'People for a paddle',
    description:
      'A private place to remember who enjoys a day on the water. Add a person card when you meet someone you would like to invite.',
    image: '/images/kayak.jpg',
  },
]
export const discoveries: Record<string, Item[]> = {
  coffee: [
    {
      id: 'discover-coffee',
      type: 'link',
      title: 'Where your coffee begins',
      description:
        'Explore coffee origins, growing regions, and the journey from cherry to cup.',
      image: '/images/coffee.jpg',
      url: 'https://en.wikipedia.org/wiki/Coffee',
    },
    {
      id: 'discover-ceramics',
      type: 'link',
      title: 'A cup worth keeping',
      description:
        'A nearby rabbit hole: the craft of ceramics and the objects we use every day.',
      image: '/images/art.jpg',
      url: 'https://en.wikipedia.org/wiki/Pottery',
    },
  ],
  alaska: [
    {
      id: 'discover-alaska',
      type: 'link',
      title: 'The long way around',
      description: 'A little background for your next Alaska adventure.',
      image: '/images/alaska.jpg',
      url: 'https://en.wikipedia.org/wiki/Alaska',
    },
  ],
  artists: [
    {
      id: 'discover-art',
      type: 'link',
      title: 'Finding the quiet in a painting',
      description: 'Explore abstract art and save what catches your eye.',
      image: '/images/art.jpg',
      url: 'https://en.wikipedia.org/wiki/Abstract_art',
    },
  ],
  laughter: [
    {
      id: 'discover-jokes',
      type: 'link',
      title: 'The art of a good joke',
      description: 'A small rabbit hole into humor and storytelling.',
      image: '/images/notebook.jpg',
      url: 'https://en.wikipedia.org/wiki/Joke',
    },
  ],
  bluegrass: [
    {
      id: 'discover-banjo',
      type: 'link',
      title: 'Meet the banjo',
      description: 'Get to know an instrument at the heart of bluegrass.',
      image: '/images/music.jpg',
      url: 'https://en.wikipedia.org/wiki/Banjo',
    },
  ],
  adventures: [
    {
      id: 'discover-kayak',
      type: 'link',
      title: 'Your next paddle',
      description: 'A starting point for learning about kayaking.',
      image: '/images/kayak.jpg',
      url: 'https://en.wikipedia.org/wiki/Kayaking',
    },
  ],
}
export function createDemoLibrary(): Library {
  const collections = [
    collection('coffee', 'Coffee rituals', '/images/coffee.jpg', 0),
    collection('alaska', 'Alaska, someday', '/images/alaska.jpg', 1),
    collection('artists', 'Artists to remember', '/images/art.jpg', 2),
    collection('laughter', 'A little laughter', '/images/notebook.jpg', 3),
    collection('bluegrass', 'Bluegrass evenings', '/images/music.jpg', 4, true),
    collection('adventures', 'People for adventures', '/images/kayak.jpg', 5),
  ]
  const pairs = [
    ['pour-over', 'coffee'],
    ['coffee-note', 'coffee'],
    ['coffee-place', 'coffee'],
    ['coffee-place', 'alaska'],
    ['alaska-place', 'alaska'],
    ['martin', 'artists'],
    ['joke', 'laughter'],
    ['bluegrass', 'bluegrass'],
    ['kayak', 'adventures'],
  ]
  return {
    version: 1,
    collections,
    items: demoItems,
    saved: pairs.map(([itemId, collectionId], index) => ({
      itemId,
      collectionId,
      addedAt: now - index * 60000,
    })),
    feedback: [],
  }
}
