import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { MapContainer, TileLayer, CircleMarker, Polyline } from 'react-leaflet'
import { motion } from 'framer-motion'
import classNames from 'classnames'
import { applyFilters, buildSparkline, filterByTimeRange, linkedSubgraph, stats } from '../lib/linking'
import type { InsightDataset, DataPoint } from '../lib/mockData'

type MapMode = 'points' | 'heat' | 'trajectory'
type NetworkMode = 'graph' | 'list'
type LayoutPreset = 'grid' | 'alt'

interface Props {
  data: InsightDataset
  layout: LayoutPreset
  onExport: (payload: any) => void
}

const cardVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
}

const formatTimeRange = (start: number, end: number) => {
  const fmt = (t: number) => new Date(t).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  return `${fmt(start)} - ${fmt(end)}`
}

function useRenderCost() {
  const [cost, setCost] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = requestAnimationFrame(() => {
      setCost(Math.max(2, Math.round(performance.now() - start)))
    })
    return () => cancelAnimationFrame(id)
  }, [])
  return cost
}

function DetailPanel({ point, spark }: { point?: DataPoint; spark: { time: number; count: number }[] }) {
  if (!point) {
    return (
      <div className="glass view-card neon-border" style={{ minHeight: 180 }}>
        <div className="view-title">详情</div>
        <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
      </div>
    )
  }
  return (
    <div className="glass view-card neon-border" style={{ minHeight: 200 }}>
      <div className="view-title">
        <span>详情 · {point.name}</span>
        <span className="pill">置信度 {point.confidence.toFixed(2)}</span>
      </div>
      <div style={{ display: 'grid', gap: 6, gridTemplateColumns: '1fr 1fr' }}>
        <div className="badge">类型：{point.category}</div>
        <div className="badge">社区：{point.community}</div>
        <div className="badge">区域：{point.region}</div>
        <div className="badge">时间：{new Date(point.timestamp).toLocaleString()}</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>层次路径：{point.hierarchyPath.join(' / ')}</div>
      <div className="sparkline">
            <ReactECharts
              style={{ height: 60 }}
              option={{
                grid: { left: 4, right: 4, top: 8, bottom: 0 },
                xAxis: { type: 'time', show: false },
                yAxis: { type: 'value', show: false },
                series: [
                  {
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    lineStyle: { width: 2, color: '#ff8c42' },
                    areaStyle: { color: 'rgba(255,140,66,0.18)' },
                    data: spark.map((d) => [d.time, d.count]),
                  },
                ],
              }}
            />
      </div>
    </div>
  )
}

