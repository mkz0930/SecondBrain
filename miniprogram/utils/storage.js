const KEYS = {
  token: 'sb_token',
  userId: 'sb_user_id',
  contents: 'sb_contents',
  lastSync: 'sb_last_sync_at'
}

function getToken() {
  return wx.getStorageSync(KEYS.token) || ''
}

function setToken(token) {
  wx.setStorageSync(KEYS.token, token || '')
}

function getUserId() {
  return wx.getStorageSync(KEYS.userId) || ''
}

function setUserId(userId) {
  wx.setStorageSync(KEYS.userId, userId || '')
}

function getContents() {
  return wx.getStorageSync(KEYS.contents) || []
}

function setContents(contents) {
  wx.setStorageSync(KEYS.contents, contents || [])
}

function getLastSyncAt() {
  return wx.getStorageSync(KEYS.lastSync) || ''
}

function setLastSyncAt(value) {
  wx.setStorageSync(KEYS.lastSync, value || '')
}

module.exports = {
  getToken,
  setToken,
  getUserId,
  setUserId,
  getContents,
  setContents,
  getLastSyncAt,
  setLastSyncAt
}
