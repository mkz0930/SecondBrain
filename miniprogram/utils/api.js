const storage = require('./storage')
const config = require('./config')

function buildUrl(path, query) {
  const base = config.getBaseUrl()
  if (!query) {
    return `${base}${path}`
  }
  const parts = []
  Object.keys(query).forEach((key) => {
    const value = query[key]
    if (value === undefined || value === null || value === '') {
      return
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  })
  if (parts.length === 0) {
    return `${base}${path}`
  }
  return `${base}${path}?${parts.join('&')}`
}

function request(path, method, data, options = {}) {
  const token = storage.getToken()
  const header = {}
  if (!options.withoutAuth && token) {
    header.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(path, options.query),
      method: method || 'GET',
      data: data || undefined,
      header,
      success: (res) => {
        const status = res.statusCode
        if (status >= 200 && status < 300) {
          resolve(res.data)
        } else {
          const message = res.data && res.data.error ? res.data.error : `Request failed (${status})`
          reject(new Error(message))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

function requestNoAuth(path, method, data, options = {}) {
  return request(path, method, data, { ...options, withoutAuth: true })
}

function getLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('No login code'))
        }
      },
      fail: reject
    })
  })
}

async function ensureAuth() {
  const token = storage.getToken()
  if (token) {
    return token
  }
  const code = await getLoginCode()
  const result = await requestNoAuth('/api/auth/wechat', 'POST', { code })
  storage.setToken(result.token)
  storage.setUserId(result.user_id)
  return result.token
}

function mergeContents(current, updates) {
  const map = new Map()
  current.forEach((item) => {
    map.set(item.id, item)
  })
  updates.forEach((item) => {
    if (item.deleted_at) {
      map.delete(item.id)
    } else {
      map.set(item.id, item)
    }
  })
  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
    return bTime - aTime
  })
}

async function syncContents() {
  const lastSyncAt = storage.getLastSyncAt()
  const limit = 100
  let page = 1
  let updates = []

  while (true) {
    const response = await request('/api/contents', 'GET', null, {
      query: {
        updated_since: lastSyncAt,
        include_deleted: true,
        limit,
        page
      }
    })

    const items = response.data || []
    updates = updates.concat(items)

    if (items.length < limit) {
      break
    }
    page += 1
  }

  const merged = mergeContents(storage.getContents(), updates)
  storage.setContents(merged)
  storage.setLastSyncAt(new Date().toISOString())
  return merged
}

function listContents() {
  return storage.getContents()
}

module.exports = {
  ensureAuth,
  syncContents,
  listContents
}
