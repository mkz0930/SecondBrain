<template>
  <div class="knowledge-graph">
    <div class="graph-container" ref="graphContainer">
      <svg ref="svgElement" class="graph-svg">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
          </marker>
        </defs>
        <g class="links-group">
          <line
            v-for="(edge, index) in edges"
            :key="`edge-${index}`"
            :x1="getNodePosition(edge.from).x"
            :y1="getNodePosition(edge.from).y"
            :x2="getNodePosition(edge.to).x"
            :y2="getNodePosition(edge.to).y"
            :class="['edge', `edge-${edge.type}`]"
            :stroke-width="edge.strength * 3"
            marker-end="url(#arrowhead)"
          />
        </g>
        <g class="nodes-group">
          <g
            v-for="node in nodes"
            :key="node.id"
            :transform="`translate(${node.x}, ${node.y})`"
            class="node"
            @mousedown="startDrag(node, $event)"
            @mouseenter="hoveredNode = node"
            @mouseleave="hoveredNode = null">
            <circle
              :r="getNodeRadius(node)"
              :class="['node-circle', `node-${node.type}`]"
              :fill="getNodeColor(node)"
            />
            <text
              class="node-label"
              text-anchor="middle"
              dy="0.3em">
              {{ truncateLabel(node.label) }}
            </text>
          </g>
        </g>
      </svg>

      <!-- 节点信息面板 -->
      <div
        v-if="hoveredNode"
        class="node-info-panel"
        :style="{ left: hoveredNode.x + 'px', top: (hoveredNode.y - 80) + 'px' }">
        <h4>{{ hoveredNode.label }}</h4>
        <div class="info-item">
          <strong>类型：</strong>{{ getTypeName(hoveredNode.type) }}
        </div>
        <div class="info-item" v-if="hoveredNode.relevance">
          <strong>相关度：</strong>{{ (hoveredNode.relevance * 100).toFixed(0) }}%
        </div>
        <div class="info-content">
          {{ hoveredNode.content }}
        </div>
      </div>
    </div>

    <div class="graph-controls">
      <button class="control-btn" @click="resetView" title="重置视图">
        🔄
      </button>
      <button class="control-btn" @click="zoomIn" title="放大">
        ➕
      </button>
      <button class="control-btn" @click="zoomOut" title="缩小">
        ➖
      </button>
    </div>

    <div class="graph-legend">
      <div class="legend-item">
        <span class="legend-color" style="background: #3b82f6;"></span>
        <span>本地内容</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: #8b5cf6;"></span>
        <span>网络资源</span>
      </div>
      <div class="legend-item">
        <span class="legend-line similarity"></span>
        <span>相似关系</span>
      </div>
      <div class="legend-item">
        <span class="legend-line reference"></span>
        <span>引用关系</span>
      </div>
      <div class="legend-item">
        <span class="legend-line complement"></span>
        <span>互补关系</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({ nodes: [], edges: [] })
  }
})

const graphContainer = ref(null)
const svgElement = ref(null)
const hoveredNode = ref(null)
const draggedNode = ref(null)
const isDragging = ref(false)
const zoom = ref(1)

const nodes = ref([])
const edges = ref([])

const containerWidth = ref(800)
const containerHeight = ref(600)

onMounted(() => {
  updateContainerSize()
  window.addEventListener('resize', updateContainerSize)
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', stopDrag)

  initializeGraph()
})

watch(() => props.data, () => {
  initializeGraph()
}, { deep: true })

function updateContainerSize() {
  if (graphContainer.value) {
    containerWidth.value = graphContainer.value.clientWidth
    containerHeight.value = graphContainer.value.clientHeight
  }
}

function initializeGraph() {
  if (!props.data || !props.data.nodes) return

  // 使用力导向布局算法初始化节点位置
  const nodeCount = props.data.nodes.length
  if (nodeCount === 0) return

  // 圆形布局
  const centerX = containerWidth.value / 2
  const centerY = containerHeight.value / 2
  const radius = Math.min(containerWidth.value, containerHeight.value) * 0.35

  nodes.value = props.data.nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodeCount
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })

  edges.value = props.data.edges || []

  // 运行简单的力导向算法优化布局
  runForceSimulation()
}

