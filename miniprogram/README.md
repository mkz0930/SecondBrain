# Second Brain Mini Program

## Setup
1. Open `miniprogram/` in WeChat DevTools.
2. Set your AppID in `project.config.json`.
3. Start the backend server and update the base URL in storage (`sb_api_base`).
4. In DevTools, disable request domain checks for local HTTP.

## Backend environment
- `WECHAT_APPID` and `WECHAT_SECRET` are required for login.
- `SESSION_DAYS` controls token expiry (default 30).
- `DISABLE_ANON=true` forces authentication on all APIs.
- `ALLOW_DEV_OPENID=true` allows using `openid` directly in the auth API.
