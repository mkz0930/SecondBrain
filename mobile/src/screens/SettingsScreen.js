import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/ApiService';
import clipboardMonitor from '../services/ClipboardService';

function SettingsScreen() {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkInterval, setCheckInterval] = useState('2');
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedServerUrl = await AsyncStorage.getItem('server_url');
      const savedUsername = await AsyncStorage.getItem('username');
      const savedCheckInterval = await AsyncStorage.getItem('check_interval');
      const savedAutoSync = await AsyncStorage.getItem('auto_sync');

      if (savedServerUrl) setServerUrl(savedServerUrl);
      if (savedUsername) setUsername(savedUsername);
      if (savedCheckInterval) setCheckInterval(savedCheckInterval);
      if (savedAutoSync) setAutoSync(savedAutoSync === 'true');

      // 检查登录状态
      await apiService.init();
      setIsLoggedIn(!!apiService.token);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('错误', '请输入用户名和密码');
      return;
    }

    try {
      await apiService.login(username, password);
      await AsyncStorage.setItem('username', username);
      setIsLoggedIn(true);
      setPassword('');
      Alert.alert('成功', '登录成功');
    } catch (error) {
      Alert.alert('登录失败', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setIsLoggedIn(false);
      setPassword('');
      Alert.alert('成功', '已退出登录');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await AsyncStorage.setItem('server_url', serverUrl);
      await AsyncStorage.setItem('check_interval', checkInterval);
      await AsyncStorage.setItem('auto_sync', autoSync.toString());

      // 更新剪切板检查间隔
      const interval = parseInt(checkInterval, 10);
      if (interval >= 1 && interval <= 10) {
        clipboardMonitor.setCheckInterval(interval * 1000);
      }

      Alert.alert('成功', '设置已保存');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 服务器设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>服务器设置</Text>
        <Text style={styles.label}>服务器地址</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://your-server.com"
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      {/* 账号设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>账号设置</Text>
        {isLoggedIn ? (
          <View>
            <Text style={styles.infoText}>已登录: {username}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>退出登录</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>用户名</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="请输入用户名"
              autoCapitalize="none"
            />
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="请输入密码"
              secureTextEntry
            />
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>登录</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 监听设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>监听设置</Text>
        <Text style={styles.label}>检查间隔（秒）</Text>
        <TextInput
          style={styles.input}
          value={checkInterval}
          onChangeText={setCheckInterval}
          placeholder="2"
          keyboardType="numeric"
        />
        <Text style={styles.hint}>建议设置为 2-5 秒，过短会增加电量消耗</Text>
      </View>

      {/* 同步设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>同步设置</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>自动同步</Text>
          <Switch value={autoSync} onValueChange={setAutoSync} />
        </View>
        <Text style={styles.hint}>
          开启后将自动同步到飞书多维表格
        </Text>
      </View>

      {/* 保存按钮 */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
        <Text style={styles.saveButtonText}>保存设置</Text>
      </TouchableOpacity>

      {/* 关于 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <Text style={styles.aboutText}>
          外挂大脑 Android 版{'\n'}
          版本: 1.0.0{'\n'}
          {'\n'}
          功能特性:{'\n'}
          • 后台剪切板监听{'\n'}
          • 智能 URL 识别{'\n'}
          • AI 内容分析{'\n'}
          • 飞书多维表格同步{'\n'}
          • 离线队列管理
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
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
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
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10b981',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
});

export default SettingsScreen;
