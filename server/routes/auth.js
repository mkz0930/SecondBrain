import express from 'express'
import crypto from 'crypto'
import { upsertUserByOpenId, updateUserSession } from '../models/users.js'

const router = express.Router()

const SESSION_DAYS = parseInt(process.env.SESSION_DAYS || '30', 10)
const ALLOW_DEV_OPENID = process.env.ALLOW_DEV_OPENID === 'true'

router.post('/wechat', async (req, res) => {
  try {
    const { code, openid } = req.body || {}
    let resolvedOpenId = null

    if (code) {
      const appId = process.env.WECHAT_APPID
      const secret = process.env.WECHAT_SECRET

      if (!appId || !secret) {
        return res.status(500).json({ error: 'WECHAT_APPID or WECHAT_SECRET not set' })
      }

      const params = new URLSearchParams({
        appid: appId,
        secret,
        js_code: code,
        grant_type: 'authorization_code'
      })

      const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`)
      const data = await response.json()

      if (!response.ok || data.errcode) {
        return res.status(502).json({ error: 'WeChat login failed', detail: data })
      }

      resolvedOpenId = data.openid
    } else if (ALLOW_DEV_OPENID && openid) {
      resolvedOpenId = openid
    }

    if (!resolvedOpenId) {
      return res.status(400).json({ error: 'code is required' })
    }

    const user = await upsertUserByOpenId(resolvedOpenId)
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()

    await updateUserSession(user.id, sessionToken, expiresAt)

    res.json({
      user_id: user.id,
      openid: user.openid,
      token: sessionToken,
      expires_at: expiresAt
    })
  } catch (error) {
    console.error('WeChat auth error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
