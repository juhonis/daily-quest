export const TAG_PALETTE = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#14B8A6', '#A855F7', '#22C55E', '#E11D48',
]

export function assignTagColor(_tag: string, existingColors: Record<string, string>): string {
  const used = new Set(Object.values(existingColors))
  const available = TAG_PALETTE.filter((c) => !used.has(c))
  if (available.length > 0) return available[0]
  return TAG_PALETTE[Object.keys(existingColors).length % TAG_PALETTE.length]
}

export function getTagStyle(color: string) {
  return {
    backgroundColor: `${color}33`,
    borderColor: `${color}4D`,
    color,
  }
}

export function getTagBgStyle(color: string) {
  return {
    backgroundColor: `${color}1A`,
    color,
  }
}