export default function InsightDashboard({
  data,
  layout,
  onExport,
}: Props) {
  const [mapMode, setMapMode] = useState<MapMode>('points')
  const [networkMode, setNetworkMode] = useState<NetworkMode>('graph')
  const [minTime, maxTime] = useMemo(() => {
    const times = data.points.map((p) => p.timestamp)
    return [Math.min(...times), Math.max(...times)]
  }, [data.points])
  const [timeRange, setTimeRange] = useState<[number, number]>([minTime, maxTime])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    category: 'all',
    community: 'all',
    region: 'all',
    minConfidence: 0.55,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scatterSelection, setScatterSelection] = useState<Set<string>>(new Set())
  const [networkSelection, setNetworkSelection] = useState<Set<string>>(new Set())
  const renderCost = useRenderCost()

  const filteredBySearch = useMemo(
    () => applyFilters(data.points, { ...filters, search }),
    [data.points, filters, search],
  )
  const timeFiltered = useMemo(
    () => filterByTimeRange(filteredBySearch, timeRange),
    [filteredBySearch, timeRange],
  )
  const activePoints = useMemo(() => {
    if (scatterSelection.size > 0) {
      return timeFiltered.filter((p) => scatterSelection.has(p.id))
    }
    return timeFiltered
  }, [timeFiltered, scatterSelection])

  const activeIds = useMemo(() => new Set(activePoints.map((p) => p.id)), [activePoints])
  const graph = useMemo(() => linkedSubgraph(data.edges, activeIds), [data.edges, activeIds])

  const detail = useMemo(() => {
    if (selectedId) {
      return timeFiltered.find((p) => p.id === selectedId)
    }
    if (activePoints.length > 0) return activePoints[0]
    return undefined
  }, [selectedId, activePoints, timeFiltered])

  const sparkData = useMemo(() => buildSparkline(activePoints, data), [activePoints, data])
  const stat = useMemo(() => stats(activePoints), [activePoints])

  const mapCenter = useMemo(() => {
    if (!activePoints.length) return [30.6, 104.0] as [number, number]
    const lat = activePoints.reduce((acc, p) => acc + p.coords.lat, 0) / activePoints.length
    const lng = activePoints.reduce((acc, p) => acc + p.coords.lng, 0) / activePoints.length
    return [lat, lng] as [number, number]
  }, [activePoints])

  const handleExport = () => {
    onExport({
      filteredPoints: activePoints,
      timeRange,
      filters,
      layout,
    })
  }

  const timeOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 30, bottom: 40 },
      xAxis: {
        type: 'time',
        axisLabel: { color: '#9fb3c8' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9fb3c8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      dataZoom: [
        {
          type: 'slider',
          realtime: false,
          height: 18,
          bottom: 6,
          startValue: timeRange[0],
          endValue: timeRange[1],
          handleStyle: { color: '#5af1ff' },
          borderColor: 'rgba(90,241,255,0.3)',
        },
      ],
      series: [
        {
          type: 'bar',
          barWidth: 10,
          itemStyle: { color: '#4b82f5' },
          data: data.timeBuckets.map((b) => [b.time, b.count]),
        },
        {
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f97316', width: 2, opacity: 0.6 },
          data: data.timeBuckets.map((b) => [b.time, b.count]),
        },
      ],
    }),
    [data.timeBuckets, timeRange],
  )

  const scatterOption = useMemo(() => {
    const selected = scatterSelection
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params: any) => `${params.data.name}<br/>${params.data.category}`,
      },
      xAxis: { type: 'value', axisLabel: { color: '#9fb3c8' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      yAxis: { type: 'value', axisLabel: { color: '#9fb3c8' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      brush: {
        toolbox: ['rect', 'polygon', 'clear'],
        xAxisIndex: 'all',
        brushStyle: { color: 'rgba(90,241,255,0.15)', borderColor: '#5af1ff' },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => 10 + Math.abs(val[0] + val[1]) * 0.3,
          data: timeFiltered.map((p) => ({
            value: [p.projection.x, p.projection.y],
            name: p.name,
            category: p.category,
            id: p.id,
            itemStyle: { color: selected.has(p.id) ? '#f97316' : '#4b82f5' },
          })),
        },
      ],
    }
  }, [timeFiltered, scatterSelection])

  const networkOption = useMemo(() => {
    if (networkMode === 'list') {
      return null
    }
    const nodeLookup = new Map<string, DataPoint>()
    activePoints.forEach((p) => nodeLookup.set(p.id, p))
    const selectedSet = selectedId ? new Set([selectedId]) : networkSelection
    return {
      backgroundColor: 'transparent',
      tooltip: { formatter: (p: any) => `${p.data.name}` },
      animationDuration: 400,
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          force: { repulsion: 60, edgeLength: 80 },
          data: Array.from(graph.nodeIds).map((id) => {
            const p = nodeLookup.get(id)
            const isAnomaly = p?.category === '出行异常'
            const focused = selectedSet.has(id)
            return {
              id,
              name: p?.name ?? id,
              value: p?.confidence ?? 1,
              symbolSize: 10 + (p?.confidence ?? 0.6) * 8,
              itemStyle: { color: focused || isAnomaly ? '#f97316' : '#4b82f5' },
            }
          }),
          edges: graph.edges.map((e) => ({ source: e.source, target: e.target, lineStyle: { width: e.weight * 1.2 } })),
          emphasis: { focus: 'adjacency' },
        },
      ],
    }
  }, [graph, activePoints, networkMode, selectedId, networkSelection, data.hierarchy])

  const handleScatterBrush = (params: any) => {
    const brushed = params.batch?.[0]?.selected?.[0]?.dataIndex ?? []
    const ids = new Set<string>()
    brushed.forEach((idx: number) => {
      const p = timeFiltered[idx]
      if (p) ids.add(p.id)
    })
    setScatterSelection(ids)
  }

  const handleNetworkClick = (params: any) => {
    if (params?.data?.id) {
      setSelectedId(params.data.id)
      setNetworkSelection(new Set([params.data.id]))
    }
  }

  const handleTimeZoom = (params: any) => {
    const start = params.batch?.[0]?.startValue
    const end = params.batch?.[0]?.endValue
    if (typeof start === 'number' && typeof end === 'number') {
      setTimeRange([start, end])
    }
  }

  const mainLayoutClass = classNames('layout-grid', { alt: layout === 'alt' })
  const panelLayoutClass = classNames('layout-panel', { alt: layout === 'alt' })

  const hierarchyList = useMemo(() => {
    const list: { path: string; count: number }[] = []
    const regions = data.meta.regions
    regions.forEach((r) => {
      const regionPoints = activePoints.filter((p) => p.region === r)
      if (regionPoints.length) list.push({ path: r, count: regionPoints.length })
      data.meta.communities.forEach((c) => {
        const commPoints = regionPoints.filter((p) => p.community === c)
        if (commPoints.length) list.push({ path: `${r} / ${c}`, count: commPoints.length })
        data.meta.categories.forEach((cat) => {
          const leaf = commPoints.filter((p) => p.category === cat)
          if (leaf.length) list.push({ path: `${r} / ${c} / ${cat}`, count: leaf.length })
        })
      })
    })
    return list
  }, [activePoints, data.meta.categories, data.meta.communities, data.meta.regions])

  return (
    <div className={classNames('app-shell', 'theme-warm')}>
      <div className={mainLayoutClass}>
        <motion.div
          className="glass view-card neon-border"
          initial="initial"
          animate="animate"
          variants={cardVariants}
          style={{ gridArea: 'header' }}
        >
          <div className="view-title">
            <span>城市出行状况看板</span>
            <div className="controls-row">
              <button className="btn" onClick={() => setShowFilters((v) => !v)}>
                {showFilters ? '收起筛选' : '展开筛选'}
              </button>
              <button className="btn primary" onClick={handleExport}>
                导出当前筛选
              </button>
            </div>
          </div>
          <div className="status-bar">
            <div className="status-chip">
              <span>总量 / 过滤后</span>
              <strong>
                {data.points.length} / {activePoints.length}
              </strong>
            </div>
            <div className="status-chip">
              <span>时间窗口</span>
              <strong>{formatTimeRange(timeRange[0], timeRange[1])}</strong>
            </div>
            <div className="status-chip">
              <span>均值可信度</span>
              <strong>{stat.avgConfidence.toFixed(2)}</strong>
            </div>
            <div className="status-chip">
              <span>区域/分组覆盖</span>
              <strong>
                {stat.regionCount} / {stat.communityCount}
              </strong>
            </div>
            <div className="status-chip">
              <span>渲染耗时(ms)</span>
              <strong>{renderCost}</strong>
            </div>
          </div>
          {showFilters && (
            <div className="controls-row" style={{ alignItems: 'center', marginTop: 6 }}>
              <input
                placeholder="搜索 行程编号/名称/区域"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: '#fff',
                  color: 'inherit',
                }}
              />
              <select
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                className="btn"
              >
                <option value="all">全部类型</option>
                {data.meta.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={filters.community}
                onChange={(e) => setFilters((f) => ({ ...f, community: e.target.value }))}
                className="btn"
              >
                <option value="all">全部分组</option>
                {data.meta.communities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={filters.region}
                onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                className="btn"
              >
                <option value="all">全部区域</option>
                {data.meta.regions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="pill">可信度 ≥ {filters.minConfidence.toFixed(2)}</div>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.01}
                value={filters.minConfidence}
                onChange={(e) => setFilters((f) => ({ ...f, minConfidence: Number(e.target.value) }))}
              />
            </div>
          )}
        </motion.div>

        <motion.div
          className="glass view-card neon-border map-wrapper"
          style={{ gridArea: 'map', minHeight: 560 }}
          variants={cardVariants}
          initial="initial"
          animate="animate"
        >
          <div className="view-title">
            <span>城市地图 · {mapMode === 'points' ? '地点' : mapMode === 'heat' ? '热度' : '轨迹'}</span>
            <div className="controls-row">
              {(['points', 'heat', 'trajectory'] as MapMode[]).map((m) => (
                <button
                  key={m}
                  className={classNames('btn', { primary: mapMode === m })}
                  onClick={() => setMapMode(m)}
                >
                  {m === 'points' ? '点云' : m === 'heat' ? '热力' : '轨迹'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: '100%', minHeight: 560 }}>
            <MapContainer center={mapCenter} zoom={5} scrollWheelZoom className="glass" style={{ height: '560px', borderRadius: 12 }}>
              <TileLayer
                attribution="&copy; Stadia Maps, &copy; OpenMapTiles &copy; OpenStreetMap contributors"
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              />
              {activePoints.map((p) => (
                <CircleMarker
                  key={p.id}
                  center={[p.coords.lat, p.coords.lng]}
                  radius={mapMode === 'heat' ? 18 : 8 + p.confidence * 4}
                  pathOptions={{
                  color: selectedId === p.id || p.category === '出行异常' ? '#f97316' : '#4b82f5',
                  fillColor: mapMode === 'heat' ? 'rgba(249,115,22,0.25)' : '#4b82f5',
                  opacity: 0.9,
                  fillOpacity: mapMode === 'heat' ? 0.35 : 0.6,
                }}
                  eventHandlers={{
                    click: () => setSelectedId(p.id),
                  }}
                />
              ))}
              {mapMode === 'trajectory' &&
                activePoints.slice(0, 40).map((p) => (
                  <Polyline
                    key={`${p.id}-traj`}
                    positions={p.trajectory.map((t) => [t.lat, t.lng])}
                    pathOptions={{ color: 'rgba(139,92,246,0.8)', weight: 2, opacity: 0.6 }}
                  />
                ))}
            </MapContainer>
          </div>
        </motion.div>

        <div className={panelLayoutClass} style={{ gridArea: 'panel' }}>
          <motion.div className="glass view-card neon-border" variants={cardVariants} initial="initial" animate="animate">
            <div className="view-title">
              <span>时间轴</span>
              <span className="pill">拖动过滤 · 建议关注近期峰值</span>
            </div>
            <ReactECharts
              style={{ height: 220 }}
              option={timeOption}
              onEvents={{ dataZoom: handleTimeZoom }}
              notMerge
              lazyUpdate
            />
          </motion.div>

          <motion.div className="glass view-card neon-border" variants={cardVariants} initial="initial" animate="animate">
            <div className="view-title">
              <span>出行特征散点</span>
              <span className="pill">框选 → 地图/关联联动</span>
            </div>
            <ReactECharts
              style={{ height: 240 }}
              option={scatterOption}
              onEvents={{ brushSelected: handleScatterBrush }}
            />
          </motion.div>

          <motion.div className="glass view-card neon-border" variants={cardVariants} initial="initial" animate="animate">
            <div className="view-title">
              <span>关联关系</span>
              <div className="controls-row">
                <button
                  className={classNames('btn', { primary: networkMode === 'graph' })}
                  onClick={() => setNetworkMode('graph')}
                >
                  网络
                </button>
                <button
                  className={classNames('btn', { primary: networkMode === 'list' })}
                  onClick={() => setNetworkMode('list')}
                >
                  层次列表
                </button>
              </div>
            </div>
            {networkMode === 'graph' && networkOption && (
              <ReactECharts style={{ height: 280 }} option={networkOption} onEvents={{ click: handleNetworkClick }} />
            )}
            {networkMode === 'list' && (
              <div style={{ maxHeight: 280, overflow: 'auto', display: 'grid', gap: 8, padding: '6px 4px' }}>
                {hierarchyList.map((h) => (
                  <div key={h.path} className="badge" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{h.path}</span>
                    <strong>{h.count}</strong>
                  </div>
                ))}
                {!hierarchyList.length && <div style={{ opacity: 0.6 }}>当前筛选无数据</div>}
              </div>
            )}
          </motion.div>

          <motion.div className="glass view-card neon-border" variants={cardVariants} initial="initial" animate="animate" style={{ minHeight: 300 }}>
            <DetailPanel point={detail} spark={sparkData} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
