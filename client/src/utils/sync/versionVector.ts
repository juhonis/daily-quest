export type VersionVector = Record<string, number>

export type VersionRelation = 'equal' | 'before' | 'after' | 'concurrent'

// Counters must be non-negative integers; missing replicas have counter zero.
export function compareVersions(
  left: VersionVector,
  right: VersionVector,
): VersionRelation {
  const replicaIds = new Set([...Object.keys(left), ...Object.keys(right)])
  let hasSmaller = false
  let hasLarger = false

  for (const replicaId of replicaIds) {
    const leftCounter = Object.hasOwn(left, replicaId) ? left[replicaId] : 0
    const rightCounter = Object.hasOwn(right, replicaId) ? right[replicaId] : 0

    if (leftCounter < rightCounter) hasSmaller = true
    if (leftCounter > rightCounter) hasLarger = true

    if (hasSmaller && hasLarger) return 'concurrent'
  }

  if (hasSmaller) return 'before'
  if (hasLarger) return 'after'
  return 'equal'
}
