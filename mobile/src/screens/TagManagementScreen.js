import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import apiService from '../services/ApiService';

/**
 * 标签管理屏幕
 */
function TagManagementScreen() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({name: '', color: '#6366f1'});
  const [saving, setSaving] = useState(false);

  // 预设颜色
  const presetColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6b7280', '#1f2937',
  ];

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTags();
      setTags(data.tags || data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
      Alert.alert('错误', '加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTags();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setTagForm({name: '', color: '#6366f1'});
    setModalVisible(true);
  };

  const openEditModal = (tag) => {
    setEditingTag(tag);
    setTagForm({name: tag.name, color: tag.color || '#6366f1'});
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!tagForm.name.trim()) {
      Alert.alert('错误', '标签名称不能为空');
      return;
    }

    try {
      setSaving(true);
      if (editingTag) {
        await apiService.updateTag(editingTag.id, tagForm);
        setTags(tags.map(t => t.id === editingTag.id ? {...t, ...tagForm} : t));
      } else {
        const newTag = await apiService.createTag(tagForm);
        setTags([...tags, newTag]);
      }
      setModalVisible(false);
      Alert.alert('成功', editingTag ? '标签已更新' : '标签已创建');
    } catch (error) {
      Alert.alert('错误', error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tag) => {
    Alert.alert(
      '确认删除',
      `确定要删除标签"${tag.name}"吗？`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTag(tag.id);
              setTags(tags.filter(t => t.id !== tag.id));
              Alert.alert('成功', '标签已删除');
            } catch (error) {
              Alert.alert('错误', error.message || '删除失败');
            }
          },
        },
      ],
    );
  };

  const renderTag = ({item}) => (
    <View style={styles.tagCard}>
      <View style={styles.tagInfo}>
        <View style={[styles.colorDot, {backgroundColor: item.color || '#6366f1'}]} />
        <Text style={styles.tagName}>{item.name}</Text>
        {item.content_count !== undefined && (
          <Text style={styles.tagCount}>{item.content_count} 篇</Text>
        )}
      </View>
      <View style={styles.tagActions}>
        <TouchableOpacity
          style={styles.tagActionButton}
          onPress={() => openEditModal(item)}>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tagActionButton}
          onPress={() => handleDelete(item)}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
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
      {/* 添加按钮 */}
      <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
        <Text style={styles.addButtonText}>+ 新建标签</Text>
      </TouchableOpacity>

      {/* 标签列表 */}
      <FlatList
        data={tags}
        renderItem={renderTag}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无标签</Text>
            <Text style={styles.emptyHint}>点击上方按钮创建第一个标签</Text>
          </View>
        }
        contentContainerStyle={tags.length === 0 && styles.emptyList}
      />

      {/* 编辑/创建弹窗 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTag ? '编辑标签' : '新建标签'}
            </Text>

            <Text style={styles.inputLabel}>标签名称</Text>
            <TextInput
              style={styles.input}
              value={tagForm.name}
              onChangeText={(text) => setTagForm({...tagForm, name: text})}
              placeholder="输入标签名称"
              maxLength={20}
            />

            <Text style={styles.inputLabel}>标签颜色</Text>
            <View style={styles.colorPicker}>
              {presetColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    {backgroundColor: color},
                    tagForm.color === color && styles.colorSelected,
                  ]}
                  onPress={() => setTagForm({...tagForm, color})}
                />
              ))}
            </View>

            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>预览：</Text>
              <View style={[styles.previewTag, {backgroundColor: tagForm.color + '20'}]}>
                <Text style={[styles.previewTagText, {color: tagForm.color}]}>
                  {tagForm.name || '标签名称'}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#6366f1',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tagCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  tagName: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  tagCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  tagActions: {
    flexDirection: 'row',
  },
  tagActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  editIcon: {
    fontSize: 16,
  },
  deleteIcon: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyList: {
    flex: 1,
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#d1d5db',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 6,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  previewTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
});

export default TagManagementScreen;
