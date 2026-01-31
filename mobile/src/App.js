import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import ContentListScreen from './screens/ContentListScreen';
import ContentDetailScreen from './screens/ContentDetailScreen';
import TagManagementScreen from './screens/TagManagementScreen';
import SearchScreen from './screens/SearchScreen';
import OfflineReadingScreen from './screens/OfflineReadingScreen';
import BatchImportScreen from './screens/BatchImportScreen';
import UrlFilterScreen from './screens/UrlFilterScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import notificationService from './services/NotificationService';
import apiService from './services/ApiService';

const Stack = createNativeStackNavigator();

function App() {
  useEffect(() => {
    // 初始化通知服务
    notificationService.configure();

    // 初始化 API 服务（加载 token）
    apiService.init();

    console.log('[App] Initialized');
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6366f1',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{title: '外挂大脑'}}
          />
          <Stack.Screen
            name="ContentList"
            component={ContentListScreen}
            options={{title: '内容列表'}}
          />
          <Stack.Screen
            name="ContentDetail"
            component={ContentDetailScreen}
            options={{title: '内容详情'}}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{title: '搜索'}}
          />
          <Stack.Screen
            name="TagManagement"
            component={TagManagementScreen}
            options={{title: '标签管理'}}
          />
          <Stack.Screen
            name="OfflineReading"
            component={OfflineReadingScreen}
            options={{title: '离线阅读'}}
          />
          <Stack.Screen
            name="BatchImport"
            component={BatchImportScreen}
            options={{title: '批量导入'}}
          />
          <Stack.Screen
            name="UrlFilter"
            component={UrlFilterScreen}
            options={{title: 'URL 过滤规则'}}
          />
          <Stack.Screen
            name="Statistics"
            component={StatisticsScreen}
            options={{title: '统计分析'}}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{title: '设置'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
