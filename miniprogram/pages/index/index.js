const api = require('../../utils/api')
const storage = require('../../utils/storage')

Page({
  data: {
    items: [],
    loading: false,
    error: ''
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
    this.setData({
      items: storage.getContents()
    })
  },
  async handleSync() {
    this.setData({ loading: true, error: '' })
    try {
      await api.ensureAuth()
      const items = await api.syncContents()
      this.setData({ items })
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
