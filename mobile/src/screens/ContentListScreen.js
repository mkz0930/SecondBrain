import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import apiService from '../services/ApiService';

function ContentListScreen({navigation}) {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      setLoading(true);
      const data = await apiService.getContents({
        limit: 50,
        sort: 'updated_at',
        order: 'desc',
      });
      setContents(data.contents || []);
    } catch (error) {
      console.error('Error loading contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContents();
    setRefreshing(false);
  };

  const handleItemPress = (item) => {
    navigation.navigate('ContentDetail', {contentId: item.id, content: item});
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.contentCard}
      onPress={() => handleItemPress(item)}>
      <View style={styles.contentHeader}>
        <Text style={styles.contentType}>{item.type || '其他'}</Text>
        <Text style={styles.contentDate}>
          {new Date(item.updated_at).toLocaleDateString('zh-CN')}
        </Text>
      </View>
      <Text style={styles.contentTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {item.summary && (
        <Text style={styles.contentSummary} numberOfLines={3}>
          {item.summary}
        </Text>
      )}
      {item.url && (
        <Text style={styles.contentUrl} numberOfLines={1}>
          🔗 {item.url}
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
      <FlatList
        data={contents}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无内容</Text>
            <Text style={styles.emptyHint}>
              开启剪切板监听，复制文章链接即可自动保存
            </Text>
          </View>
        }
      />
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
  contentCard: {
    backgroundColor: '#fff',
    margin: 12,
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
  contentType: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  contentDate: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  contentUrl: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ContentListScreen;
