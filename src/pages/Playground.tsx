import { useEffect, useState } from 'react'
import InsightDashboard from '../components/InsightDashboard'
import type { InsightDataset } from '../lib/mockData'
import { generateMockData } from '../lib/mockData'

export default function Playground() {
  const [data, setData] = useState<InsightDataset | null>(null)
  const [layout, setLayout] = useState<'grid' | 'alt'>('grid')
  const [loading, setLoading] = useState(true)

  const regenerate = (seed?: number) => {
    setLoading(true)
    setTimeout(() => {
      setData(generateMockData(110, seed ?? Math.floor(Math.random() * 1000 + 1)))
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
          重新生成数据
        </button>
        <button className="btn" onClick={() => regenerate(42)}>
          重置到固定种子
        </button>
        <button className="btn" onClick={() => setLayout((l) => (l === 'grid' ? 'alt' : 'grid'))}>
          切换布局预设
        </button>
      </div>
      <InsightDashboard
        data={data}
        layout={layout}
        onLayoutChange={setLayout}
        onExport={handleExport}
      />
    </div>
  )
}
