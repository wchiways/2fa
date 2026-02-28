import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/components/TopBar'
import { SecretItem } from '@/components/SecretItem'
import { EmptyState } from '@/components/EmptyState'
import { FAB } from '@/components/FAB'
import { AddSecretDialog } from '@/components/AddSecretDialog'
import { EditSecretDialog } from '@/components/EditSecretDialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { ImportDialog } from '@/components/ImportDialog'
import { ExportDialog } from '@/components/ExportDialog'
import { BackupDialog } from '@/components/BackupDialog'
import { QRScanDialog } from '@/components/QRScanDialog'
import { QRDisplayDialog } from '@/components/QRDisplayDialog'
import { ToolsDialog } from '@/components/ToolsDialog'
import { api, type Secret } from '@/services/api'

export function HomePage() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Secret | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [qrTarget, setQrTarget] = useState<Secret | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)

  const fetchSecrets = useCallback(async () => {
    try {
      const data = await api.getSecrets()
      setSecrets(data.secrets || [])
    } catch {
      toast.error('加载密钥失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return secrets
    const q = searchQuery.toLowerCase()
    return secrets.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.account?.toLowerCase().includes(q)
    )
  }, [secrets, searchQuery])

  async function handleAdd(data: { name: string; account: string; secret: string }) {
    try {
      await api.addSecret(data)
      toast.success('已添加')
      await fetchSecrets()
    } catch {
      toast.error('添加失败')
    }
  }

  async function handleEdit(id: string, data: Partial<Secret>) {
    try {
      await api.updateSecret(id, data)
      toast.success('已保存')
      await fetchSecrets()
    } catch {
      toast.error('保存失败')
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteSecret(id)
      toast.success('已删除')
      await fetchSecrets()
    } catch {
      toast.error('删除失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-surface">
        <div className="text-on-surface-variant text-sm">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-surface">
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        secretCount={secrets.length}
        onImport={() => setImportOpen(true)}
        onExport={() => setExportOpen(true)}
        onBackup={() => setBackupOpen(true)}
        onTools={() => setToolsOpen(true)}
      />

      <main className="max-w-2xl mx-auto pb-20">
        {filtered.length === 0 ? (
          secrets.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex items-center justify-center py-20 text-on-surface-variant text-sm">
              没有匹配的结果
            </div>
          )
        ) : (
          <div>
            {filtered.map((secret) => (
              <SecretItem
                key={secret.id}
                secret={secret}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onShowQR={setQrTarget}
              />
            ))}
          </div>
        )}
      </main>

      <FAB onAdd={() => setAddDialogOpen(true)} onScan={() => setScanOpen(true)} />

      <AddSecretDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdd={handleAdd} />
      <EditSecretDialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }} secret={editTarget} onSave={handleEdit} />
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }} secret={deleteTarget} onConfirm={handleDelete} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={fetchSecrets} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} secrets={secrets} />
      <BackupDialog open={backupOpen} onOpenChange={setBackupOpen} onRestored={fetchSecrets} />
      <QRScanDialog open={scanOpen} onOpenChange={setScanOpen} onScanned={fetchSecrets} />
      <QRDisplayDialog open={!!qrTarget} onOpenChange={(o) => { if (!o) setQrTarget(null) }} secret={qrTarget} />
      <ToolsDialog open={toolsOpen} onOpenChange={setToolsOpen} />
    </div>
  )
}
