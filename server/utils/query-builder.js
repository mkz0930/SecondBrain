/**
 * SQL 查询构建器
 * 提供链式 API 构建安全的 SQL 查询
 */

class QueryBuilder {
  /**
   * @param {string} baseQuery - 基础查询语句（SELECT ... FROM ...）
   */
  constructor(baseQuery) {
    this.baseQuery = baseQuery
    this.whereClauses = []
    this.params = []
    this.orderByClause = ''
    this.limitClause = ''
    this.offsetClause = ''
  }

  /**
   * 添加 WHERE 条件
   * @param {string} condition - SQL 条件语句
   * @param {...*} values - 参数值
   * @returns {QueryBuilder}
   */
  where(condition, ...values) {
    this.whereClauses.push(condition)
    this.params.push(...values)
    return this
  }

  /**
   * 添加可选的 WHERE 条件（仅当值存在时）
   * @param {*} value - 条件值
   * @param {string} condition - SQL 条件语句
   * @param {...*} additionalValues - 额外的参数值
   * @returns {QueryBuilder}
   */
  whereIf(value, condition, ...additionalValues) {
    if (value !== undefined && value !== null && value !== '') {
      this.whereClauses.push(condition)
      this.params.push(value, ...additionalValues)
    }
    return this
  }

  /**
   * 添加 LIKE 搜索条件
   * @param {string} value - 搜索值
   * @param {...string} columns - 要搜索的列名
   * @returns {QueryBuilder}
   */
  whereLike(value, ...columns) {
    if (value) {
      const conditions = columns.map(col => `${col} LIKE ?`).join(' OR ')
      this.whereClauses.push(`(${conditions})`)
      columns.forEach(() => this.params.push(`%${value}%`))
    }
    return this
  }

  /**
   * 添加 IN 条件
   * @param {string} column - 列名
   * @param {Array} values - 值数组
   * @returns {QueryBuilder}
   */
  whereIn(column, values) {
    if (values && values.length > 0) {
      const placeholders = values.map(() => '?').join(', ')
      this.whereClauses.push(`${column} IN (${placeholders})`)
      this.params.push(...values)
    }
    return this
  }

  /**
   * 添加 EXISTS 子查询
   * @param {string} subquery - 子查询语句
   * @param {...*} values - 参数值
   * @returns {QueryBuilder}
   */
  whereExists(subquery, ...values) {
    this.whereClauses.push(`EXISTS (${subquery})`)
    this.params.push(...values)
    return this
  }

  /**
   * 添加 ORDER BY 子句
   * @param {string} column - 排序列
   * @param {string} [direction='ASC'] - 排序方向
   * @returns {QueryBuilder}
   */
  orderBy(column, direction = 'ASC') {
    const dir = direction.toUpperCase()
    if (dir !== 'ASC' && dir !== 'DESC') {
      throw new Error('Invalid order direction. Use ASC or DESC.')
    }
    this.orderByClause = `ORDER BY ${column} ${dir}`
    return this
  }

  /**
   * 添加 LIMIT 子句
   * @param {number} limit - 限制数量
   * @returns {QueryBuilder}
   */
  limit(limit) {
    if (limit > 0) {
      this.limitClause = 'LIMIT ?'
      this.params.push(parseInt(limit))
    }
    return this
  }

  /**
   * 添加 OFFSET 子句
   * @param {number} offset - 偏移量
   * @returns {QueryBuilder}
   */
  offset(offset) {
    if (offset > 0) {
      this.offsetClause = 'OFFSET ?'
      this.params.push(parseInt(offset))
    }
    return this
  }

  /**
   * 添加分页
   * @param {number} page - 页码（从 1 开始）
   * @param {number} limit - 每页数量
   * @returns {QueryBuilder}
   */
  paginate(page, limit) {
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const offset = (pageNum - 1) * limitNum

    return this.limit(limitNum).offset(offset)
  }

  /**
   * 构建最终的 SQL 查询
   * @returns {{query: string, params: Array}}
   */
  build() {
    const parts = [this.baseQuery]

    if (this.whereClauses.length > 0) {
      parts.push(`WHERE ${this.whereClauses.join(' AND ')}`)
    }

    if (this.orderByClause) {
      parts.push(this.orderByClause)
    }

    if (this.limitClause) {
      parts.push(this.limitClause)
    }

    if (this.offsetClause) {
      parts.push(this.offsetClause)
    }

    return {
      query: parts.join(' '),
      params: this.params
    }
  }

  /**
   * 构建 COUNT 查询（用于分页）
   * @returns {{query: string, params: Array}}
   */
  buildCount() {
    // 从基础查询中提取 FROM 子句
    const fromMatch = this.baseQuery.match(/FROM\s+(.+?)(?:\s+WHERE|\s+ORDER|\s+LIMIT|$)/i)
    if (!fromMatch) {
      throw new Error('Cannot extract FROM clause from base query')
    }

    const countQuery = `SELECT COUNT(*) as count FROM ${fromMatch[1]}`
    const parts = [countQuery]

    if (this.whereClauses.length > 0) {
      parts.push(`WHERE ${this.whereClauses.join(' AND ')}`)
    }

    // COUNT 查询不需要 ORDER BY, LIMIT, OFFSET
    // 但需要相同的 WHERE 参数
    const countParams = this.params.filter((_, index) => {
      // 排除 LIMIT 和 OFFSET 的参数
      const limitIndex = this.params.length - (this.offsetClause ? 2 : this.limitClause ? 1 : 0)
      return index < limitIndex
    })

    return {
      query: parts.join(' '),
      params: countParams
    }
  }
}

/**
 * 创建查询构建器
 * @param {string} baseQuery - 基础查询语句
 * @returns {QueryBuilder}
 */
function createQueryBuilder(baseQuery) {
  return new QueryBuilder(baseQuery)
}

module.exports = {
  QueryBuilder,
  createQueryBuilder
}
