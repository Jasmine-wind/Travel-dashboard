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

const categories = ['异常事件', '巡检轨迹', '流量节点', '告警源', '高价值目标']
const communities = ['Cyan', 'Magenta', 'Lime', 'Amber']
const regions = ['华北', '华东', '华南', '西南', '东北']

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
    const lat = 25 + rand() * 20
    const lng = 103 + rand() * 20
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
