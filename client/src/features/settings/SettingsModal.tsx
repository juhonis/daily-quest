import { useRef, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useStore } from '../../store/useStore'
import { getTodayLocal } from '../../utils/dateUtils'
import { downloadJson, exportData, parseImport } from '../../utils/exportImport'
import type { ImportPayload } from '../../types'
import { EditPanelsModal } from '../quests/list/EditPanelsModal'

interface SettingsModalProps {
  onClose: () => void
}

function exportFileName(): string {
  return `daily-quest-${getTodayLocal()}.json`
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const importData = useStore((s) => s.importData)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [payload, setPayload] = useState<ImportPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backupDownloaded, setBackupDownloaded] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPanels, setShowPanels] = useState(false)

  function handleExport() {
    downloadJson(exportFileName(), exportData(useStore.getState()))
  }

  function handleBackup() {
    downloadJson(`daily-quest-backup-${getTodayLocal()}.json`, exportData(useStore.getState()))
    setBackupDownloaded(true)
  }

  function handleFile(file: File | undefined) {
    setError(null)
    setSuccess(null)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseImport(String(reader.result))
        setPayload(parsed)
        setBackupDownloaded(false)
      } catch (e) {
        setPayload(null)
        setBackupDownloaded(false)
        setError(e instanceof Error ? e.message : 'Import failed.')
      }
    }
    reader.readAsText(file)
  }

  function handleConfirmImport() {
    if (!payload) return
    importData(payload)
    setSuccess(
      payload.locationMode === 'manual'
        ? 'Data imported. If you use a manual location, re-pick it to restore weather.'
        : 'Data imported successfully.',
    )
    setPayload(null)
    setBackupDownloaded(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Modal isOpen onClose={onClose} title="Settings">
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Panels
          </h3>
          <Button variant="secondary" onClick={() => setShowPanels(true)}>
            Edit panels
          </Button>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Data
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Export your data as a JSON file to back it up or move it to another device.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <Button onClick={handleExport}>Export data</Button>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Choose import file
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-950/50 border border-red-800 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {payload && (
            <div className="mt-3 rounded-lg border border-slate-600 bg-slate-700/40 p-3 space-y-2">
              <p className="text-sm text-slate-200">
                This replaces all current local data with the selected backup.
              </p>
              <p className="text-xs text-slate-400">
                Download a backup of your current data first.
              </p>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" onClick={handleBackup}>
                  Download backup
                </Button>
                <Button
                  variant="danger"
                  disabled={!backupDownloaded}
                  onClick={handleConfirmImport}
                >
                  Replace &amp; import
                </Button>
              </div>
            </div>
          )}

          {success && (
            <p className="mt-3 rounded-lg bg-green-950/50 border border-green-800 px-3 py-2 text-xs text-green-300">
              {success}
            </p>
          )}
        </section>
      </div>

      {showPanels && <EditPanelsModal onClose={() => setShowPanels(false)} />}
    </Modal>
  )
}
