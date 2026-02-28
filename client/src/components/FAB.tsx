import { Plus } from 'lucide-react'

interface FABProps {
  onClick: () => void
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 bottom-6 z-30 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-md hover:shadow-lg active:scale-95 transition-all"
      aria-label="添加密钥"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
