import type { ItemType } from '../types'

export const typeNames: Record<ItemType, string> = {
  note: 'Note',
  link: 'Link',
  photo: 'Photo',
  video: 'Video',
  person: 'Person',
  place: 'Place',
  event: 'Event',
}
export const typeDescriptions: Record<ItemType, string> = {
  note: 'A thought worth keeping',
  link: 'A little corner of the internet',
  photo: 'Something that caught your eye',
  video: 'Watch it again, later',
  person: 'A face, a name, a memory',
  place: 'Somewhere to come back to',
  event: 'Something to look forward to',
}
export const covers = [
  '/images/coffee.jpg',
  '/images/alaska.jpg',
  '/images/art.jpg',
  '/images/notebook.jpg',
  '/images/music.jpg',
  '/images/kayak.jpg',
]
