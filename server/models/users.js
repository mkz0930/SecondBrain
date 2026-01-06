import { queryOne, run } from './database.js'

const DEFAULT_OPENID = process.env.DEFAULT_USER_OPENID || 'local-default'

export async function ensureDefaultUser() {
  let user = await queryOne('SELECT id, openid FROM users WHERE openid = ?', [DEFAULT_OPENID])
  if (!user) {
    const result = await run('INSERT INTO users (openid) VALUES (?)', [DEFAULT_OPENID])
    user = { id: result.lastID, openid: DEFAULT_OPENID }
  }
  return user
}

export async function backfillUserOwnership(userId) {
  await run('UPDATE contents SET user_id = ? WHERE user_id IS NULL', [userId])
  await run('UPDATE tags SET user_id = ? WHERE user_id IS NULL', [userId])
}

export async function getUserByToken(token) {
  return queryOne(
    'SELECT id, openid FROM users WHERE session_token = ? AND session_expires_at > CURRENT_TIMESTAMP',
    [token]
  )
}

export async function upsertUserByOpenId(openid) {
  let user = await queryOne('SELECT id, openid FROM users WHERE openid = ?', [openid])
  if (!user) {
    const result = await run('INSERT INTO users (openid) VALUES (?)', [openid])
    user = { id: result.lastID, openid }
  }
  return user
}

export async function updateUserSession(userId, token, expiresAt) {
  return run(
    `UPDATE users
     SET session_token = ?, session_expires_at = ?, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [token, expiresAt, userId]
  )
}
