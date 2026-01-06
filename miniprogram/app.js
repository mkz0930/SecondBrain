const api = require('./utils/api')

App({
  onLaunch() {
    this.bootstrap()
  },
  async bootstrap() {
    try {
      await api.ensureAuth()
      await api.syncContents()
    } catch (error) {
      console.warn('Bootstrap failed', error)
    }
  }
})
