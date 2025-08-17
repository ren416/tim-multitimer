import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TimerListScreen from '../screens/TimerListScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateScreen from '../screens/CreateScreen';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: { color: Colors.text },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: Colors.border },
        tabBarActiveTintColor: '#0B1D2A',
        tabBarInactiveTintColor: Colors.subText,
        tabBarIcon: ({color, size}) => {
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
      <Tab.Screen name="ホーム" component={HomeScreen} />
      <Tab.Screen
        name="作成"
        component={CreateScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen name="タイマー一覧" component={TimerListScreen} />
      <Tab.Screen name="記録" component={HistoryScreen} />
      <Tab.Screen name="設定" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
