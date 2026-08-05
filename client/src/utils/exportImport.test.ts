import { describe, it, expect, beforeEach } from 'vitest'
import type { Quest, CompletionRecord, Note, QuickPreset, AppState, ImportPayload } from '../types'
import { useStore } from '../store/useStore'
import {
  normalizeQuest,
  normalizeCompletion,
  normalizeNote,
  normalizeQuickPreset,
} from './normalize'
import { exportData, parseImport, CURRENT_SCHEMA_VERSION } from './exportImport'

function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'q1',
    title: 'Test Quest',
    createdAt: '2026-07-20T05:00:00.000Z',
    updatedAt: '2026-07-20T05:00:00.000Z',
    targetDate: '2026-07-20',
    repeat: 'none',
    rollover: false,
    subQuests: [],
    status: 'active',
    archivedAt: null,
    xp: null,
    maxRolloverDays: null,
    ...overrides,
  }
}

function completion(overrides: Partial<CompletionRecord> = {}): CompletionRecord {
  return {
    id: 'c1',
    questId: 'q1',
    completedOn: '2026-07-20',
    updatedAt: '2026-07-20T05:00:00.000Z',
    ...overrides,
  }
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'Note',
    content: 'body',
    color: '#3B82F6',
    createdAt: '2026-07-20T05:00:00.000Z',
    updatedAt: '2026-07-20T05:00:00.000Z',
    archivedAt: null,
    ...overrides,
  }
}

function preset(overrides: Partial<QuickPreset> = {}): QuickPreset {
  return {
    id: 'p1',
    title: 'Preset',
    isUserDefined: true,
    updatedAt: '2026-07-20T05:00:00.000Z',
    ...overrides,
  }
}

function makePayload(data: Record<string, unknown> = {}): ImportPayload {
  return {
    quests: [quest()],
    completions: [completion()],
    notes: [note()],
    quickPresets: [preset()],
    panelOrder: ['daily', 'repeating'],
    hiddenPanels: [],
    mergedPanels: {},
    tagPanels: [],
    tagColors: {},
    noteTagColors: {},
    locationMode: 'auto',
    locationName: '',
    ...data,
  } as ImportPayload
}

function makeJson(
  data: Record<string, unknown> = {},
  root: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    app: 'daily-quest',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: '2026-08-05T00:00:00.000Z',
    ...root,
    data: {
      quests: [quest()],
      completions: [completion()],
      notes: [note()],
      quickPresets: [preset()],
      panelOrder: ['daily', 'repeating'],
      hiddenPanels: [],
      mergedPanels: {},
      tagPanels: [],
      tagColors: {},
      noteTagColors: {},
      locationMode: 'auto',
      locationName: '',
      ...data,
    },
  })
}

function fullState(): AppState {
  return {
    quests: [quest({ id: 'q-full', tags: ['work'], sortOrder: 2 })],
    completions: [completion({ id: 'c-full' })],
    notes: [note({ id: 'n-full', tags: ['ideas'] })],
    quickPresets: [preset({ id: 'p-full' })],
    panelOrder: ['daily', 'repeating', 'important'],
    hiddenPanels: ['done'],
    mergedPanels: { rollover: 'daily' },
    tagPanels: ['work'],
    tagColors: { work: '#3B82F6' },
    noteTagColors: { ideas: '#10B981' },
    locationMode: 'manual',
    locationName: 'Helsinki',
    coords: { lat: 60.17, lon: 24.94 },
    filterTags: ['work'],
    filterNoteTags: ['ideas'],
  } as unknown as AppState
}

