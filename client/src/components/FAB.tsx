import { useState } from 'react'
import { Plus, ScanLine, Keyboard, X } from 'lucide-react'

interface FABProps {
  onAdd: () => void
  onScan: () => void
}

export function FAB({ onAdd, onScan }: FABProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed right-4 bottom-6 z-30 flex flex-col items-end gap-3">
      {expanded && (
        <>
          <button
            onClick={() => { onScan(); setExpanded(false) }}
            className="flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-surface-container text-on-surface shadow-md hover:shadow-lg active:scale-95 transition-all text-sm font-medium"
          >
            <ScanLine className="w-4 h-4" />
            扫码添加
          </button>
          <button
            onClick={() => { onAdd(); setExpanded(false) }}
            className="flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-surface-container text-on-surface shadow-md hover:shadow-lg active:scale-95 transition-all text-sm font-medium"
          >
            <Keyboard className="w-4 h-4" />
            手动输入
          </button>
        </>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-md hover:shadow-lg active:scale-95 transition-all"
        aria-label="添加密钥"
      >
        {expanded ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  )
}
