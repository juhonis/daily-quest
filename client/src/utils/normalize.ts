import type { Quest, CompletionRecord, Note, QuickPreset } from '../types'

function validIso(s: string | undefined | null): boolean {
  if (!s) return false
  return !Number.isNaN(new Date(s).getTime())
}

function isoOrEpoch(s: string | undefined | null): string {
  if (!s) return new Date(0).toISOString()
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
}

export function normalizeQuest(q: Quest): Quest {
  return validIso(q.updatedAt) ? q : { ...q, updatedAt: isoOrEpoch(q.createdAt) }
}

export function normalizeCompletion(c: CompletionRecord): CompletionRecord {
  return validIso(c.updatedAt) ? c : { ...c, updatedAt: isoOrEpoch(c.completedOn) }
}

export function normalizeNote(n: Note): Note {
  return validIso(n.updatedAt) ? n : { ...n, updatedAt: isoOrEpoch(n.createdAt) }
}

export function normalizeQuickPreset(p: QuickPreset): QuickPreset {
  return validIso(p.updatedAt) ? p : { ...p, updatedAt: new Date(0).toISOString() }
}
