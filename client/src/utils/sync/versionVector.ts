export type VersionVector = Record<string, number>

export type VersionRelation = 'equal' | 'before' | 'after' | 'concurrent'

export function mergeVersions(...versions: VersionVector[]): VersionVector {
  const entries = new Map<string, number>()
  for (const version of versions) {
    for (const [replica, counter] of Object.entries(version)) {
      entries.set(replica, Math.max(entries.get(replica) ?? 0, counter))
    }
  }
  return Object.fromEntries(entries)
}

export function advanceVersion(version: VersionVector, replica: string): VersionVector {
  if (!replica) throw new Error('Replica ID must not be empty.')
  const counter = Object.hasOwn(version, replica) ? version[replica] : 0
  if (!Number.isSafeInteger(counter) || counter < 0 || counter === Number.MAX_SAFE_INTEGER) {
    throw new Error('Invalid or exhausted revision counter.')
  }
  return { ...version, [replica]: counter + 1 }
}

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
