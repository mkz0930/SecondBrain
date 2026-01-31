import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import apiService from '../services/ApiService';

/**
 * 内容详情和编辑屏幕
 */
function ContentDetailScreen({route, navigation}) {
  const {contentId, content: initialContent} = route.params || {};
  const [content, setContent] = useState(initialContent || null);
  const [loading, setLoading] = useState(!initialContent);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    content: '',
    type: '',
    rating: 0,
  });

  useEffect(() => {
    if (contentId && !initialContent) {
      loadContent();
    } else if (initialContent) {
      initEditForm(initialContent);
    }
  }, [contentId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await apiService.getContentById(contentId);
      setContent(data);
      initEditForm(data);
    } catch (error) {
      console.error('Error loading content:', error);
      Alert.alert('错误', '加载内容失败');
    } finally {
      setLoading(false);
    }
  };

  const initEditForm = (data) => {
    setEditForm({
      title: data.title || '',
      summary: data.summary || '',
      content: data.content || '',
      type: data.type || '',
      rating: data.rating || 0,
    });
  };

  const handleSave = async () => {
    if (!editForm.title.trim()) {
      Alert.alert('错误', '标题不能为空');
      return;
    }

    try {
      setSaving(true);
      const updated = await apiService.updateContent(content.id, editForm);
      setContent({...content, ...updated});
      setIsEditing(false);
      Alert.alert('成功', '内容已保存');
    } catch (error) {
      console.error('Error saving content:', error);
      Alert.alert('错误', error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      '确定要删除这条内容吗？此操作不可恢复。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteContent(content.id);
              Alert.alert('成功', '内容已删除');
              navigation.goBack();
            } catch (error) {
              Alert.alert('错误', error.message || '删除失败');
            }
          },
        },
      ],
    );
  };

  const handleToggleFavorite = async () => {
    try {
      const result = await apiService.toggleFavorite(content.id);
      setContent({...content, is_favorite: result.is_favorite});
    } catch (error) {
      Alert.alert('错误', error.message || '操作失败');
    }
  };

  const handleOpenUrl = () => {
    if (content?.url) {
      Linking.openURL(content.url);
    }
  };

  const renderRatingStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => isEditing && setEditForm({...editForm, rating: i})}
          disabled={!isEditing}>
          <Text style={styles.star}>
            {i <= (isEditing ? editForm.rating : content?.rating || 0) ? '★' : '☆'}
          </Text>
        </TouchableOpacity>,
      );
    }
    return <View style={styles.ratingContainer}>{stars}</View>;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>内容不存在</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 操作栏 */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleToggleFavorite}>
          <Text style={styles.actionIcon}>
            {content.is_favorite ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsEditing(!isEditing)}>
          <Text style={styles.actionIcon}>{isEditing ? '✕' : '✏️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
        {content.url && (
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenUrl}>
            <Text style={styles.actionIcon}>🔗</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 类型和日期 */}
      <View style={styles.metaRow}>
        {isEditing ? (
          <TextInput
            style={styles.typeInput}
            value={editForm.type}
            onChangeText={(text) => setEditForm({...editForm, type: text})}
            placeholder="类型"
          />
        ) : (
          <Text style={styles.typeTag}>{content.type || '其他'}</Text>
        )}
        <Text style={styles.dateText}>
          {new Date(content.updated_at || content.created_at).toLocaleDateString('zh-CN')}
        </Text>
      </View>

      {/* 标题 */}
      {isEditing ? (
        <TextInput
          style={styles.titleInput}
          value={editForm.title}
          onChangeText={(text) => setEditForm({...editForm, title: text})}
          placeholder="标题"
          multiline
        />
      ) : (
        <Text style={styles.title}>{content.title}</Text>
      )}

      {/* 评分 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>评分</Text>
        {renderRatingStars()}
      </View>

      {/* 摘要 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>摘要</Text>
        {isEditing ? (
          <TextInput
            style={styles.textArea}
            value={editForm.summary}
            onChangeText={(text) => setEditForm({...editForm, summary: text})}
            placeholder="摘要"
            multiline
            numberOfLines={4}
          />
        ) : (
          <Text style={styles.summaryText}>
            {content.summary || '暂无摘要'}
          </Text>
        )}
      </View>

      {/* 正文 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>正文</Text>
        {isEditing ? (
          <TextInput
            style={[styles.textArea, styles.contentArea]}
            value={editForm.content}
            onChangeText={(text) => setEditForm({...editForm, content: text})}
            placeholder="正文内容"
            multiline
            numberOfLines={10}
          />
        ) : (
          <Text style={styles.contentText}>
            {content.content || '暂无正文'}
          </Text>
        )}
      </View>

      {/* 标签 */}
      {content.tags && content.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>标签</Text>
          <View style={styles.tagsContainer}>
            {content.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag.name || tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* URL */}
      {content.url && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>来源链接</Text>
          <TouchableOpacity onPress={handleOpenUrl}>
            <Text style={styles.urlText} numberOfLines={2}>
              {content.url}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 保存按钮 */}
      {isEditing && (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>保存修改</Text>
          )}
        </TouchableOpacity>
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
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionButton: {
    padding: 8,
    marginLeft: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  typeTag: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeInput: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#fff',
  },
  titleInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 24,
    color: '#fbbf24',
    marginRight: 4,
  },
  summaryText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
  },
  contentText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 26,
  },
  textArea: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
  contentArea: {
    minHeight: 200,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#4f46e5',
  },
  urlText: {
    fontSize: 14,
    color: '#6366f1',
    textDecorationLine: 'underline',
  },
  saveButton: {
    backgroundColor: '#10b981',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});

export default ContentDetailScreen;
