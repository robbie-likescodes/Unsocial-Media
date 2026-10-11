import type { ReactNode } from 'react'

export function Empty({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <img src="/rabbit.svg" alt="" />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  )
}
