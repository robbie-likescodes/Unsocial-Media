import { BookOpen } from 'lucide-react'

const photoPositions: Record<string, string> = {
  '/images/coffee.jpg': '0% 0%',
  '/images/alaska.jpg': '50% 0%',
  '/images/art.jpg': '100% 0%',
  '/images/notebook.jpg': '0% 100%',
  '/images/music.jpg': '50% 100%',
  '/images/kayak.jpg': '100% 100%',
}

export function Photo({
  image,
  className = '',
}: {
  image?: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`photo ${className}`}
      style={
        image && photoPositions[image]
          ? {
              backgroundImage: 'url(/images/covers.png)',
              backgroundSize: '300% 200%',
              backgroundPosition: photoPositions[image],
            }
          : image
            ? { backgroundImage: `url(${JSON.stringify(image)})` }
            : undefined
      }
    >
      {!image && <BookOpen size={32} />}
    </div>
  )
}