// ---------------------------------------------------------------------------
// Normalizers (what the persist merge calls)
// ---------------------------------------------------------------------------
describe('normalizers', () => {
  it('fill missing updatedAt from createdAt', () => {
    const q = { ...quest(), updatedAt: undefined } as unknown as Quest
    expect(normalizeQuest(q).updatedAt).toBe('2026-07-20T05:00:00.000Z')
  })

  it('preserve a valid updatedAt verbatim (fill-only)', () => {
    const q = quest({ updatedAt: '2026-01-01T00:00:00.000Z' })
    expect(normalizeQuest(q)).toBe(q)
  })

  it('fill completion updatedAt from completedOn', () => {
    const c = { ...completion(), updatedAt: undefined } as unknown as CompletionRecord
    expect(normalizeCompletion(c).updatedAt).toBe(
      new Date('2026-07-20').toISOString(),
    )
  })

  it('fall back to epoch on invalid createdAt/completedOn without throwing', () => {
    const q = {
      ...quest(),
      createdAt: 'garbage',
      updatedAt: undefined,
    } as unknown as Quest
    expect(normalizeQuest(q).updatedAt).toBe(new Date(0).toISOString())

    const c = {
      ...completion(),
      completedOn: '',
      updatedAt: undefined,
    } as unknown as CompletionRecord
    expect(normalizeCompletion(c).updatedAt).toBe(new Date(0).toISOString())
  })

  it('backfill an invalid updatedAt from createdAt (epoch only if that is invalid too)', () => {
    const n = { ...note(), updatedAt: 'not-a-date' } as unknown as Note
    expect(normalizeNote(n).updatedAt).toBe('2026-07-20T05:00:00.000Z')

    const bad = { ...note(), createdAt: '', updatedAt: 'not-a-date' } as unknown as Note
    expect(normalizeNote(bad).updatedAt).toBe(new Date(0).toISOString())
  })

  it('default a preset with no timestamp to epoch', () => {
    const p = { ...preset(), updatedAt: undefined } as unknown as QuickPreset
    expect(normalizeQuickPreset(p).updatedAt).toBe(new Date(0).toISOString())
  })
})

