import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import apiService from '../services/ApiService';
import {isValidURL} from '../utils/urlValidator';

/**
 * 批量导入屏幕
 */
function BatchImportScreen({navigation}) {
  const [inputText, setInputText] = useState('');
  const [urls, setUrls] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // 解析输入的 URL
  const parseUrls = () => {
    if (!inputText.trim()) {
      Alert.alert('提示', '请输入要导入的链接');
      return;
    }

    // 按换行符分割，过滤空行和无效 URL
    const lines = inputText.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);
    const validUrls = [];
    const invalidUrls = [];

    lines.forEach(line => {
      // 尝试从文本中提取 URL
      const urlMatch = line.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        const url = urlMatch[0];
        if (isValidURL(url)) {
          validUrls.push(url);
        } else {
          invalidUrls.push(line);
        }
      } else if (isValidURL(line)) {
        validUrls.push(line);
      } else {
        invalidUrls.push(line);
      }
    });

    // 去重
    const uniqueUrls = [...new Set(validUrls)];

    if (uniqueUrls.length === 0) {
      Alert.alert('提示', '未找到有效的链接');
      return;
    }

    if (invalidUrls.length > 0) {
      Alert.alert(
        '提示',
        `找到 ${uniqueUrls.length} 个有效链接，${invalidUrls.length} 个无效链接已忽略`,
      );
    }

    setUrls(uniqueUrls);
  };

  // 开始导入
  const startImport = async () => {
    if (urls.length === 0) {
      Alert.alert('提示', '请先解析链接');
      return;
    }

    try {
      setImporting(true);
      setResults([]);
      setShowResults(true);

      const importResults = [];

      // 逐个导入，显示进度
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          const result = await apiService.quickSave(url);
          importResults.push({
            url,
            success: true,
            title: result.title || '导入成功',
          });
        } catch (error) {
          importResults.push({
            url,
            success: false,
            error: error.message || '导入失败',
          });
        }

        // 更新结果显示
        setResults([...importResults]);
      }

      const successCount = importResults.filter(r => r.success).length;
      const failCount = importResults.filter(r => !r.success).length;

      Alert.alert(
        '导入完成',
        `成功: ${successCount} 个\n失败: ${failCount} 个`,
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('错误', error.message || '导入过程中发生错误');
    } finally {
      setImporting(false);
    }
  };

  // 清空
  const handleClear = () => {
    setInputText('');
    setUrls([]);
    setResults([]);
    setShowResults(false);
  };

  // 移除单个 URL
  const removeUrl = (index) => {
    const newUrls = [...urls];
    newUrls.splice(index, 1);
    setUrls(newUrls);
  };

  const renderUrlItem = ({item, index}) => (
    <View style={styles.urlItem}>
      <Text style={styles.urlIndex}>{index + 1}</Text>
      <Text style={styles.urlText} numberOfLines={1}>
        {item}
      </Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeUrl(index)}>
        <Text style={styles.removeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResultItem = ({item, index}) => (
    <View style={[styles.resultItem, item.success ? styles.resultSuccess : styles.resultFail]}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultIndex}>{index + 1}</Text>
        <Text style={[styles.resultStatus, item.success ? styles.statusSuccess : styles.statusFail]}>
          {item.success ? '✓ 成功' : '✕ 失败'}
        </Text>
      </View>
      <Text style={styles.resultUrl} numberOfLines={1}>
        {item.url}
      </Text>
      <Text style={styles.resultMessage} numberOfLines={1}>
        {item.success ? item.title : item.error}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* 说明 */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>批量导入说明</Text>
        <Text style={styles.infoText}>
          1. 在下方输入框中粘贴多个链接{'\n'}
          2. 每行一个链接，或用空格分隔{'\n'}
          3. 点击"解析链接"提取有效 URL{'\n'}
          4. 确认后点击"开始导入"
        </Text>
      </View>

      {/* 输入区域 */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>输入链接</Text>
        <TextInput
          style={styles.textArea}
          value={inputText}
          onChangeText={setInputText}
          placeholder="粘贴链接到这里，每行一个..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <View style={styles.inputActions}>
          <TouchableOpacity style={styles.parseButton} onPress={parseUrls}>
            <Text style={styles.parseButtonText}>解析链接</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearInputButton} onPress={handleClear}>
            <Text style={styles.clearInputButtonText}>清空</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* URL 列表 */}
      {urls.length > 0 && (
        <View style={styles.urlSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>待导入链接 ({urls.length})</Text>
          </View>
          <FlatList
            data={urls}
            renderItem={renderUrlItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            scrollEnabled={false}
            style={styles.urlList}
          />
          <TouchableOpacity
            style={[styles.importButton, importing && styles.buttonDisabled]}
            onPress={startImport}
            disabled={importing}>
            {importing ? (
              <View style={styles.importingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.importButtonText}>
                  导入中 ({results.length}/{urls.length})
                </Text>
              </View>
            ) : (
              <Text style={styles.importButtonText}>开始导入</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 导入结果 */}
      {showResults && results.length > 0 && (
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>导入结果</Text>
          <FlatList
            data={results}
            renderItem={renderResultItem}
            keyExtractor={(item, index) => `result-${index}`}
            scrollEnabled={false}
            style={styles.resultList}
          />
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
  infoCard: {
    backgroundColor: '#eef2ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  inputSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textArea: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  parseButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  parseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearInputButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  clearInputButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  urlSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  urlList: {
    maxHeight: 300,
  },
  urlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  urlIndex: {
    width: 24,
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
  removeIcon: {
    fontSize: 14,
    color: '#9ca3af',
  },
  importButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  importingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  resultSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  resultList: {
    maxHeight: 400,
  },
  resultItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultSuccess: {
    backgroundColor: '#ecfdf5',
  },
  resultFail: {
    backgroundColor: '#fef2f2',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultIndex: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusSuccess: {
    color: '#10b981',
  },
  statusFail: {
    color: '#ef4444',
  },
  resultUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  resultMessage: {
    fontSize: 13,
    color: '#374151',
  },
  bottomPadding: {
    height: 40,
  },
});

export default BatchImportScreen;
