const api = require('../../utils/api')
const storage = require('../../utils/storage')

const USE_MOCK = true
const MOCK_ITEMS = [
  {
    id: 'mock-1',
    title: 'Weekly review',
    type: 'note',
    content: 'Plan next sprint, review progress, and capture key decisions.',
    updated_at: '2024-09-18T10:24:00.000Z'
  },
  {
    id: 'mock-2',
    title: 'Reading list',
    type: 'link',
    content: 'Atomic Habits, Build, and Refactoring UI bookmarks.',
    updated_at: '2024-09-16T14:05:00.000Z'
  },
  {
    id: 'mock-3',
    title: 'Meeting notes',
    type: 'note',
    content: 'New API proposal, risks, and rollout timeline.',
    updated_at: '2024-09-12T09:40:00.000Z'
  }
]

Page({
  data: {
    items: [],
    loading: false,
    error: '',
    lastSyncAt: ''
  },
  onShow() {
    this.loadFromCache()
  },
  onPullDownRefresh() {
    this.handleSync().finally(() => {
      wx.stopPullDownRefresh()
    })
  },
  loadFromCache() {
    const cached = storage.getContents()
    if (USE_MOCK && (!Array.isArray(cached) || cached.length === 0)) {
      this.setData({
        items: MOCK_ITEMS,
        lastSyncAt: formatSyncTime(new Date().toISOString())
      })
      return
    }
    this.setData({
      items: cached,
      lastSyncAt: formatSyncTime(storage.getLastSyncAt())
    })
  },
  async handleSync() {
    this.setData({ loading: true, error: '' })
    try {
      await api.ensureAuth()
      const items = await api.syncContents()
      this.setData({
        items,
        lastSyncAt: formatSyncTime(storage.getLastSyncAt())
      })
    } catch (error) {
      this.setData({ error: error.message || 'Sync failed' })
    } finally {
      this.setData({ loading: false })
    }
  },
  onTapSync() {
    this.handleSync()
  }
})

function formatSyncTime(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const pad = (num) => (num < 10 ? `0${num}` : `${num}`)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
