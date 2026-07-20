import { useStore } from '../../store/useStore'
import { Modal } from '../../components/ui/Modal'
import { QuestCreateForm } from './QuestCreateForm'
import type { Quest } from '../../types'

interface QuestCreateModalProps {
  questId: string | null
  onClose: () => void
}

export function QuestCreateModal({ questId, onClose }: QuestCreateModalProps) {
  const quests = useStore((s) => s.quests)
  const addQuest = useStore((s) => s.addQuest)
  const updateQuest = useStore((s) => s.updateQuest)
  const selectedDate = useStore((s) => s.selectedDate)

  const existingQuest = questId ? quests.find((q) => q.id === questId) ?? null : null

  function handleSave(quest: Quest) {
    if (existingQuest) {
      updateQuest(quest.id, quest)
    } else {
      addQuest(quest)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={existingQuest ? 'Edit Quest' : 'Create Quest'}
    >
      <QuestCreateForm
        initialData={existingQuest ?? undefined}
        defaultDate={selectedDate}
        onSave={handleSave}
        onClose={onClose}
      />
    </Modal>
  )
}
