import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { PropsWithChildren } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import RootTabs from './src/navigation';
import { TimerProvider } from './src/context/TimerContext';
import { Colors } from './src/constants/colors';
import { StatusBar } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.card,
    border: Colors.border,
    text: Colors.text,
    primary: Colors.primary,
  },
};

function WithKeepAwake({ children }: PropsWithChildren<{}>) {
  useKeepAwake();
  return <>{children}</>;
}

export default function App() {
  return (
    <TimerProvider>
      <WithKeepAwake>
        <NavigationContainer theme={theme}>
          <StatusBar barStyle="dark-content" />
          <RootTabs />
        </NavigationContainer>
      </WithKeepAwake>
    </TimerProvider>
  );
}
