
// 简单的内存存储，用于保存用户的同步状态
// key: userId, value: { status, stage, message, progress, timestamp }
const userSyncStates = new Map()

export const syncState = {
  get(userId) {
    return userSyncStates.get(userId) || { status: 'idle' }
  },

  set(userId, state) {
    userSyncStates.set(userId, {
      ...state,
      timestamp: Date.now()
    })
  },

  clear(userId) {
    userSyncStates.delete(userId)
  },

  // 更新进度
  update(userId, data) {
    const current = this.get(userId)
    this.set(userId, { ...current, ...data })
  }
}
