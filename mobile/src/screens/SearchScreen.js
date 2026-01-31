import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import apiService from '../services/ApiService';
import {debounce} from '../utils/helpers';

/**
 * 搜索屏幕
 */
function SearchScreen({navigation}) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    tag: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // 内容类型选项
  const typeOptions = ['', '随笔', '文章', '音视频', '书籍', '公众号', '其他'];

  const performSearch = async (query, filterOptions = filters) => {
    if (!query.trim() && !filterOptions.type && !filterOptions.tag) {
      setResults([]);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const params = {
        search: query.trim(),
        limit: 50,
        sort: 'updated_at',
        order: 'desc',
      };

      if (filterOptions.type) {
        params.type = filterOptions.type;
      }
      if (filterOptions.tag) {
        params.tag = filterOptions.tag;
      }

      const data = await apiService.getContents(params);
      setResults(data.contents || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce((query) => performSearch(query), 500),
    [filters],
  );

  const handleSearchChange = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    performSearch(searchText);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = {...filters, [key]: value};
    setFilters(newFilters);
    if (searchText.trim() || newFilters.type || newFilters.tag) {
      performSearch(searchText, newFilters);
    }
  };

  const clearFilters = () => {
    setFilters({type: '', tag: ''});
    if (searchText.trim()) {
      performSearch(searchText, {type: '', tag: ''});
    }
  };

  const handleItemPress = (item) => {
    navigation.navigate('ContentDetail', {contentId: item.id, content: item});
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleItemPress(item)}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultType}>{item.type || '其他'}</Text>
        <Text style={styles.resultDate}>
          {new Date(item.updated_at).toLocaleDateString('zh-CN')}
        </Text>
      </View>
      <Text style={styles.resultTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {item.summary && (
        <Text style={styles.resultSummary} numberOfLines={2}>
          {item.summary}
        </Text>
      )}
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag.name || tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Text style={styles.filterLabel}>类型筛选</Text>
      <View style={styles.filterOptions}>
        {typeOptions.map((type) => (
          <TouchableOpacity
            key={type || 'all'}
            style={[
              styles.filterOption,
              filters.type === type && styles.filterOptionActive,
            ]}
            onPress={() => handleFilterChange('type', type)}>
            <Text
              style={[
                styles.filterOptionText,
                filters.type === type && styles.filterOptionTextActive,
              ]}>
              {type || '全部'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {(filters.type || filters.tag) && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
          <Text style={styles.clearFiltersText}>清除筛选</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="搜索标题、内容、摘要..."
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchText('');
                setResults([]);
                setSearched(false);
              }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* 筛选器 */}
      {showFilters && renderFilters()}

      {/* 搜索结果 */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>搜索中...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searched ? (
                <>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyText}>未找到相关内容</Text>
                  <Text style={styles.emptyHint}>尝试使用其他关键词搜索</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyIcon}>💡</Text>
                  <Text style={styles.emptyText}>输入关键词开始搜索</Text>
                  <Text style={styles.emptyHint}>
                    支持搜索标题、内容、摘要
                  </Text>
                </>
              )}
            </View>
          }
          contentContainerStyle={results.length === 0 && styles.emptyList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: '#9ca3af',
  },
  filterButton: {
    marginLeft: 12,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#eef2ff',
  },
  filterIcon: {
    fontSize: 18,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#6366f1',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  clearFiltersButton: {
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#6366f1',
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
  resultCard: {
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultType: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resultDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  resultSummary: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#4f46e5',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
});

export default SearchScreen;
