import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {getOfflineCache} from '../database/OfflineCache';
import apiService from '../services/ApiService';

/**
 * 离线阅读屏幕
 */
function OfflineReadingScreen({navigation}) {
  const [cachedContents, setCachedContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState({count: 0, sizeBytes: 0});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadCachedContents();
  }, []);

  const loadCachedContents = async () => {
    try {
      setLoading(true);
      const cache = await getOfflineCache();
      const contents = await cache.getAllCachedContents();
      const stats = await cache.getCacheStats();
      setCachedContents(contents);
      setCacheStats(stats);
    } catch (error) {
      console.error('Error loading cached contents:', error);
      Alert.alert('错误', '加载离线内容失败');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCachedContents();
    setRefreshing(false);
  }, []);

  const handleSyncForOffline = async () => {
    try {
      setSyncing(true);
      // 获取最新内容
      const data = await apiService.getContents({limit: 50, sort: 'updated_at', order: 'desc'});
      const contents = data.contents || [];

      if (contents.length === 0) {
        Alert.alert('提示', '没有可同步的内容');
        return;
      }

      // 缓存到本地
      const cache = await getOfflineCache();
      await cache.cacheContents(contents);

      // 刷新列表
      await loadCachedContents();

      Alert.alert('成功', `已缓存 ${contents.length} 篇内容供离线阅读`);
    } catch (error) {
      console.error('Error syncing for offline:', error);
      Alert.alert('错误', error.message || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveCache = (item) => {
    Alert.alert(
      '确认删除',
      `确定要删除"${item.title}"的离线缓存吗？`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const cache = await getOfflineCache();
              await cache.removeCachedContent(item.id);
              setCachedContents(cachedContents.filter(c => c.id !== item.id));
              const stats = await cache.getCacheStats();
              setCacheStats(stats);
            } catch (error) {
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    if (cachedContents.length === 0) {
      Alert.alert('提示', '没有缓存内容');
      return;
    }

    Alert.alert(
      '确认清空',
      '确定要清空所有离线缓存吗？此操作不可恢复。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            try {
              const cache = await getOfflineCache();
              await cache.clearAllCache();
              setCachedContents([]);
              setCacheStats({count: 0, sizeBytes: 0});
              Alert.alert('成功', '已清空所有离线缓存');
            } catch (error) {
              Alert.alert('错误', '清空失败');
            }
          },
        },
      ],
    );
  };

  const handleItemPress = async (item) => {
    // 更新最后阅读时间
    try {
      const cache = await getOfflineCache();
      await cache.updateLastReadTime(item.id);
    } catch (error) {
      console.error('Error updating last read time:', error);
    }

    navigation.navigate('ContentDetail', {contentId: item.id, content: item});
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCachedTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.contentCard}
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleRemoveCache(item)}>
      <View style={styles.contentHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.offlineTag}>离线</Text>
          <Text style={styles.contentType}>{item.type || '其他'}</Text>
        </View>
        <Text style={styles.cachedTime}>
          缓存于 {formatCachedTime(item.cached_at)}
        </Text>
      </View>
      <Text style={styles.contentTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {item.summary && (
        <Text style={styles.contentSummary} numberOfLines={2}>
          {item.summary}
        </Text>
      )}
      {item.last_read_at && (
        <Text style={styles.lastReadText}>
          上次阅读: {formatCachedTime(item.last_read_at)}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 统计信息 */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{cacheStats.count}</Text>
          <Text style={styles.statLabel}>篇文章</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSize(cacheStats.sizeBytes)}</Text>
          <Text style={styles.statLabel}>占用空间</Text>
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.buttonDisabled]}
          onPress={handleSyncForOffline}
          disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>同步最新内容</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>清空缓存</Text>
        </TouchableOpacity>
      </View>

      {/* 内容列表 */}
      <FlatList
        data={cachedContents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyText}>暂无离线内容</Text>
            <Text style={styles.emptyHint}>
              点击"同步最新内容"下载文章供离线阅读
            </Text>
          </View>
        }
        contentContainerStyle={cachedContents.length === 0 && styles.emptyList}
      />

      {/* 提示 */}
      <View style={styles.tipBar}>
        <Text style={styles.tipText}>💡 长按内容卡片可删除单个缓存</Text>
      </View>
    </View>
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    padding: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#e0e7ff',
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  contentCard: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineTag: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  contentType: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cachedTime: {
    fontSize: 10,
    color: '#9ca3af',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  contentSummary: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  lastReadText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyList: {
    flex: 1,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  tipBar: {
    backgroundColor: '#fef3c7',
    padding: 10,
    alignItems: 'center',
  },
  tipText: {
    fontSize: 12,
    color: '#92400e',
  },
});

export default OfflineReadingScreen;
