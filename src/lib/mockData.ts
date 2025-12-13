export interface DataPoint {
  id: string
  name: string
  category: string
  community: string
  region: string
  confidence: number
  timestamp: number
  coords: { lat: number; lng: number }
  trajectory: { lat: number; lng: number; t: number }[]
  features: number[]
  projection: { x: number; y: number }
  hierarchyPath: string[]
}

export interface NetworkEdge {
  source: string
  target: string
  weight: number
}

export interface HierarchyNode {
  name: string
  pointIds?: string[]
  children?: HierarchyNode[]
}

export interface InsightDataset {
  points: DataPoint[]
  edges: NetworkEdge[]
  hierarchy: HierarchyNode
  timeBuckets: { time: number; count: number }[]
  meta: {
    regions: string[]
    categories: string[]
    communities: string[]
  }
}

const categories = ['出行异常', '常规出行', '高频地点', '拥堵提醒', '重点关注']
const communities = ['早高峰', '晚高峰', '周末', '节假日']
const regions = ['华北', '华东', '华南', '西南', '东北']

function coordsForRegion(region: string, random: () => number) {
  // 粗略分区，仅保证落在对应大区范围
  const ranges: Record<string, { lat: [number, number]; lng: [number, number] }> = {
    华北: { lat: [38, 42], lng: [110, 118] },
    华东: { lat: [29, 34], lng: [116, 123] },
    华南: { lat: [21, 26], lng: [108, 116] },
    西南: { lat: [24, 31], lng: [100, 107] },
    东北: { lat: [41, 47], lng: [120, 129] },
  }
  const range = ranges[region] ?? { lat: [22, 40], lng: [100, 118] }
  const lat = range.lat[0] + random() * (range.lat[1] - range.lat[0])
  const lng = range.lng[0] + random() * (range.lng[1] - range.lng[0])
  return { lat, lng }
}

function seededRandom(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function pseudoProject(features: number[], random: () => number) {
  // 轻量假降维：使用随机矩阵映射到二维，这里可替换为真实 PCA/UMAP 结果
  const w = Array.from({ length: 2 }, () =>
    Array.from({ length: features.length }, () => random() * 2 - 1),
  )
  const x = w[0].reduce((acc, v, i) => acc + v * features[i], 0)
  const y = w[1].reduce((acc, v, i) => acc + v * features[i], 0)
  return { x, y }
}

export function generateMockData(count = 90, seed = 42): InsightDataset {
  const rand = seededRandom(seed)
  const baseTime = Date.now() - 1000 * 60 * 60 * 24 * 14
  const points: DataPoint[] = []

  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(rand() * categories.length)]
    const community = communities[Math.floor(rand() * communities.length)]
    const region = regions[Math.floor(rand() * regions.length)]
    const timestamp = baseTime + Math.floor(rand() * 1000 * 60 * 60 * 24 * 14)
    // 经纬度范围收敛在中国境内
    const { lat, lng } = coordsForRegion(region, rand)
    const features = Array.from({ length: 6 }, () => rand() * 2 - 1)
    const projection = pseudoProject(features, rand)
    const trajectory = Array.from({ length: 6 }, (_, idx) => ({
      lat: lat + (rand() - 0.5) * 1.5 + idx * 0.05,
      lng: lng + (rand() - 0.5) * 1.5 + idx * 0.05,
      t: timestamp + idx * 60 * 60 * 1000,
    }))

    points.push({
      id: `p-${i + 1}`,
      name: `对象-${i + 1}`,
      category,
      community,
      region,
      confidence: 0.5 + rand() * 0.5,
      timestamp,
      coords: { lat, lng },
      trajectory,
      features,
      projection,
      hierarchyPath: ['全球', region, community, category],
    })
  }

  const edges: NetworkEdge[] = []
  const pointIds = points.map((p) => p.id)
  for (let i = 0; i < count * 1.2; i++) {
    const a = pointIds[Math.floor(rand() * pointIds.length)]
    const b = pointIds[Math.floor(rand() * pointIds.length)]
    if (a !== b) {
      edges.push({
        source: a,
        target: b,
        weight: 0.2 + rand() * 0.8,
      })
    }
  }

  const hierarchy: HierarchyNode = {
    name: '全球',
    children: regions.map((r) => ({
      name: r,
      children: communities.map((c) => ({
        name: c,
        children: categories.map((cat) => ({
          name: cat,
          pointIds: points
            .filter((p) => p.region === r && p.community === c && p.category === cat)
            .map((p) => p.id),
        })),
      })),
    })),
  }

  const timeBuckets: { time: number; count: number }[] = []
  for (let d = 0; d < 14; d++) {
    const time = baseTime + d * 24 * 60 * 60 * 1000
    const countDay = points.filter(
      (p) => p.timestamp >= time && p.timestamp < time + 24 * 60 * 60 * 1000,
    ).length
    timeBuckets.push({ time, count: countDay })
  }

  return {
    points,
    edges,
    hierarchy,
    timeBuckets,
    meta: {
      regions,
      categories,
      communities,
    },
  }
}
