import { ArrowUpRight, MapPin, Plus } from 'lucide-react'
import type { Item } from '../types'
import { Photo } from './Photo'

export function PlacesView({
  items,
  onOpen,
  onAdd,
}: {
  items: Item[]
  onOpen: (item: Item) => void
  onAdd: () => void
}) {
  return (
    <div className="places">
      <div className="map-placeholder">
        <MapPin size={32} />
        <h2>Your places, gathered</h2>
        <p>Location cards are ready. An interactive map is the next step.</p>
        <button className="primary" onClick={onAdd}>
          <Plus size={16} /> Add a place
        </button>
      </div>
      {items.map((item) => (
        <button
          className="place-row"
          key={item.id}
          onClick={() => onOpen(item)}
        >
          <Photo image={item.image} />
          <div>
            <h3>{item.title}</h3>
            <p>{item.location!.name}</p>
            <small>
              {item.location!.lat.toFixed(4)}, {item.location!.lng.toFixed(4)}
            </small>
          </div>
          <ArrowUpRight size={18} />
        </button>
      ))}
    </div>
  )
}
