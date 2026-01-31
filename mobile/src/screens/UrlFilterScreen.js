import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_WHITELIST = 'url_whitelist';
const STORAGE_KEY_BLACKLIST = 'url_blacklist';
const STORAGE_KEY_MODE = 'url_filter_mode';

/**
 * URL 过滤规则管理屏幕
 */
function UrlFilterScreen() {
  const [mode, setMode] = useState('blacklist'); // 'whitelist' | 'blacklist'
  const [whitelist, setWhitelist] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [editingList, setEditingList] = useState('blacklist');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(STORAGE_KEY_MODE);
      const savedWhitelist = await AsyncStorage.getItem(STORAGE_KEY_WHITELIST);
      const savedBlacklist = await AsyncStorage.getItem(STORAGE_KEY_BLACKLIST);

      if (savedMode) setMode(savedMode);
      if (savedWhitelist) setWhitelist(JSON.parse(savedWhitelist));
      if (savedBlacklist) setBlacklist(JSON.parse(savedBlacklist));
    } catch (error) {
      console.error('Error loading URL filter settings:', error);
    }
  };

  const saveSettings = async (newMode, newWhitelist, newBlacklist) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_MODE, newMode);
      await AsyncStorage.setItem(STORAGE_KEY_WHITELIST, JSON.stringify(newWhitelist));
      await AsyncStorage.setItem(STORAGE_KEY_BLACKLIST, JSON.stringify(newBlacklist));
    } catch (error) {
      console.error('Error saving URL filter settings:', error);
      Alert.alert('错误', '保存设置失败');
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    saveSettings(newMode, whitelist, blacklist);
  };

  const openAddModal = (listType) => {
    setEditingList(listType);
    setNewPattern('');
    setModalVisible(true);
  };

  const handleAddPattern = () => {
    if (!newPattern.trim()) {
      Alert.alert('错误', '请输入域名或关键词');
      return;
    }

    const pattern = newPattern.trim().toLowerCase();

    if (editingList === 'whitelist') {
      if (whitelist.includes(pattern)) {
        Alert.alert('提示', '该规则已存在');
        return;
      }
      const newList = [...whitelist, pattern];
      setWhitelist(newList);
      saveSettings(mode, newList, blacklist);
    } else {
      if (blacklist.includes(pattern)) {
        Alert.alert('提示', '该规则已存在');
        return;
      }
      const newList = [...blacklist, pattern];
      setBlacklist(newList);
      saveSettings(mode, whitelist, newList);
    }

    setModalVisible(false);
    setNewPattern('');
  };

  const handleRemovePattern = (listType, pattern) => {
    Alert.alert(
      '确认删除',
      `确定要删除规则"${pattern}"吗？`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            if (listType === 'whitelist') {
              const newList = whitelist.filter(p => p !== pattern);
              setWhitelist(newList);
              saveSettings(mode, newList, blacklist);
            } else {
              const newList = blacklist.filter(p => p !== pattern);
              setBlacklist(newList);
              saveSettings(mode, whitelist, newList);
            }
          },
        },
      ],
    );
  };

  const handleResetToDefault = () => {
    Alert.alert(
      '恢复默认',
      '确定要恢复默认设置吗？这将清空所有自定义规则。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '确定',
          onPress: () => {
            setMode('blacklist');
            setWhitelist([]);
            setBlacklist([]);
            saveSettings('blacklist', [], []);
            Alert.alert('成功', '已恢复默认设置');
          },
        },
      ],
    );
  };

  const renderPatternItem = (listType) => ({item}) => (
    <View style={styles.patternItem}>
      <Text style={styles.patternText}>{item}</Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemovePattern(listType, item)}>
        <Text style={styles.removeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 模式选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>过滤模式</Text>
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeOption, mode === 'blacklist' && styles.modeOptionActive]}
            onPress={() => handleModeChange('blacklist')}>
            <Text style={[styles.modeText, mode === 'blacklist' && styles.modeTextActive]}>
              黑名单模式
            </Text>
            <Text style={styles.modeDesc}>排除匹配的 URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeOption, mode === 'whitelist' && styles.modeOptionActive]}
            onPress={() => handleModeChange('whitelist')}>
            <Text style={[styles.modeText, mode === 'whitelist' && styles.modeTextActive]}>
              白名单模式
            </Text>
            <Text style={styles.modeDesc}>只处理匹配的 URL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 白名单 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            白名单 ({whitelist.length})
            {mode === 'whitelist' && <Text style={styles.activeTag}> 生效中</Text>}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openAddModal('whitelist')}>
            <Text style={styles.addButtonText}>+ 添加</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionHint}>
          添加域名或关键词，如: mp.weixin.qq.com, zhihu.com
        </Text>
        {whitelist.length > 0 ? (
          <FlatList
            data={whitelist}
            renderItem={renderPatternItem('whitelist')}
            keyExtractor={(item) => item}
            scrollEnabled={false}
            style={styles.patternList}
          />
        ) : (
          <Text style={styles.emptyText}>暂无白名单规则</Text>
        )}
      </View>

      {/* 黑名单 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            黑名单 ({blacklist.length})
            {mode === 'blacklist' && <Text style={styles.activeTag}> 生效中</Text>}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openAddModal('blacklist')}>
            <Text style={styles.addButtonText}>+ 添加</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionHint}>
          添加要排除的域名或关键词，如: taobao.com, jd.com
        </Text>
        {blacklist.length > 0 ? (
          <FlatList
            data={blacklist}
            renderItem={renderPatternItem('blacklist')}
            keyExtractor={(item) => item}
            scrollEnabled={false}
            style={styles.patternList}
          />
        ) : (
          <Text style={styles.emptyText}>暂无黑名单规则</Text>
        )}
      </View>

      {/* 恢复默认 */}
      <TouchableOpacity style={styles.resetButton} onPress={handleResetToDefault}>
        <Text style={styles.resetButtonText}>恢复默认设置</Text>
      </TouchableOpacity>

      {/* 添加规则弹窗 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              添加{editingList === 'whitelist' ? '白名单' : '黑名单'}规则
            </Text>
            <Text style={styles.modalHint}>
              输入域名或关键词，URL 中包含该内容时将被匹配
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newPattern}
              onChangeText={setNewPattern}
              placeholder="例如: weixin.qq.com"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleAddPattern}>
                <Text style={styles.confirmButtonText}>添加</Text>
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
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  activeTag: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  modeSelector: {
    flexDirection: 'row',
  },
  modeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    alignItems: 'center',
  },
  modeOptionActive: {
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  modeTextActive: {
    color: '#6366f1',
  },
  modeDesc: {
    fontSize: 11,
    color: '#9ca3af',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  patternList: {
    maxHeight: 200,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  patternText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  removeIcon: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
  resetButton: {
    margin: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#6b7280',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
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
});

export default UrlFilterScreen;

// 导出过滤函数供 ClipboardService 使用
export async function shouldProcessUrlWithCustomRules(url) {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEY_MODE) || 'blacklist';
    const whitelistStr = await AsyncStorage.getItem(STORAGE_KEY_WHITELIST);
    const blacklistStr = await AsyncStorage.getItem(STORAGE_KEY_BLACKLIST);

    const whitelist = whitelistStr ? JSON.parse(whitelistStr) : [];
    const blacklist = blacklistStr ? JSON.parse(blacklistStr) : [];

    const urlLower = url.toLowerCase();

    if (mode === 'whitelist' && whitelist.length > 0) {
      // 白名单模式：只有匹配白名单的 URL 才处理
      return whitelist.some(pattern => urlLower.includes(pattern));
    } else if (mode === 'blacklist' && blacklist.length > 0) {
      // 黑名单模式：匹配黑名单的 URL 不处理
      return !blacklist.some(pattern => urlLower.includes(pattern));
    }

    // 没有自定义规则，返回 null 表示使用默认规则
    return null;
  } catch (error) {
    console.error('Error checking custom URL rules:', error);
    return null;
  }
}
