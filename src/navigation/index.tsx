import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TimerListScreen from '../screens/TimerListScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateScreen from '../screens/CreateScreen';
import DataManagementScreen from '../screens/DataManagementScreen';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

// 画面下部に表示されるタブナビゲーションの設定

const Tab = createBottomTabNavigator(); // ボトムタブナビゲーターを作成

/**
 * アプリ全体のルートタブナビゲーションを定義する。
 * @returns ボトムタブ付きのナビゲーションコンポーネント
 */
export default function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerStyle: { backgroundColor: Colors.primary },
        headerTitleStyle: { color: Colors.headerText },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: Colors.border },
        tabBarActiveTintColor: '#0B1D2A',
        tabBarInactiveTintColor: Colors.subText,
        tabBarIcon: ({color, size}) => {
          // タブ名と Ionicons のアイコン名を対応付け
          const map: Record<string, any> = {
            'ホーム': 'home-outline',
            'タイマー一覧': 'list-outline',
            '記録': 'stats-chart-outline',
            '設定': 'settings-outline',
          };
          return <Ionicons name={map[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      {/* 主要なタブ画面の定義 */}
      <Tab.Screen name="ホーム" component={HomeScreen} />
      {/* タブバーには表示しないモーダル画面 */}
      <Tab.Screen
        name="作成"
        component={CreateScreen}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />
      <Tab.Screen name="タイマー一覧" component={TimerListScreen} />
      <Tab.Screen name="記録" component={HistoryScreen} />
      <Tab.Screen name="設定" component={SettingsScreen} />
      {/* データエクスポートなどを行う隠し画面 */}
      <Tab.Screen
        name="データ管理"
        component={DataManagementScreen}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}
