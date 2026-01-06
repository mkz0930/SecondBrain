import { ensureDefaultUser, getUserByToken } from '../models/users.js'

function extractToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim()
  }
  const alt = req.headers['x-session-token']
  if (alt) {
    return String(alt).trim()
  }
  return ''
}

export async function requireUser(req, res, next) {
  try {
    const token = extractToken(req)
    let user = null
    if (token) {
      user = await getUserByToken(token)
    }
    if (!user && process.env.DISABLE_ANON !== 'true') {
      user = await ensureDefaultUser()
    }
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    req.user = user
    return next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({ error: error.message })
  }
}
