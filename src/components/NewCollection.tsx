import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { covers } from './metadata'
import { Modal } from './Modal'
import { Photo } from './Photo'

export function NewCollection({
  initialName,
  onCreate,
  onClose,
}: {
  initialName: string
  onCreate: (name: string, cover: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initialName)
  const [cover, setCover] = useState(covers[0])
  return (
    <Modal title="A new rabbit hole" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim()) onCreate(name.trim(), cover)
        }}
      >
        <label className="field">
          Collection name
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="What are you curious about?"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <p className="field-label">Choose a cover</p>
        <div className="cover-options">
          {covers.map((image, index) => (
            <button
              type="button"
              aria-label={`Cover ${index + 1}`}
              aria-pressed={cover === image}
              className={cover === image ? 'picked' : ''}
              key={image}
              onClick={() => setCover(image)}
            >
              <Photo image={image} />
            </button>
          ))}
        </div>
        <p className="privacy-note">
          <LockKeyhole size={14} /> Just for you. New collections start private.
        </p>
        <button className="primary wide" disabled={!name.trim()}>
          Create collection
        </button>
      </form>
    </Modal>
  )
}
