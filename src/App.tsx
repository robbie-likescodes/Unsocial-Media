import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  ExternalLink,
  ImagePlus,
  Link2,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  Users,
  X,
} from 'lucide-react'
import { discoveries } from './data'
import {
  isSafeUrl,
  itemsInCollection,
  loadLibrary,
  saveToCollections,
  sortCollections,
  STORAGE_KEY,
} from './library'
import type { Collection, Item, ItemType, Library } from './types'

import { Composer } from './components/Composer'
import { Empty } from './components/Empty'
import { formatDate } from './components/formatDate'
import { typeDescriptions, typeNames } from './components/metadata'
import { Modal } from './components/Modal'
import { NewCollection } from './components/NewCollection'
import { Photo } from './components/Photo'
import { PlacesView } from './components/PlacesView'
import { SaveDialog } from './components/SaveDialog'

export default function App() {
  const [library, setLibrary] = useState<Library>(loadLibrary)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tab, setTab] = useState<'saved' | 'discover' | 'create'>('saved')
  const [view, setView] = useState<'grid' | 'map' | 'calendar'>('grid')
  const [query, setQuery] = useState('')
  const [newCollection, setNewCollection] = useState(false)
  const [detail, setDetail] = useState<Item | null>(null)
  const [saveItem, setSaveItem] = useState<Item | null>(null)
  const [composer, setComposer] = useState<ItemType | null>(null)
  const [toast, setToast] = useState('')
  const [storageError, setStorageError] = useState(false)
  const active = library.collections.find(
    (collection) => collection.id === activeId,
  )
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    } catch {
      queueMicrotask(() => setStorageError(true))
    }
  }, [library])
  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])
  function openCollection(collection: Collection) {
    setActiveId(collection.id)
    setQuery('')
    setTab('saved')
    setView('grid')
    setLibrary((previous) => ({
      ...previous,
      collections: previous.collections.map((existing) =>
        existing.id === collection.id
          ? { ...existing, visits: existing.visits + 1, lastOpened: Date.now() }
          : existing,
      ),
    }))
    window.scrollTo({ top: 0 })
  }
  function goHome() {
    setActiveId(null)
    setQuery('')
    setTab('saved')
    setView('grid')
  }
  function addCollection(name: string, cover: string) {
    const id = crypto.randomUUID()
    setLibrary((previous) => ({
      ...previous,
      collections: [
        ...previous.collections,
        {
          id,
          name,
          cover,
          visibility: 'private',
          shared: false,
          visits: 0,
          lastOpened: Date.now(),
          createdAt: Date.now(),
        },
      ],
    }))
    setToast(`“${name}” is ready for your discoveries.`)
    return id
  }
  function commitSave(item: Item, collectionIds: string[]) {
    setLibrary((previous) => saveToCollections(previous, item, collectionIds))
    setSaveItem(null)
    setComposer(null)
    setTab('saved')
    setToast('Tucked away in your collection.')
    setQuery('')
  }
  const savedItems = active ? itemsInCollection(library, active.id) : []
  const hasLocations = savedItems.some((item) => item.location)
  const hasDates = savedItems.some((item) => item.date)
  const filteredItems = (
    tab === 'discover' && active
      ? (discoveries[active.id] ?? []).filter(
          (item) =>
            !savedItems.some((saved) => saved.id === item.id) &&
            !library.feedback.some(
              (feedback) =>
                feedback.itemId === item.id &&
                feedback.collectionId === active.id,
            ),
        )
      : savedItems
  ).filter((item) =>
    `${item.title} ${item.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  function feedback(item: Item, kind: 'irrelevant' | 'dislike') {
    if (!active) return
    setLibrary((previous) => ({
      ...previous,
      feedback: [
        ...previous.feedback,
        { collectionId: active.id, itemId: item.id, kind },
      ],
    }))
    setToast(
      kind === 'irrelevant'
        ? 'Hidden as off-topic in this collection.'
        : 'Hidden from this collection’s discoveries.',
    )
  }

  return (
    <>
      <header className="app-header">
        <button
          onClick={goHome}
          className="brand"
          aria-label="Rabbit Hole home"
        >
          <img src="/rabbit.svg" alt="" />
          <span>
            Rabbit Hole<small>unsocial media</small>
          </span>
        </button>
        <span className="avatar" aria-label="Local demo profile">
          R
        </span>
      </header>
      <main>
        <section className="page-heading">
          {active ? (
            <>
              <button className="back-button" onClick={goHome}>
                <ArrowLeft size={17} /> Your collections
              </button>
              <div className="title-line">
                <h1>{active.name}</h1>
                <span className="privacy">
                  <LockKeyhole size={13} /> Private
                </span>
              </div>
              <p>{savedItems.length} things worth keeping</p>
            </>
          ) : (
            <>
              <div className="eyebrow">YOUR OWN LITTLE WORLD</div>
              <h1>
                Your collections<span className="heading-leaf">✧</span>
              </h1>
              <p>A little world of things worth keeping.</p>
            </>
          )}
        </section>
        <div className="search-dock">
          <label className="search-box">
            <Search size={19} />
            <input
              type="search"
              aria-label={
                active ? 'Search items or collections' : 'Search collections'
              }
              placeholder={
                active ? 'Search items or collections…' : 'Find a collection…'
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="search-decoration">⌕</span>
          </label>
        </div>
        {storageError && (
          <p className="notice" role="alert">
            Your browser couldn’t save these changes. Keep this page open and
            free up storage before continuing.
          </p>
        )}
        {active && query && (
          <div className="collection-matches">
            {library.collections
              .filter(
                (collection) =>
                  collection.id !== active.id &&
                  collection.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => openCollection(collection)}
                >
                  <BookOpen size={15} /> {collection.name}
                  <ArrowUpRight size={14} />
                </button>
              ))}
          </div>
        )}
        {!active ? (
          <>
            <div className="collection-toolbar">
              <span>
                <SlidersHorizontal size={14} /> Recent & frequent
              </span>
              <button
                onClick={() => setNewCollection(true)}
                className="text-button"
              >
                <Plus size={18} /> New collection
              </button>
            </div>
            <div className="collection-grid">
              {sortCollections(library.collections)
                .filter((collection) =>
                  collection.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((collection) => (
                  <button
                    className="collection-card"
                    onClick={() => openCollection(collection)}
                    key={collection.id}
                  >
                    <div className="collection-cover">
                      <Photo image={collection.cover} />
                      <span className="cover-corner" />
                    </div>
                    <div className="collection-caption">
                      <h2>{collection.name}</h2>
                      <span>
                        {collection.shared ? (
                          <Users size={13} />
                        ) : (
                          <LockKeyhole size={12} />
                        )}
                        {
                          library.saved.filter(
                            (saved) => saved.collectionId === collection.id,
                          ).length
                        }{' '}
                        items{collection.shared && <small> · demo</small>}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
            {!library.collections.some((collection) =>
              collection.name.toLowerCase().includes(query.toLowerCase()),
            ) && (
              <Empty
                title="A new rabbit hole?"
                text="No collections match that name. Make a little space for it."
                action={
                  <button
                    className="primary"
                    onClick={() => setNewCollection(true)}
                  >
                    Create collection
                  </button>
                }
              />
            )}
            <div className="home-footer">
              <div className="burrow">
                <img src="/rabbit.svg" alt="" />
                <span />
              </div>
              <p>Your interests. Your pace. Your place.</p>
              <small>Local prototype · saved on this device</small>
            </div>
          </>
        ) : (
          <>
            <nav className="tabs" aria-label="Collection sections">
              {(['saved', 'discover', 'create'] as const).map((section) => (
                <button
                  role="tab"
                  aria-selected={tab === section}
                  key={section}
                  onClick={() => {
                    setTab(section)
                    setView('grid')
                    setQuery('')
                  }}
                >
                  {section === 'saved' ? (
                    <BookOpen size={16} />
                  ) : section === 'discover' ? (
                    <Compass size={16} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {section[0].toUpperCase() + section.slice(1)}
                </button>
              ))}
            </nav>
            {tab === 'create' ? (
              <>
                <p className="section-note">What would you like to keep?</p>
                <div className="type-grid">
                  {(Object.keys(typeNames) as ItemType[]).map((type) => (
                    <button
                      className="type-card"
                      key={type}
                      onClick={() => setComposer(type)}
                    >
                      {type === 'place' ? (
                        <MapPin />
                      ) : type === 'event' ? (
                        <CalendarDays />
                      ) : type === 'person' ? (
                        <Users />
                      ) : type === 'link' ? (
                        <Link2 />
                      ) : type === 'photo' || type === 'video' ? (
                        <ImagePlus />
                      ) : (
                        <BookOpen />
                      )}
                      <strong>{typeNames[type]}</strong>
                      <span>{typeDescriptions[type]}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {tab === 'saved' ? (
                  <div className="view-toolbar">
                    <span>
                      Recently added <ChevronDown size={13} />
                    </span>
                    <div>
                      <button
                        className={view === 'grid' ? 'selected' : ''}
                        onClick={() => setView('grid')}
                      >
                        Grid
                      </button>
                      {hasLocations && (
                        <button
                          aria-label="Map view"
                          className={view === 'map' ? 'selected' : ''}
                          onClick={() => setView('map')}
                        >
                          <MapPin size={17} />
                        </button>
                      )}
                      {hasDates && (
                        <button
                          aria-label="Calendar view"
                          className={view === 'calendar' ? 'selected' : ''}
                          onClick={() => setView('calendar')}
                        >
                          <CalendarDays size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="section-note">
                    <Sparkles size={15} /> A few nearby rabbit holes{' '}
                    <span>· sample content</span>
                  </p>
                )}
                {view === 'map' ? (
                  <PlacesView
                    items={filteredItems.filter((item) => item.location)}
                    onOpen={setDetail}
                    onAdd={() => setComposer('place')}
                  />
                ) : view === 'calendar' ? (
                  <div className="agenda">
                    {filteredItems
                      .filter((item) => item.date)
                      .sort((a, b) => a.date!.localeCompare(b.date!))
                      .map((item) => (
                        <button key={item.id} onClick={() => setDetail(item)}>
                          <CalendarDays />
                          <div>
                            <time>{formatDate(item.date!)}</time>
                            <h3>{item.title}</h3>
                          </div>
                        </button>
                      ))}
                    <p className="section-note">
                      Dates you entered · automatic tracking comes later.
                    </p>
                  </div>
                ) : (
                  <div className="item-grid">
                    {filteredItems.map((item) => (
                      <article key={item.id} className="item-card">
                        <button
                          className="item-photo-button"
                          onClick={() => setDetail(item)}
                          aria-label={`Open ${item.title}`}
                        >
                          <Photo image={item.image} />
                          <span className="item-type">
                            {typeNames[item.type]}
                          </span>
                          <span className="expand-icon">
                            <ArrowUpRight size={17} />
                          </span>
                        </button>
                        <div className="item-caption">
                          <button onClick={() => setDetail(item)}>
                            <h3>{item.title}</h3>
                          </button>
                          <div className="item-actions">
                            {item.location && <MapPin size={13} />}
                            {item.date && <Clock3 size={13} />}
                            {tab === 'discover' ? (
                              <button
                                onClick={() => setSaveItem(item)}
                                aria-label={`Save ${item.title}`}
                              >
                                <Plus size={15} /> Save
                              </button>
                            ) : (
                              <button
                                onClick={() => setSaveItem(item)}
                                aria-label={`Add ${item.title} to another collection`}
                              >
                                <Plus size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                        {tab === 'discover' && (
                          <div className="feedback">
                            <button
                              onClick={() => feedback(item, 'irrelevant')}
                              aria-label={`Not relevant: ${item.title}`}
                            >
                              <X size={13} /> Not relevant
                            </button>
                            <button
                              onClick={() => feedback(item, 'dislike')}
                              aria-label={`Dislike: ${item.title}`}
                            >
                              <ThumbsDown size={13} /> Dislike
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                {!filteredItems.length && (
                  <Empty
                    title={
                      tab === 'discover'
                        ? 'You’ve reached the end of this little trail.'
                        : 'Room for something wonderful.'
                    }
                    text={
                      tab === 'discover'
                        ? 'These are sample discoveries. Live recommendations will come later.'
                        : query
                          ? 'Try another search, or open a matching collection above.'
                          : 'Create your first item to make this collection yours.'
                    }
                    action={
                      tab === 'saved' && !query ? (
                        <button
                          className="primary"
                          onClick={() => setTab('create')}
                        >
                          <Plus size={16} /> Create an item
                        </button>
                      ) : undefined
                    }
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {newCollection && (
        <NewCollection
          initialName={query}
          onClose={() => setNewCollection(false)}
          onCreate={(name, cover) => {
            addCollection(name, cover)
            setNewCollection(false)
            setQuery('')
          }}
        />
      )}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <Photo image={detail.image} className="detail-photo" />
          <span className="detail-type">{typeNames[detail.type]}</span>
          <p className="detail-description">{detail.description}</p>
          {detail.location && (
            <p className="metadata">
              <MapPin size={17} />
              {detail.location.name}
            </p>
          )}
          {detail.date && (
            <p className="metadata">
              <CalendarDays size={17} />
              {formatDate(detail.date)}
            </p>
          )}
          {detail.url && isSafeUrl(detail.url) && (
            <a
              className="source-link"
              href={detail.url}
              target="_blank"
              rel="noreferrer"
            >
              {detail.type === 'video' ? 'Watch at source' : 'Visit source'}
              <ExternalLink size={16} />
            </a>
          )}
          <div className="detail-collections">
            {library.saved
              .filter((saved) => saved.itemId === detail.id)
              .map((saved) => (
                <span key={saved.collectionId}>
                  {
                    library.collections.find(
                      (collection) => collection.id === saved.collectionId,
                    )?.name
                  }
                </span>
              ))}
          </div>
          <button
            className="primary wide"
            onClick={() => {
              setSaveItem(detail)
              setDetail(null)
            }}
          >
            <Plus size={17} /> Save to a collection
          </button>
        </Modal>
      )}
      {saveItem && (
        <SaveDialog
          item={saveItem}
          library={library}
          activeId={activeId}
          onClose={() => setSaveItem(null)}
          onSave={(ids) => commitSave(saveItem, ids)}
          onCreate={addCollection}
        />
      )}
      {composer && active && (
        <Composer
          type={composer}
          collection={active}
          onClose={() => setComposer(null)}
          onSave={(item) => commitSave(item, [active.id])}
        />
      )}
    </>
  )
}