// ---------------------------------------------------------------------------
// Validator: accept
// ---------------------------------------------------------------------------
describe('parseImport accepts', () => {
  it('a valid export', () => {
    const payload = parseImport(makeJson())
    expect(payload.quests).toHaveLength(1)
    expect(payload.quests[0].id).toBe('q1')
    expect(payload.panelOrder).toEqual(['daily', 'repeating'])
  })

  it('valid 6-digit hex colors', () => {
    expect(
      parseImport(makeJson({ tagColors: { a: '#3B82F6' }, noteTagColors: { b: '#10B981' } })),
    ).toBeTruthy()
  })

  it('a note color expressed as rgb()', () => {
    const rgb = 'rgb(59, 130, 246)'
    expect(parseImport(makeJson({ notes: [note({ color: rgb })] }))).toBeTruthy()
  })

  it('missing optional collections and defaults them', () => {
    const payload = parseImport(makeJson({ tagColors: undefined, quickPresets: undefined, locationName: undefined }))
    expect(payload.tagColors).toEqual({})
    expect(payload.tagPanels).toEqual([])
    expect(payload.quickPresets).toHaveLength(0)
    expect(payload.locationMode).toBe('auto')
    expect(payload.locationName).toBe('')
  })

  it('a quest without updatedAt (backfilled, not rejected)', () => {
    const payload = parseImport(makeJson({ quests: [quest({ updatedAt: undefined })] }))
    expect(payload.quests[0].updatedAt).toBe('2026-07-20T05:00:00.000Z')
  })

  it('preserves a valid imported updatedAt verbatim', () => {
    const stamp = '2021-03-01T08:30:00.000Z'
    const payload = parseImport(makeJson({ quests: [quest({ updatedAt: stamp })] }))
    expect(payload.quests[0].updatedAt).toBe(stamp)
  })

  it('treats a null externalUrl as absent', () => {
    const payload = parseImport(
      makeJson({ quests: [{ ...quest(), externalUrl: null } as unknown as Quest] }),
    )
    expect(payload.quests[0].externalUrl).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Validator: reject envelope
// ---------------------------------------------------------------------------
describe('parseImport rejects', () => {
  it('invalid / truncated JSON', () => {
    expect(() => parseImport('{not json')).toThrow(/not valid JSON/i)
  })

  it('a foreign app name', () => {
    expect(() => parseImport(makeJson({}, { app: 'other-app' }))).toThrow(/Daily Quest/i)
  })

  it('a non-integer schemaVersion', () => {
    expect(() => parseImport(makeJson({}, { schemaVersion: 'one' }))).toThrow(
      /schema version/i,
    )
  })

  it('a schemaVersion above the current version', () => {
    expect(() =>
      parseImport(makeJson({}, { schemaVersion: CURRENT_SCHEMA_VERSION + 1 })),
    ).toThrow(/newer version/i)
  })

  it('a non-array collection', () => {
    expect(() => parseImport(makeJson({ quests: { not: 'array' } }))).toThrow(
      /data.quests must be an array/i,
    )
  })

  it('a quest missing a required field', () => {
    const noTarget = quest() as unknown as Record<string, unknown>
    delete noTarget.targetDate
    expect(() => parseImport(makeJson({ quests: [noTarget] }))).toThrow(/quest.targetDate/i)
  })

  it('a quest with wrong field types', () => {
    expect(() =>
      parseImport(makeJson({ quests: [{ ...quest(), rollover: 'yes' } as unknown as Quest] })),
    ).toThrow(/quest.rollover/i)
  })
})

// ---------------------------------------------------------------------------
// Validator: security guards (hard reject)
// ---------------------------------------------------------------------------
describe('parseImport security guards', () => {
  it('rejects a javascript: externalUrl on a quest', () => {
    expect(() =>
      parseImport(makeJson({ quests: [quest({ externalUrl: 'javascript:alert(1)' })] })),
    ).toThrow(/http\(s\) URL/i)
  })

  it('rejects a data: externalUrl on a preset', () => {
    expect(() =>
      parseImport(makeJson({ quickPresets: [preset({ externalUrl: 'data:text/html,x' })] })),
    ).toThrow(/http\(s\) URL/i)
  })

  it('accepts an https externalUrl', () => {
    expect(
      parseImport(makeJson({ quests: [quest({ externalUrl: 'https://example.com' })] })),
    ).toBeTruthy()
  })

  it('rejects a non-hex tagColor', () => {
    expect(() =>
      parseImport(makeJson({ tagColors: { a: 'red' } })),
    ).toThrow(/not a valid color/i)
  })

  it('rejects an 8-digit derived hex tagColor while accepting 6-digit', () => {
    expect(() =>
      parseImport(makeJson({ tagColors: { a: '#3B82F633' } })),
    ).toThrow(/not a valid color/i)
    expect(parseImport(makeJson({ tagColors: { a: '#3B82F6' } }))).toBeTruthy()
  })

  it('rejects an invalid note color and 8-digit note color', () => {
    expect(() => parseImport(makeJson({ notes: [note({ color: 'blue' })] }))).toThrow(
      /not a valid color/i,
    )
    expect(() => parseImport(makeJson({ notes: [note({ color: '#3B82F633' })] }))).toThrow(
      /not a valid color/i,
    )
  })

  it('rejects a malformed noteTagColor', () => {
    expect(() =>
      parseImport(makeJson({ noteTagColors: { b: '#GGGGGG' } })),
    ).toThrow(/not a valid color/i)
  })
})

// ---------------------------------------------------------------------------
// Validator: duplicates
// ---------------------------------------------------------------------------
describe('parseImport duplicate checks', () => {
  it('rejects duplicate quest ids', () => {
    expect(() =>
      parseImport(makeJson({ quests: [quest(), quest({ id: 'q1' })] })),
    ).toThrow(/Duplicate quest id/i)
  })

  it('rejects duplicate completions for the same quest+date', () => {
    expect(() =>
      parseImport(
        makeJson({
          completions: [completion({ id: 'a' }), completion({ id: 'b' })],
        }),
      ),
    ).toThrow(/Duplicate completion/i)
  })

  it('allows the same quest completed on different dates', () => {
    expect(
      parseImport(
        makeJson({
          completions: [completion({ id: 'a' }), completion({ id: 'b', completedOn: '2026-07-21' })],
        }),
      ),
    ).toBeTruthy()
  })

  it('rejects duplicate note ids', () => {
    expect(() => parseImport(makeJson({ notes: [note(), note({ id: 'n1' })] }))).toThrow(
      /Duplicate note id/i,
    )
  })

  it('rejects duplicate preset ids', () => {
    expect(() =>
      parseImport(makeJson({ quickPresets: [preset(), preset({ id: 'p1' })] })),
    ).toThrow(/Duplicate quick preset id/i)
  })
})

// ---------------------------------------------------------------------------
// Export / roundtrip
// ---------------------------------------------------------------------------
describe('exportData / roundtrip', () => {
  it('omits coords, filterTags and filterNoteTags from the payload', () => {
    const parsed = JSON.parse(exportData(fullState()))
    expect(parsed.data.coords).toBeUndefined()
    expect(parsed.data.filterTags).toBeUndefined()
    expect(parsed.data.filterNoteTags).toBeUndefined()
    expect(parsed.data.quests).toHaveLength(1)
  })

  it('roundtrips through parseImport, preserving all seeded optional fields and updatedAt', () => {
    const state = fullState()
    const payload = parseImport(exportData(state))
    expect(payload.quests).toEqual(state.quests)
    expect(payload.completions).toEqual(state.completions)
    expect(payload.notes).toEqual(state.notes)
    expect(payload.quickPresets).toEqual(state.quickPresets)
    expect(payload.tagColors).toEqual(state.tagColors)
    expect(payload.noteTagColors).toEqual(state.noteTagColors)
    expect(payload.mergedPanels).toEqual(state.mergedPanels)
    expect(payload.panelOrder).toEqual(state.panelOrder)
    expect(payload.locationMode).toBe('manual')
    expect(payload.locationName).toBe('Helsinki')
  })
})

// ---------------------------------------------------------------------------
// Store importData
// ---------------------------------------------------------------------------
describe('importData', () => {
  beforeEach(() => {
    useStore.setState({
      quests: [],
      completions: [],
      notes: [],
      quickPresets: [],
      tagColors: {},
      noteTagColors: {},
      tagPanels: [],
      mergedPanels: {},
      hiddenPanels: [],
      panelOrder: ['daily', 'repeating', 'important', 'rollover', 'done'],
      filterTags: ['x'],
      filterNoteTags: ['y'],
      coords: { lat: 1, lon: 2 },
    })
  })

  it('replaces data and preference slices and resets view/device state', () => {
    const payload = makePayload()
    const before = useStore.getState().selectedDate
    useStore.getState().importData(payload)
    const s = useStore.getState()
    expect(s.quests).toEqual(payload.quests)
    expect(s.completions).toEqual(payload.completions)
    expect(s.notes).toEqual(payload.notes)
    expect(s.quickPresets).toEqual(payload.quickPresets)
    expect(s.panelOrder).toEqual(payload.panelOrder)
    expect(s.tagColors).toEqual(payload.tagColors)
    expect(s.noteTagColors).toEqual(payload.noteTagColors)
    expect(s.filterTags).toEqual([])
    expect(s.filterNoteTags).toEqual([])
    expect(s.coords).toBeNull()
    expect(s.selectedDate).toBe(before)
  })

  it('keeps the current panelOrder when the imported one is empty', () => {
    useStore.setState({ panelOrder: ['daily'] })
    useStore.getState().importData(makePayload({ panelOrder: [] }))
    expect(useStore.getState().panelOrder).toEqual(['daily'])
  })

  it('replaces panelOrder when the imported one is non-empty', () => {
    useStore.setState({ panelOrder: ['daily'] })
    useStore.getState().importData(makePayload({ panelOrder: ['important', 'done'] }))
    expect(useStore.getState().panelOrder).toEqual(['important', 'done'])
  })
})