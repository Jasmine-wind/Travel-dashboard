import type { DataPoint, InsightDataset, NetworkEdge } from './mockData'

export interface FilterState {
  category: string
  community: string
  region: string
  minConfidence: number
  search: string
}

export function filterByTimeRange(points: DataPoint[], timeRange: [number, number]) {
  const [start, end] = timeRange
  return points.filter((p) => p.timestamp >= start && p.timestamp <= end)
}

export function applyFilters(points: DataPoint[], filters: FilterState) {
  return points.filter((p) => {
    const matchCategory = filters.category === 'all' || p.category === filters.category
    const matchCommunity = filters.community === 'all' || p.community === filters.community
    const matchRegion = filters.region === 'all' || p.region === filters.region
    const matchConfidence = p.confidence >= filters.minConfidence
    const query = filters.search.trim().toLowerCase()
    const matchSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.region.toLowerCase().includes(query)
    return matchCategory && matchCommunity && matchRegion && matchConfidence && matchSearch
  })
}

export function linkedSubgraph(edges: NetworkEdge[], allowedIds: Set<string>) {
  const filteredEdges = edges.filter(
    (e) => allowedIds.has(e.source) && allowedIds.has(e.target),
  )
  const used = new Set<string>()
  filteredEdges.forEach((e) => {
    used.add(e.source)
    used.add(e.target)
  })
  return { edges: filteredEdges, nodeIds: used }
}

export function stats(points: DataPoint[]) {
  const total = points.length
  const avgConfidence =
    total === 0 ? 0 : points.reduce((acc, p) => acc + p.confidence, 0) / total
  const regionCount = new Set(points.map((p) => p.region)).size
  const communityCount = new Set(points.map((p) => p.community)).size
  return { total, avgConfidence, regionCount, communityCount }
}

export function buildSparkline(points: DataPoint[], dataset: InsightDataset) {
  // 使用原始 timeBuckets，将 count 替换为窗口内的计数
  return dataset.timeBuckets.map((bucket) => {
    const count = points.filter(
      (p) => p.timestamp >= bucket.time && p.timestamp < bucket.time + 24 * 60 * 60 * 1000,
    ).length
    return { time: bucket.time, count }
  })
}
