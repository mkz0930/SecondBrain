import { queryOne, run } from './database.js'
import bcrypt from 'bcrypt'

const DEFAULT_OPENID = process.env.DEFAULT_USER_OPENID || 'local-default'
const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin'
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin'

export async function ensureDefaultUser() {
  // In single-user mode, default to the admin user so content is visible
  return ensureDefaultAdmin()
}

export async function ensureDefaultAdmin() {
  let admin = await queryOne('SELECT id, username FROM users WHERE username = ?', [DEFAULT_ADMIN_USERNAME])
  if (!admin) {
    admin = await createUserWithPassword(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD)
    console.log(`Default admin user created: ${DEFAULT_ADMIN_USERNAME}`)
  }
  return admin
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

export async function getUserByUsername(username) {
  return queryOne('SELECT id, username, password_hash FROM users WHERE username = ?', [username])
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash)
}

export async function createUserWithPassword(username, password) {
  const passwordHash = await bcrypt.hash(password, 10)
  const result = await run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, passwordHash]
  )
  return { id: result.lastID, username }
}

export async function clearUserSession(userId) {
  return run(
    'UPDATE users SET session_token = NULL, session_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [userId]
  )
}
