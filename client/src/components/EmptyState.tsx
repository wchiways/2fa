import { ShieldCheck } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <ShieldCheck className="w-16 h-16 text-outline mb-4" strokeWidth={1} />
      <p className="text-on-surface-variant text-base">还没有密钥</p>
      <p className="text-on-surface-variant/60 text-sm mt-1">点击右下角的 + 按钮添加</p>
    </div>
  )
}
