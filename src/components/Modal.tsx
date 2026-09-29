import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}

export function Modal({ title, children, onClose, wide = false }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter((item) => !item.hasAttribute('disabled'))
    focusable()[0]?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items.at(-1) as HTMLElement
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section ref={dialogRef} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">编辑安排</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
