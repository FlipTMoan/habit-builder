import { type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose?: () => void
  children: ReactNode
}

export default function Modal({ open, title, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h3>{title}</h3>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}