import { useState } from 'react'
import type { FormEvent } from 'react'
import { BookOpen } from 'lucide-react'
import { isSafeUrl } from '../library'
import type { Collection, Item, ItemType } from '../types'
import { typeNames } from './metadata'
import { Modal } from './Modal'

export function Composer({
  type,
  collection,
  onClose,
  onSave,
}: {
  type: ItemType
  collection: Collection
  onClose: () => void
  onSave: (item: Item) => void
}) {
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState(''),
    [url, setUrl] = useState(''),
    [image, setImage] = useState(''),
    [location, setLocation] = useState(''),
    [lat, setLat] = useState(''),
    [lng, setLng] = useState(''),
    [date, setDate] = useState(''),
    [error, setError] = useState('')
  const wantsUrl = type === 'link' || type === 'video' || type === 'person'
  function submit(event: FormEvent) {
    event.preventDefault()
    if (url && !isSafeUrl(url)) {
      setError('Use an http or https source link.')
      return
    }
    const item: Item = {
      id: crypto.randomUUID(),
      type,
      title: title.trim(),
      description: description.trim(),
      image: image || collection.cover,
    }
    if (url) item.url = url
    if (type === 'place')
      item.location = {
        name: location.trim() || title.trim(),
        lat: Number(lat),
        lng: Number(lng),
      }
    if (date) item.date = date
    onSave(item)
  }
  return (
    <Modal title={`Create ${typeNames[type].toLowerCase()}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="composer-collection">
          <BookOpen size={15} /> Saving in {collection.name}
        </p>
        <label className="field">
          Title
          <input
            autoFocus
            required
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              type === 'place'
                ? 'Where would you like to return?'
                : 'Give it a name…'
            }
          />
        </label>
        <label className="field">
          Notes
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Why do you want to remember this?"
          />
        </label>
        {wantsUrl && (
          <label className="field">
            Source link
            <input
              type="url"
              required={type === 'link' || type === 'video'}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
        )}
        {type === 'photo' && (
          <label className="field">
            Photo
            <input
              type="file"
              accept="image/*"
              required
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (file.size > 1500000) {
                  setError(
                    'Choose an image smaller than 1.5 MB for this local prototype.',
                  )
                  event.target.value = ''
                  setImage('')
                  return
                }
                const reader = new FileReader()
                reader.onload = () => {
                  setImage(String(reader.result))
                  setError('')
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
        )}
        {type === 'place' && (
          <>
            <label className="field">
              Location name
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="A trail, a town, a little coffee shop…"
              />
            </label>
            <div className="field-pair">
              <label className="field">
                Latitude
                <input
                  required
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={lat}
                  onChange={(event) => setLat(event.target.value)}
                />
              </label>
              <label className="field">
                Longitude
                <input
                  required
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={lng}
                  onChange={(event) => setLng(event.target.value)}
                />
              </label>
            </div>
            <p className="section-note">
              Standalone places work without a link. Live maps and place search
              come later.
            </p>
          </>
        )}
        {type === 'event' && (
          <label className="field">
            Date
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <span className="section-note">
              Manual date for now. Automatic event updates come later.
            </span>
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="primary wide"
          disabled={!title.trim() || (type === 'photo' && !image)}
        >
          Save item
        </button>
      </form>
    </Modal>
  )
}
