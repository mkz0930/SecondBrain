const logger = require('./logger')
const { error: errorResponse } = require('./response')

/**
 * 异步路由处理器包装器
 * 自动捕获异步错误并统一处理
 *
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} Express 中间件函数
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll()
 *   return success(res, users)
 * }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // 记录错误
      logger.error('Route error:', {
        method: req.method,
        path: req.path,
        error: err.message,
        stack: err.stack,
        user: req.user?.id
      })

      // 返回统一的错误响应
      return errorResponse(res, err.message || '服务器内部错误', err.statusCode || 500, err)
    })
  }
}

module.exports = asyncHandler