function runForceSimulation() {
  const iterations = 50
  const repulsionStrength = 5000
  const attractionStrength = 0.01
  const damping = 0.8

  for (let iter = 0; iter < iterations; iter++) {
    // 计算节点之间的排斥力
    for (let i = 0; i < nodes.value.length; i++) {
      let fx = 0, fy = 0

      for (let j = 0; j < nodes.value.length; j++) {
        if (i === j) continue

        const dx = nodes.value[i].x - nodes.value[j].x
        const dy = nodes.value[i].y - nodes.value[j].y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const force = repulsionStrength / (distance * distance)
        fx += (dx / distance) * force
        fy += (dy / distance) * force
      }

      // 计算边的吸引力
      edges.value.forEach(edge => {
        if (edge.from === nodes.value[i].id) {
          const target = nodes.value.find(n => n.id === edge.to)
          if (target) {
            const dx = target.x - nodes.value[i].x
            const dy = target.y - nodes.value[i].y
            fx += dx * attractionStrength
            fy += dy * attractionStrength
          }
        }
        if (edge.to === nodes.value[i].id) {
          const source = nodes.value.find(n => n.id === edge.from)
          if (source) {
            const dx = source.x - nodes.value[i].x
            const dy = source.y - nodes.value[i].y
            fx += dx * attractionStrength
            fy += dy * attractionStrength
          }
        }
      })

      // 应用力并限制在容器内
      nodes.value[i].x += fx * damping
      nodes.value[i].y += fy * damping

      const margin = 50
      nodes.value[i].x = Math.max(margin, Math.min(containerWidth.value - margin, nodes.value[i].x))
      nodes.value[i].y = Math.max(margin, Math.min(containerHeight.value - margin, nodes.value[i].y))
    }
  }
}

function getNodePosition(nodeId) {
  const node = nodes.value.find(n => n.id === nodeId)
  return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
}

function getNodeRadius(node) {
  const baseRadius = 30
  const relevanceBonus = (node.relevance || 0.5) * 20
  return baseRadius + relevanceBonus
}

function getNodeColor(node) {
  const colors = {
    local: '#3b82f6',
    network: '#8b5cf6',
    file: '#10b981'
  }
  return colors[node.type] || '#64748b'
}

function truncateLabel(label) {
  return label.length > 20 ? label.substring(0, 20) + '...' : label
}

function getTypeName(type) {
  const names = {
    local: '本地内容',
    network: '网络资源',
    file: '文件'
  }
  return names[type] || type
}

function startDrag(node, event) {
  draggedNode.value = node
  isDragging.value = true
  event.preventDefault()
}

function handleDrag(event) {
  if (!isDragging.value || !draggedNode.value) return

  const rect = graphContainer.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  draggedNode.value.x = Math.max(50, Math.min(containerWidth.value - 50, x))
  draggedNode.value.y = Math.max(50, Math.min(containerHeight.value - 50, y))
}

function stopDrag() {
  isDragging.value = false
  draggedNode.value = null
}

function resetView() {
  zoom.value = 1
  initializeGraph()
}

function zoomIn() {
  zoom.value = Math.min(zoom.value * 1.2, 3)
}

function zoomOut() {
  zoom.value = Math.max(zoom.value / 1.2, 0.5)
}
</script>

<style scoped>
.knowledge-graph {
  width: 100%;
  height: 100%;
  position: relative;
  background: var(--bg-body);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.graph-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.graph-svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-svg:active {
  cursor: grabbing;
}

.edge {
  stroke: #64748b;
  stroke-opacity: 0.6;
  transition: stroke-opacity 0.2s;
}

.edge:hover {
  stroke-opacity: 1;
}

.edge-similarity {
  stroke: #3b82f6;
  stroke-dasharray: none;
}

.edge-reference {
  stroke: #10b981;
  stroke-dasharray: 5, 5;
}

.edge-complement {
  stroke: #f59e0b;
  stroke-dasharray: 2, 2;
}

.node {
  cursor: pointer;
  transition: transform 0.2s;
}

.node:hover {
  transform: scale(1.1);
}

.node-circle {
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 2;
  transition: all 0.2s;
}

.node:hover .node-circle {
  stroke: rgba(255, 255, 255, 0.8);
  stroke-width: 3;
  filter: drop-shadow(0 0 10px currentColor);
}

.node-label {
  fill: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  text-shadow: 0 0 4px var(--bg-body), 0 0 4px var(--bg-body);
}

.node-info-panel {
  position: absolute;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  max-width: 250px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 10;
  transform: translateX(-50%);
}

.node-info-panel h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.info-item {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.info-item strong {
  color: var(--text-primary);
}

.info-content {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  line-height: 1.4;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.graph-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-btn {
  width: 40px;
  height: 40px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-primary);
  transform: scale(1.05);
}

.graph-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.legend-line {
  width: 24px;
  height: 2px;
  background: #64748b;
}

.legend-line.similarity {
  background: #3b82f6;
}

.legend-line.reference {
  background: #10b981;
}

.legend-line.complement {
  background: #f59e0b;
}
</style>
