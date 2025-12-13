import { useEffect, useState } from 'react'
import InsightDashboard from '../components/InsightDashboard'
import type { InsightDataset } from '../lib/mockData'
import { generateMockData } from '../lib/mockData'

export default function Playground() {
  const [data, setData] = useState<InsightDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const layout: 'grid' | 'alt' = 'alt'

  const regenerate = (seed?: number) => {
    setLoading(true)
    setTimeout(() => {
      const seedValue = seed ?? Math.floor(Math.random() * 1000 + 1)
      setData(generateMockData(110, seedValue))
      console.info('仪表盘数据刷新，来源：城市出行日常监测；模拟种子', seedValue)
      setLoading(false)
    }, 320)
  }

  useEffect(() => {
    regenerate(42)
  }, [])

  const handleExport = (payload: any) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'insight-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!data || loading) {
    return (
      <div className="app-shell theme-neon">
        <div className="glass view-card neon-border" style={{ padding: 18 }}>
          <div className="view-title">
            <span>城市出行安全洞察台</span>
            <span className="pill">加载中</span>
          </div>
          <div className="skeleton" style={{ height: 32, borderRadius: 10, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell theme-neon">
      <div className="controls-row" style={{ marginBottom: 10 }}>
        <button className="btn primary" onClick={() => regenerate()}>
          刷新今日数据
        </button>
        <button className="btn" onClick={() => regenerate(42)}>
          同步至昨日快照
        </button>
      </div>
      <InsightDashboard
        data={data}
        layout={layout}
        onExport={handleExport}
      />
    </div>
  )
}
