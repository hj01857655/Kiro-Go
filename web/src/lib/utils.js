import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      textArea.remove()
      return Promise.resolve()
    } catch (error) {
      textArea.remove()
      return Promise.reject(error)
    }
  }
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function exportToJSON(data, filename) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 解析上游可能返回的两种时间戳格式：
 *   - Unix 秒(数字或数字字符串),如 1779362007.859  ← Free 账号 / nextDateReset(部分)
 *   - ISO 8601 字符串,如 "2026-01-31T06:52:04.970000+00:00"  ← Enterprise / KIRO PRO
 *
 * 同一字段(freeTrialExpiry / nextDateReset)上游会按账号类型给不同格式,
 * 用 `new Date(Number(x) * 1000)` 单一处理 ISO 字符串会得到 Invalid Date。
 *
 * @param {string|number|null|undefined} value 上游原始值
 * @returns {Date|null} 解析失败返回 null，调用方决定如何降级显示
 */
export function parseUpstreamDate(value) {
  if (value === null || value === undefined || value === '') return null

  // 数字 或 纯数字字符串 → Unix 秒
  if (typeof value === 'number') {
    const d = new Date(value * 1000)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string') {
    // 纯数字(可带小数/科学计数) → Unix 秒
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
      const d = new Date(Number(value) * 1000)
      return isNaN(d.getTime()) ? null : d
    }
    // 否则按 ISO 字符串解析
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
