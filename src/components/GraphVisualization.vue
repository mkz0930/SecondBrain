<template>
  <div class="graph-visualization">
    <v-chart
      ref="chartRef"
      :option="chartOption"
      :autoresize="true"
      @click="handleChartClick"
      @dblclick="handleChartDblClick"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  GraphChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent
])

const props = defineProps({
  graphData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['node-click', 'node-dblclick'])

const chartRef = ref(null)

// ECharts 配置
const chartOption = computed(() => {
  if (!props.graphData) return {}

  return {
    title: {
      text: '',
      show: false
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'node') {
          const node = params.data
          if (node.type === 'content') {
            return `
              <div style="padding: 8px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${node.name}</div>
                <div style="font-size: 12px; color: #888;">
                  类型: ${node.data.type}<br/>
                  ${node.data.source ? `来源: ${node.data.source}<br/>` : ''}
                  ${node.data.rating ? `评分: ${'⭐'.repeat(node.data.rating)}<br/>` : ''}
                  标签数: ${node.data.tag_count}
                </div>
              </div>
            `
          } else if (node.type === 'tag') {
            return `
              <div style="padding: 8px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${node.name}</div>
                <div style="font-size: 12px; color: #888;">
                  关联内容: ${node.data.content_count} 个
                </div>
              </div>
            `
          }
        } else if (params.dataType === 'edge') {
          const edge = params.data
          if (edge.type === 'content-content-tag') {
            return `${edge.value} 个共同标签`
          } else if (edge.type === 'content-content-keyword') {
            return `关键词相似度: ${Math.round(edge.value * 100)}%`
          }
        }
        return params.name
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333',
      textStyle: {
        color: '#fff'
      }
    },
    legend: {
      data: props.graphData.categories?.map(c => c.name) || [],
      orient: 'vertical',
      left: 'left',
      top: 'top',
      textStyle: {
        color: getComputedStyle(document.documentElement)
          .getPropertyValue('--color-text')
          .trim() || '#333'
      }
    },
    toolbox: {
      show: true,
      feature: {
        restore: {
          title: '重置'
        },
        saveAsImage: {
          title: '保存为图片',
          pixelRatio: 2
        }
      },
      iconStyle: {
        borderColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--color-text')
          .trim() || '#333'
      }
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: props.graphData.nodes || [],
        links: props.graphData.edges || [],
        categories: props.graphData.categories || [],
        roam: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          fontSize: 12,
          color: getComputedStyle(document.documentElement)
            .getPropertyValue('--color-text')
            .trim() || '#333'
        },
        labelLayout: {
          hideOverlap: true
        },
        emphasis: {
          focus: 'adjacency',
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          },
          lineStyle: {
            width: 3
          }
        },
        force: {
          repulsion: 200,
          gravity: 0.1,
          edgeLength: [50, 150],
          layoutAnimation: true
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        edgeLabel: {
          fontSize: 10,
          show: false
        },
        lineStyle: {
          color: 'source',
          curveness: 0.1
        }
      }
    ],
    animationDuration: 1000,
    animationEasingUpdate: 'quinticInOut'
  }
})

// 处理图表点击
function handleChartClick(params) {
  if (params.dataType === 'node') {
    emit('node-click', params.data)
  }
}

// 处理图表双击
function handleChartDblClick(params) {
  if (params.dataType === 'node') {
    emit('node-dblclick', params.data)
  }
}

// 监听数据变化,重新渲染
watch(() => props.graphData, () => {
  if (chartRef.value) {
    chartRef.value.setOption(chartOption.value, true)
  }
}, { deep: true })

// 响应主题变化
function updateTheme() {
  if (chartRef.value) {
    chartRef.value.setOption(chartOption.value, true)
  }
}

onMounted(() => {
  // 监听主题变化
  const observer = new MutationObserver(updateTheme)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  // 清理
  onUnmounted(() => {
    observer.disconnect()
  })
})
</script>

<style scoped>
.graph-visualization {
  width: 100%;
  height: 100%;
  position: relative;
}

.graph-visualization :deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
}
</style>
