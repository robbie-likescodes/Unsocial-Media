export type ItemType =
  'note' | 'link' | 'photo' | 'video' | 'person' | 'place' | 'event'
export type Visibility = 'private' | 'link' | 'public'
export interface Collection {
  id: string
  name: string
  cover: string
  visibility: Visibility
  shared: boolean
  visits: number
  lastOpened: number
  createdAt: number
}
export interface Item {
  id: string
  type: ItemType
  title: string
  description: string
  image?: string
  url?: string
  location?: { name: string; lat: number; lng: number }
  date?: string
  creator?: string
}
export interface SavedItem {
  itemId: string
  collectionId: string
  addedAt: number
}
export interface Feedback {
  collectionId: string
  itemId: string
  kind: 'irrelevant' | 'dislike'
}
export interface Library {
  version: 1
  collections: Collection[]
  items: Item[]
  saved: SavedItem[]
  feedback: Feedback[]
}
