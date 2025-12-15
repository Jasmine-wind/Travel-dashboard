# Travel Dashboard

> 面向“城市出行安全洞察”的高保真交互式看板，通过多源数据联动、地图 + 网络分析和导出共享能力，帮助安全/运营团队验证策略与汇报洞察。

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## 视觉预览

<p align="center">
  <img src="public/screenshot-2025-12-15_15-10-53.png" alt="Travel Dashboard 预览" width="760" />
</p>
<p align="center">
  <sub>时间轴、地图、网络关系与统计指标同屏联动，可快速定位异常出行模式。</sub>
</p>

## 功能亮点

- **多画布联动**：时间序列、散点投影、网络关系和地图轨迹同屏展示，可在 `MapMode`、`NetworkMode` 间无缝切换。
- **多维筛选**：区域/人群/类型/置信度/关键词/时间轴联动过滤，支持散点框选聚焦局部异常。
- **智能详情面板**：点击任意节点即可查看层次路径、指标 pill 与迷你 Sparkline，一体化完成场景复盘。
- **导出/快照流程**：Playground 提供“刷新今日”“同步快照”复现运维场景，并能一键导出 JSON 复用分析结果。
- **灵活数据层**：通过 `generateMockData` 以及标准化 `InsightDataset` 接口，可快速对接真实轨迹或报警信号。

## 快速开始

```bash
# 1. 安装依赖（推荐 Node.js >= 18）
npm install

# 2. 启动开发服务器
npm run dev

# 3. 生产构建与预览
npm run build
npm run preview
```

> 支持 `pnpm` / `yarn`，替换命令即可。

## 技术栈

| Layer | Stack |
| --- | --- |
| 前端框架 | React 19 + TypeScript + Vite |
| 可视化 | ECharts 6、react-leaflet、Leaflet、framer-motion |
| 状态/逻辑 | React Hooks、自定义 `useRenderCost`、条件筛选与图查询工具 `linking.ts` |
| 设计语言 | 玻璃拟态 + 霓虹主题，搭配 `classnames` 动态样式 |

## 目录结构

```
.
|-- public/            # 静态资源
|-- src/
|   |-- components/
|   |   `-- InsightDashboard.tsx   # 核心仪表盘组件
|   |-- pages/
|   |   `-- Playground.tsx         # 演示页 + 数据刷新/导出入口
|   |-- lib/
|   |   |-- mockData.ts            # 数据接口定义与模拟生成器
|   |   `-- linking.ts             # 筛选、联动和统计工具函数
|   |-- App.tsx / main.tsx         # App Shell
|-- vite.config.ts
`-- package.json
```

## 核心模块

- `InsightDashboard`：封装地图（点/热力/轨迹）、网络关系和图表面板，并管理筛选状态、拖拽缩放与导出。
- `Playground`：示例入口，使用 `generateMockData` 参数化生成 14 天滑窗数据并展示加载骨架屏。
- `linking.ts`：实现查询、时间段过滤、子图提取、统计指标与 Sparkline 数据转换。
- `mockData.ts`：给出 `InsightDataset`、`DataPoint` 等接口以及可替换的 mock 生成逻辑（含区域锚点、轨迹与层级树）。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器（含 HMR） |
| `npm run build` | TypeScript 预构建 + Vite 产物输出到 `dist/` |
| `npm run preview` | 使用本地静态服务器验证生产构建 |
| `npm run lint` | 运行 ESLint，含 React/TypeScript 推荐规则 |

## 数据与可扩展性

- Mock 数据聚焦国内五大区域、四类客群和五种出行类型，可通过 `generateMockData(count, seed)` 自定义样本规模与随机种子。
- 地图支持替换为真实地理围栏，只需在 `coords`/`trajectory` 中写入真实坐标，或改写 `coordsForRegion`。
- 网络关系、层级树、时间桶等均来自 `InsightDataset`，在接入真实 API 时复用接口即可。

## 路线图

1. 接入真实轨迹/告警数据，并提供 WebSocket 增量更新。
2. 补充热力层 + 点密度渲染，强化地图态势表现。
3. 输出分享链接与权限控制，便于运营/安全团队协作。

---
