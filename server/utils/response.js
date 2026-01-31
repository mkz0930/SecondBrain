/**
 * 统一的 API 响应格式工具
 */

/**
 * 成功响应
 * @param {Object} res - Express response 对象
 * @param {*} data - 响应数据
 * @param {string} [message] - 可选的成功消息
 * @param {number} [statusCode=200] - HTTP 状态码
 */
function success(res, data, message = null, statusCode = 200) {
  const response = {
    success: true,
    data
  }

  if (message) {
    response.message = message
  }

  return res.status(statusCode).json(response)
}

/**
 * 分页成功响应
 * @param {Object} res - Express response 对象
 * @param {Array} data - 响应数据数组
 * @param {Object} pagination - 分页信息
 * @param {number} pagination.page - 当前页码
 * @param {number} pagination.limit - 每页数量
 * @param {number} pagination.total - 总记录数
 */
function successWithPagination(res, data, pagination) {
  return res.json({
    success: true,
    data,
    pagination: {
      page: parseInt(pagination.page),
      limit: parseInt(pagination.limit),
      total: parseInt(pagination.total),
      totalPages: Math.ceil(pagination.total / pagination.limit)
    }
  })
}

/**
 * 错误响应
 * @param {Object} res - Express response 对象
 * @param {string} message - 错误消息
 * @param {number} [statusCode=500] - HTTP 状态码
 * @param {*} [error] - 详细错误信息（开发环境）
 */
function error(res, message, statusCode = 500, error = null) {
  const response = {
    success: false,
    message
  }

  // 在开发环境中包含详细错误信息
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message || error
    if (error.stack) {
      response.stack = error.stack
    }
  }

  return res.status(statusCode).json(response)
}

/**
 * 验证错误响应
 * @param {Object} res - Express response 对象
 * @param {Array|Object} errors - 验证错误列表
 */
function validationError(res, errors) {
  return res.status(400).json({
    success: false,
    message: '验证失败',
    errors: Array.isArray(errors) ? errors : [errors]
  })
}

/**
 * 未授权响应
 * @param {Object} res - Express response 对象
 * @param {string} [message='未授权'] - 错误消息
 */
function unauthorized(res, message = '未授权') {
  return res.status(401).json({
    success: false,
    message
  })
}

/**
 * 禁止访问响应
 * @param {Object} res - Express response 对象
 * @param {string} [message='禁止访问'] - 错误消息
 */
function forbidden(res, message = '禁止访问') {
  return res.status(403).json({
    success: false,
    message
  })
}

/**
 * 未找到响应
 * @param {Object} res - Express response 对象
 * @param {string} [message='资源未找到'] - 错误消息
 */
function notFound(res, message = '资源未找到') {
  return res.status(404).json({
    success: false,
    message
  })
}

module.exports = {
  success,
  successWithPagination,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound
}
