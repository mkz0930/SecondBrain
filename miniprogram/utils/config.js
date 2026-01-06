function getBaseUrl() {
  return wx.getStorageSync('sb_api_base') || 'http://localhost:3000'
}

function setBaseUrl(url) {
  if (url) {
    wx.setStorageSync('sb_api_base', url)
  }
}

module.exports = {
  getBaseUrl,
  setBaseUrl
}
