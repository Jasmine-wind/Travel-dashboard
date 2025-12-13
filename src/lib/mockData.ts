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
  // 采用“城市锚点 + 抖动”的轻量方案，尽量避免落在海里
  //（真实项目可替换为行政区面 + point-in-polygon 采样）
  const anchors: Record<string, { lat: number; lng: number }[]> = {
    华北: [
      { lat: 39.9042, lng: 116.4074 }, // 北京
      { lat: 38.0428, lng: 114.5149 }, // 石家庄
      { lat: 37.8706, lng: 112.5489 }, // 太原
      { lat: 36.6512, lng: 117.1201 }, // 济南(偏北)
    ],
    华东: [
      { lat: 31.2304, lng: 121.4737 }, // 上海
      { lat: 30.2741, lng: 120.1551 }, // 杭州
      { lat: 32.0603, lng: 118.7969 }, // 南京
      { lat: 31.2989, lng: 120.5853 }, // 苏州
    ],
    华南: [
      { lat: 23.1291, lng: 113.2644 }, // 广州
      { lat: 22.5431, lng: 114.0579 }, // 深圳
      { lat: 22.8199, lng: 108.3200 }, // 南宁
      { lat: 28.2282, lng: 112.9388 }, // 长沙(内陆，避免海上)
    ],
    西南: [
      { lat: 30.5728, lng: 104.0668 }, // 成都
      { lat: 29.5630, lng: 106.5516 }, // 重庆
      { lat: 25.0389, lng: 102.7183 }, // 昆明
      { lat: 26.6470, lng: 106.6302 }, // 贵阳
    ],
    东北: [
      { lat: 45.8038, lng: 126.5349 }, // 哈尔滨
      { lat: 41.8057, lng: 123.4315 }, // 沈阳
      { lat: 43.8171, lng: 125.3235 }, // 长春
      { lat: 46.8138, lng: 130.3650 }, // 佳木斯
    ],
  }

  const list = anchors[region] ?? anchors.华北
  const anchor = list[Math.floor(random() * list.length)]
  const jitterLat = (random() - 0.5) * 3.0
  const jitterLng = (random() - 0.5) * 3.2
  const lat = anchor.lat + jitterLat
  const lng = anchor.lng + jitterLng
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
