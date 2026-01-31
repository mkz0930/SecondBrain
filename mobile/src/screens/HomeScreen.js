import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import clipboardMonitor from '../services/ClipboardService';
import syncService from '../services/SyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

function HomeScreen({navigation}) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [syncStats, setSyncStats] = useState({
    pending: 0,
    processing: 0,
    synced: 0,
    failed: 0,
    totalSynced: 0,
    totalFailed: 0,
    lastSyncTime: null,
    isSyncing: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [monitorStats, setMonitorStats] = useState(null);

  useEffect(() => {
    // 加载监听状态
    loadMonitoringState();

    // 加载同步统计
    loadSyncStats();

    // 启动自动同步
    syncService.startAutoSync(5); // 每5分钟同步一次

    // 添加同步状态监听器
    const syncListener = (event, data) => {
      console.log('[HomeScreen] Sync event:', event, data);
      if (event === 'completed') {
        loadSyncStats();
      }
    };
    syncService.addSyncListener(syncListener);

    // 定期刷新统计数据（每10秒）
    const statsInterval = setInterval(() => {
      loadSyncStats();
      loadMonitorStats();
    }, 10000);

    return () => {
      syncService.stopAutoSync();
      syncService.removeSyncListener(syncListener);
      clearInterval(statsInterval);
    };
  }, []);

  const loadMonitoringState = async () => {
    try {
      const state = await AsyncStorage.getItem('clipboard_monitoring');
      if (state === 'true') {
        setIsMonitoring(true);
        await clipboardMonitor.start();
      }
    } catch (error) {
      console.error('Error loading monitoring state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncStats = async () => {
    try {
      const stats = await syncService.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const loadMonitorStats = () => {
    try {
      const stats = clipboardMonitor.getStats();
      setMonitorStats(stats);
    } catch (error) {
      console.error('Error loading monitor stats:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadSyncStats();
      loadMonitorStats();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const toggleMonitoring = async value => {
    try {
      if (value) {
        await clipboardMonitor.start();
        await AsyncStorage.setItem('clipboard_monitoring', 'true');
        Alert.alert('监听已启动', '外挂大脑正在后台监听剪切板');
      } else {
        await clipboardMonitor.stop();
        await AsyncStorage.setItem('clipboard_monitoring', 'false');
        Alert.alert('监听已停止', '剪切板监听已关闭');
      }
      setIsMonitoring(value);
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      Alert.alert('错误', error.message);
    }
  };

  const handleManualSync = async () => {
    if (syncStats.isSyncing) {
      Alert.alert('提示', '同步正在进行中，请稍候...');
      return;
    }

    try {
      setSyncStats(prev => ({...prev, isSyncing: true}));
      const result = await syncService.manualSync();
      await loadSyncStats();

      if (result && result.success) {
        const message = result.synced > 0
          ? `成功同步 ${result.synced} 项内容`
          : '没有待同步的内容';
        Alert.alert('同步完成', message);
      } else {
        Alert.alert('同步失败', result?.message || '同步时发生错误');
      }
    } catch (error) {
      console.error('Error manual sync:', error);
      Alert.alert('同步失败', error.message);
    }
  };

  const formatLastSyncTime = (timestamp) => {
    if (!timestamp) return '从未同步';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={['#6366f1']}
          tintColor="#6366f1"
        />
      }>
      <View style={styles.header}>
        <Text style={styles.title}>外挂大脑</Text>
        <Text style={styles.subtitle}>智能剪切板监听</Text>
      </View>

      {/* 监听开关 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>剪切板监听</Text>
          <Switch value={isMonitoring} onValueChange={toggleMonitoring} />
        </View>
        <Text style={styles.cardDescription}>
          {isMonitoring
            ? '✅ 正在监听剪切板中的链接'
            : '⏸️ 监听已暂停'}
        </Text>
        {monitorStats && isMonitoring && (
          <View style={styles.monitorInfo}>
            <Text style={styles.infoText}>
              已处理: {monitorStats.processedCount} 个链接
            </Text>
            <Text style={styles.infoText}>
              检查间隔: {Math.round(monitorStats.currentInterval / 1000)} 秒
            </Text>
          </View>
        )}
      </View>

      {/* 同步统计 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>同步统计</Text>
          {syncStats.isSyncing && (
            <ActivityIndicator size="small" color="#6366f1" />
          )}
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{syncStats.pending}</Text>
            <Text style={styles.statLabel}>待同步</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{syncStats.processing}</Text>
            <Text style={styles.statLabel}>同步中</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.successText]}>
              {syncStats.synced}
            </Text>
            <Text style={styles.statLabel}>已同步</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.errorText]}>
              {syncStats.failed}
            </Text>
            <Text style={styles.statLabel}>失败</Text>
          </View>
        </View>
        <View style={styles.syncInfo}>
          <Text style={styles.infoText}>
            上次同步: {formatLastSyncTime(syncStats.lastSyncTime)}
          </Text>
          <Text style={styles.infoText}>
            累计同步: {syncStats.totalSynced} 项
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.syncButton,
            syncStats.isSyncing && styles.syncButtonDisabled,
          ]}
          onPress={handleManualSync}
          disabled={syncStats.isSyncing}>
          {syncStats.isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>立即同步</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 快捷操作 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>快捷操作</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ContentList')}>
          <Text style={styles.actionButtonText}>📚 查看内容列表</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Search')}>
          <Text style={styles.actionButtonText}>🔍 搜索内容</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('TagManagement')}>
          <Text style={styles.actionButtonText}>🏷️ 标签管理</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('OfflineReading')}>
          <Text style={styles.actionButtonText}>📥 离线阅读</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('BatchImport')}>
          <Text style={styles.actionButtonText}>📋 批量导入</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Statistics')}>
          <Text style={styles.actionButtonText}>📊 统计分析</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('UrlFilter')}>
          <Text style={styles.actionButtonText}>⚙️ URL 过滤规则</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.actionButtonText}>🔧 设置</Text>
        </TouchableOpacity>
      </View>

      {/* 使用说明 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>使用说明</Text>
        <Text style={styles.helpText}>
          1. 开启剪切板监听{'\n'}
          2. 在其他应用中复制文章链接{'\n'}
          3. 收到通知后点击"保存"{'\n'}
          4. 内容自动同步到飞书多维表格
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
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
  syncButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncInfo: {
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  monitorInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 24,
  },
});

export default HomeScreen;
