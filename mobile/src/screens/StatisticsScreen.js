import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import apiService from '../services/ApiService';
import syncService from '../services/SyncService';
import {getOfflineCache} from '../database/OfflineCache';
import performanceMonitor from '../utils/PerformanceMonitor';

const {width: screenWidth} = Dimensions.get('window');

/**
 * 统计和分析屏幕
 */
function StatisticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    content: {total: 0, byType: {}, byMonth: []},
    tags: {total: 0, topTags: []},
    sync: {totalSynced: 0, totalFailed: 0, lastSyncTime: null},
    offline: {count: 0, sizeBytes: 0},
    performance: null,
  });

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      setLoading(true);

      // 并行加载各项统计
      const [contentStats, syncStats, offlineStats, perfStats] = await Promise.all([
        loadContentStats(),
        loadSyncStats(),
        loadOfflineStats(),
        loadPerformanceStats(),
      ]);

      setStats({
        content: contentStats,
        tags: contentStats.tags || {total: 0, topTags: []},
        sync: syncStats,
        offline: offlineStats,
        performance: perfStats,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContentStats = async () => {
    try {
      // 获取内容统计
      const data = await apiService.getStats();
      return {
        total: data.total || 0,
        byType: data.byType || {},
        byMonth: data.byMonth || [],
        tags: {
          total: data.tagCount || 0,
          topTags: data.topTags || [],
        },
        favorites: data.favorites || 0,
        thisWeek: data.thisWeek || 0,
        thisMonth: data.thisMonth || 0,
      };
    } catch (error) {
      console.error('Error loading content stats:', error);
      return {total: 0, byType: {}, byMonth: [], tags: {total: 0, topTags: []}};
    }
  };

  const loadSyncStats = async () => {
    try {
      const stats = await syncService.getSyncStats();
      return {
        totalSynced: stats.totalSynced || 0,
        totalFailed: stats.totalFailed || 0,
        lastSyncTime: stats.lastSyncTime,
        pending: stats.pending || 0,
      };
    } catch (error) {
      console.error('Error loading sync stats:', error);
      return {totalSynced: 0, totalFailed: 0, lastSyncTime: null};
    }
  };

  const loadOfflineStats = async () => {
    try {
      const cache = await getOfflineCache();
      return await cache.getCacheStats();
    } catch (error) {
      console.error('Error loading offline stats:', error);
      return {count: 0, sizeBytes: 0};
    }
  };

  const loadPerformanceStats = async () => {
    try {
      return performanceMonitor.getReport();
    } catch (error) {
      console.error('Error loading performance stats:', error);
      return null;
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllStats();
    setRefreshing(false);
  }, []);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '从未';
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
  };

  const renderTypeBar = (type, count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const colors = {
      '随笔': '#6366f1',
      '文章': '#8b5cf6',
      '音视频': '#ec4899',
      '书籍': '#f97316',
      '公众号': '#22c55e',
      '其他': '#6b7280',
    };
    const color = colors[type] || '#6b7280';

    return (
      <View key={type} style={styles.typeBarContainer}>
        <View style={styles.typeBarLabel}>
          <Text style={styles.typeBarName}>{type}</Text>
          <Text style={styles.typeBarCount}>{count}</Text>
        </View>
        <View style={styles.typeBarBg}>
          <View style={[styles.typeBarFill, {width: `${percentage}%`, backgroundColor: color}]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>加载统计数据...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* 内容概览 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>内容概览</Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{stats.content.total}</Text>
            <Text style={styles.overviewLabel}>总内容数</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{stats.content.favorites || 0}</Text>
            <Text style={styles.overviewLabel}>收藏数</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{stats.content.thisWeek || 0}</Text>
            <Text style={styles.overviewLabel}>本周新增</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{stats.content.thisMonth || 0}</Text>
            <Text style={styles.overviewLabel}>本月新增</Text>
          </View>
        </View>
      </View>

      {/* 内容类型分布 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>内容类型分布</Text>
        {Object.keys(stats.content.byType).length > 0 ? (
          Object.entries(stats.content.byType).map(([type, count]) =>
            renderTypeBar(type, count, stats.content.total),
          )
        ) : (
          <Text style={styles.emptyText}>暂无数据</Text>
        )}
      </View>

      {/* 标签统计 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>标签统计</Text>
        <View style={styles.tagStatsHeader}>
          <Text style={styles.tagStatsTotal}>共 {stats.tags.total} 个标签</Text>
        </View>
        {stats.tags.topTags && stats.tags.topTags.length > 0 ? (
          <View style={styles.topTagsContainer}>
            {stats.tags.topTags.slice(0, 10).map((tag, index) => (
              <View key={tag.name || index} style={styles.topTagItem}>
                <View style={[styles.tagRank, index < 3 && styles.tagRankTop]}>
                  <Text style={[styles.tagRankText, index < 3 && styles.tagRankTextTop]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={styles.topTagName}>{tag.name}</Text>
                <Text style={styles.topTagCount}>{tag.count} 篇</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>暂无标签数据</Text>
        )}
      </View>

      {/* 同步统计 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>同步统计</Text>
        <View style={styles.syncStatsGrid}>
          <View style={styles.syncStatItem}>
            <Text style={[styles.syncStatValue, styles.successText]}>
              {stats.sync.totalSynced}
            </Text>
            <Text style={styles.syncStatLabel}>成功同步</Text>
          </View>
          <View style={styles.syncStatItem}>
            <Text style={[styles.syncStatValue, styles.errorText]}>
              {stats.sync.totalFailed}
            </Text>
            <Text style={styles.syncStatLabel}>同步失败</Text>
          </View>
          <View style={styles.syncStatItem}>
            <Text style={styles.syncStatValue}>{stats.sync.pending || 0}</Text>
            <Text style={styles.syncStatLabel}>待同步</Text>
          </View>
        </View>
        <View style={styles.syncTimeRow}>
          <Text style={styles.syncTimeLabel}>上次同步时间:</Text>
          <Text style={styles.syncTimeValue}>{formatTime(stats.sync.lastSyncTime)}</Text>
        </View>
      </View>

      {/* 离线缓存 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>离线缓存</Text>
        <View style={styles.offlineStatsRow}>
          <View style={styles.offlineStatItem}>
            <Text style={styles.offlineStatValue}>{stats.offline.count}</Text>
            <Text style={styles.offlineStatLabel}>缓存文章</Text>
          </View>
          <View style={styles.offlineStatItem}>
            <Text style={styles.offlineStatValue}>{formatSize(stats.offline.sizeBytes)}</Text>
            <Text style={styles.offlineStatLabel}>占用空间</Text>
          </View>
        </View>
      </View>

      {/* 性能统计 */}
      {stats.performance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>性能统计</Text>
          <View style={styles.perfGrid}>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{stats.performance.clipboardChecks || 0}</Text>
              <Text style={styles.perfLabel}>剪切板检查</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{stats.performance.urlsDetected || 0}</Text>
              <Text style={styles.perfLabel}>检测到 URL</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{stats.performance.apiCalls || 0}</Text>
              <Text style={styles.perfLabel}>API 调用</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>
                {stats.performance.successRate ? `${stats.performance.successRate.toFixed(1)}%` : 'N/A'}
              </Text>
              <Text style={styles.perfLabel}>成功率</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  overviewItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  typeBarContainer: {
    marginBottom: 12,
  },
  typeBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBarName: {
    fontSize: 14,
    color: '#374151',
  },
  typeBarCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  typeBarBg: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  typeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  tagStatsHeader: {
    marginBottom: 12,
  },
  tagStatsTotal: {
    fontSize: 14,
    color: '#6b7280',
  },
  topTagsContainer: {},
  topTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tagRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tagRankTop: {
    backgroundColor: '#fef3c7',
  },
  tagRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tagRankTextTop: {
    color: '#d97706',
  },
  topTagName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  topTagCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  syncStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  syncStatItem: {
    alignItems: 'center',
  },
  syncStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  syncStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  successText: {
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
  syncTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  syncTimeLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  syncTimeValue: {
    fontSize: 13,
    color: '#374151',
  },
  offlineStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  offlineStatItem: {
    alignItems: 'center',
  },
  offlineStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  offlineStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  perfItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  perfValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  perfLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
  bottomPadding: {
    height: 40,
  },
});

export default StatisticsScreen;
