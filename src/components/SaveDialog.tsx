import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { sortCollections } from '../library'
import type { Item, Library } from '../types'
import { covers } from './metadata'
import { Modal } from './Modal'
import { Photo } from './Photo'

export function SaveDialog({
  item,
  library,
  activeId,
  onClose,
  onSave,
  onCreate,
}: {
  item: Item
  library: Library
  activeId: string | null
  onClose: () => void
  onSave: (ids: string[]) => void
  onCreate: (name: string, cover: string) => string
}) {
  const [selected, setSelected] = useState<string[]>(activeId ? [activeId] : [])
  const [query, setQuery] = useState('')
  return (
    <Modal title="Where shall we keep it?" onClose={onClose}>
      <p className="section-note">{item.title}</p>
      <label className="search-box">
        <Search size={17} />
        <input
          autoFocus
          placeholder="Search collections…"
          aria-label="Find a collection to save in"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="save-options">
        {sortCollections(library.collections)
          .filter((collection) =>
            collection.name.toLowerCase().includes(query.toLowerCase()),
          )
          .map((collection) => (
            <label key={collection.id}>
              <Photo image={collection.cover} />
              <span>{collection.name}</span>
              <input
                type="checkbox"
                checked={selected.includes(collection.id)}
                onChange={(event) =>
                  setSelected((previous) =>
                    event.target.checked
                      ? [...previous, collection.id]
                      : previous.filter((id) => id !== collection.id),
                  )
                }
              />
            </label>
          ))}
      </div>
      {query.trim() &&
        !library.collections.some(
          (collection) =>
            collection.name.toLowerCase() === query.trim().toLowerCase(),
        ) && (
          <button
            className="text-button"
            onClick={() => {
              const id = onCreate(query.trim(), item.image ?? covers[0])
              setSelected((previous) => [...previous, id])
              setQuery('')
            }}
          >
            <Plus size={16} /> Create “{query.trim()}”
          </button>
        )}
      <p className="privacy-note">
        Choose at least one collection. You can choose several.
      </p>
      <button
        className="primary wide"
        disabled={!selected.length}
        onClick={() => onSave(selected)}
      >
        Save item
        {selected.length > 1 ? ` to ${selected.length} collections` : ''}
      </button>
    </Modal>
  )
}
