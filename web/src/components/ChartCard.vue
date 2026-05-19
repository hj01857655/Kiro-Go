<template>
  <div class="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 transition-all duration-300">
    <div class="mb-4">
      <h4 class="text-base font-semibold text-[var(--text-primary)] mb-1">{{ title }}</h4>
      <span v-if="subtitle" class="text-xs text-[var(--text-secondary)]">{{ subtitle }}</span>
    </div>

    <!-- Line Chart -->
    <div v-if="type === 'line'" class="relative">
      <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-auto block">
        <!-- Grid lines -->
        <g class="grid">
          <line
            v-for="i in 5"
            :key="`h-${i}`"
            :x1="padding"
            :y1="padding + (height - padding * 2) * (i - 1) / 4"
            :x2="width - padding"
            :y2="padding + (height - padding * 2) * (i - 1) / 4"
            class="grid-line"
          />
        </g>

        <!-- Line path -->
        <path
          :d="linePath"
          class="line-path"
          fill="none"
          :stroke="color"
          stroke-width="2"
        />

        <!-- Area fill -->
        <path
          v-if="showArea"
          :d="areaPath"
          class="area-path"
          :fill="`url(#gradient-${chartId})`"
        />

        <!-- Data points -->
        <circle
          v-for="(point, idx) in points"
          :key="idx"
          :cx="point.x"
          :cy="point.y"
          r="4"
          :fill="color"
          class="data-point"
        >
          <title>{{ point.label }}: {{ point.value }}</title>
        </circle>

        <!-- Gradient definition -->
        <defs>
          <linearGradient :id="`gradient-${chartId}`" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
            <stop offset="100%" :stop-color="color" stop-opacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      <!-- Labels -->
      <div class="flex justify-between mt-2 px-5">
        <span v-for="(label, idx) in labels" :key="idx" class="text-[11px] text-[var(--text-secondary)]">
          {{ label }}
        </span>
      </div>
    </div>

    <!-- Bar Chart -->
    <div v-else-if="type === 'bar'" class="relative">
      <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-auto block">
        <!-- Bars -->
        <g class="bars">
          <rect
            v-for="(bar, idx) in bars"
            :key="idx"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill="bar.color || color"
            class="bar-rect"
            rx="4"
          >
            <title>{{ bar.label }}: {{ bar.value }}</title>
          </rect>
        </g>

        <!-- Values on top -->
        <text
          v-for="(bar, idx) in bars"
          :key="`text-${idx}`"
          :x="bar.x + bar.width / 2"
          :y="bar.y - 5"
          text-anchor="middle"
          class="bar-value"
        >
          {{ bar.value }}
        </text>
      </svg>

      <!-- Labels -->
      <div class="flex justify-between mt-2 px-5">
        <span v-for="(label, idx) in labels" :key="idx" class="text-[11px] text-[var(--text-secondary)]">
          {{ label }}
        </span>
      </div>
    </div>

    <!-- Donut Chart -->
    <div v-else-if="type === 'donut'" class="relative flex gap-5 items-center md:flex-row flex-col">
      <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-auto block flex-shrink-0 flex-basis-[200px] md:flex-basis-[200px] md:w-[200px]">
        <g :transform="`translate(${width / 2}, ${height / 2})`">
          <!-- Donut segments -->
          <path
            v-for="(segment, idx) in segments"
            :key="idx"
            :d="segment.path"
            :fill="segment.color"
            class="donut-segment"
          >
            <title>{{ segment.label }}: {{ segment.value }} ({{ segment.percentage }}%)</title>
          </path>

          <!-- Center text -->
          <text text-anchor="middle" dy="0.3em" class="donut-center-text">
            {{ centerText }}
          </text>
        </g>
      </svg>

      <!-- Legend -->
      <div class="flex-1 flex flex-col gap-2">
        <div v-for="(item, idx) in legendItems" :key="idx" class="flex items-center gap-2 text-[13px]">
          <span class="w-3 h-3 rounded flex-shrink-0" :style="{ backgroundColor: item.color }"></span>
          <span class="flex-1 text-[var(--text-primary)]">{{ item.label }}</span>
          <span class="font-semibold text-[var(--text-secondary)]">{{ item.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'line',
    validator: (value) => ['line', 'bar', 'donut'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  subtitle: String,
  data: {
    type: Array,
    required: true
  },
  labels: Array,
  color: {
    type: String,
    default: '#7c3aed'
  },
  showArea: {
    type: Boolean,
    default: true
  },
  width: {
    type: Number,
    default: 400
  },
  height: {
    type: Number,
    default: 200
  }
})

const chartId = ref(`chart-${Math.random().toString(36).substr(2, 9)}`)
const padding = 20

// Line chart calculations
const points = computed(() => {
  if (props.type !== 'line') return []

  const maxValue = Math.max(...props.data.map(d => d.value || d))
  const minValue = Math.min(...props.data.map(d => d.value || d))
  const range = maxValue - minValue || 1

  const chartWidth = props.width - padding * 2
  const chartHeight = props.height - padding * 2
  const stepX = chartWidth / (props.data.length - 1 || 1)

  return props.data.map((d, idx) => {
    const value = d.value !== undefined ? d.value : d
    const x = padding + idx * stepX
    const y = props.height - padding - ((value - minValue) / range) * chartHeight
    return {
      x,
      y,
      value,
      label: d.label || props.labels?.[idx] || `Point ${idx + 1}`
    }
  })
})

const linePath = computed(() => {
  if (points.value.length === 0) return ''
  return points.value.map((p, idx) =>
    `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')
})

const areaPath = computed(() => {
  if (points.value.length === 0) return ''
  const path = linePath.value
  const firstPoint = points.value[0]
  const lastPoint = points.value[points.value.length - 1]
  return `${path} L ${lastPoint.x} ${props.height - padding} L ${firstPoint.x} ${props.height - padding} Z`
})

// Bar chart calculations
const bars = computed(() => {
  if (props.type !== 'bar') return []

  const maxValue = Math.max(...props.data.map(d => d.value || d))
  const chartWidth = props.width - padding * 2
  const chartHeight = props.height - padding * 2
  const barWidth = chartWidth / props.data.length * 0.7
  const gap = chartWidth / props.data.length * 0.3

  return props.data.map((d, idx) => {
    const value = d.value !== undefined ? d.value : d
    const height = (value / maxValue) * chartHeight
    const x = padding + idx * (barWidth + gap) + gap / 2
    const y = props.height - padding - height

    return {
      x,
      y,
      width: barWidth,
      height,
      value,
      label: d.label || props.labels?.[idx] || `Bar ${idx + 1}`,
      color: d.color
    }
  })
})

// Donut chart calculations
const segments = computed(() => {
  if (props.type !== 'donut') return []

  const total = props.data.reduce((sum, d) => sum + (d.value || d), 0)
  const radius = Math.min(props.width, props.height) / 2 - padding
  const innerRadius = radius * 0.6

  let currentAngle = -Math.PI / 2

  return props.data.map((d, idx) => {
    const value = d.value !== undefined ? d.value : d
    const percentage = ((value / total) * 100).toFixed(1)
    const angle = (value / total) * 2 * Math.PI

    const startX = Math.cos(currentAngle) * radius
    const startY = Math.sin(currentAngle) * radius
    const endX = Math.cos(currentAngle + angle) * radius
    const endY = Math.sin(currentAngle + angle) * radius

    const innerStartX = Math.cos(currentAngle) * innerRadius
    const innerStartY = Math.sin(currentAngle) * innerRadius
    const innerEndX = Math.cos(currentAngle + angle) * innerRadius
    const innerEndY = Math.sin(currentAngle + angle) * innerRadius

    const largeArc = angle > Math.PI ? 1 : 0

    const path = [
      `M ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
      `L ${innerEndX} ${innerEndY}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
      'Z'
    ].join(' ')

    currentAngle += angle

    return {
      path,
      value,
      percentage,
      label: d.label || props.labels?.[idx] || `Segment ${idx + 1}`,
      color: d.color || props.color
    }
  })
})

const legendItems = computed(() => {
  if (props.type !== 'donut') return []
  return segments.value.map(s => ({
    label: s.label,
    value: `${s.percentage}%`,
    color: s.color
  }))
})

const centerText = computed(() => {
  if (props.type !== 'donut') return ''
  const total = props.data.reduce((sum, d) => sum + (d.value || d), 0)
  return total.toString()
})
</script>

<style scoped>
/* SVG-specific styles that can't be expressed as utility classes */
.grid-line {
  stroke: var(--border-color);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.line-path {
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.3s ease;
}

.area-path {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.data-point {
  cursor: pointer;
  transition: all 0.2s ease;
}

.data-point:hover {
  r: 6;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.bar-rect {
  cursor: pointer;
  transition: all 0.2s ease;
}

.bar-rect:hover {
  opacity: 0.8;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.bar-value {
  font-size: 12px;
  fill: var(--text-secondary);
  font-weight: 500;
}

.donut-segment {
  cursor: pointer;
  transition: all 0.2s ease;
}

.donut-segment:hover {
  opacity: 0.8;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.donut-center-text {
  font-size: 24px;
  font-weight: 700;
  fill: var(--text-primary);
}
</style>
