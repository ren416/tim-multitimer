import 'react-native-gesture-handler'; // React Navigationで必要なジェスチャーハンドラーを初期化
import 'react-native-reanimated'; // アニメーションを有効化するライブラリの読み込み
import React from 'react'; // React本体をインポート
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'; // ナビゲーションコンテナとデフォルトテーマ
import RootTabs from './src/navigation'; // ルートとなるタブナビゲーション
import { TimerProvider } from './src/context/TimerContext'; // タイマー機能を提供するコンテキスト
import { Colors } from './src/constants/colors'; // カラー定数を取得
import { StatusBar } from 'react-native'; // ステータスバー制御用コンポーネント
import { useKeepAwake } from 'expo-keep-awake'; // 端末のスリープを防止するフック

// アプリ全体のエントリーポイントとなるファイル。
// ここではタイマー機能を提供するコンテキストで全体をラップし、
// 画面遷移を提供するナビゲーションコンテナを初期化する。

// React Navigation のテーマ設定。
// デフォルトテーマを基に、アプリ独自の配色を上書きしている。
const theme = { // アプリ全体で利用するナビゲーションテーマ
  ...DefaultTheme, // React Navigationのデフォルト設定を展開
  colors: { // カラー設定を上書き
    ...DefaultTheme.colors, // 既定のカラー定義を展開
    background: Colors.background, // 画面全体の背景色
    card: Colors.card,             // ヘッダーやタブなどの背景色
    border: Colors.border,         // 境界線の色
    text: Colors.text,             // 文字色
    primary: Colors.primary,       // メインのアクセントカラー
  }, // colors終端
}; // theme終端

// 端末がスリープしないようにするためのラッパーコンポーネント。
// 子要素を表示しつつ、`useKeepAwake` フックでスリープを防止する。
function WithKeepAwake({ children }: { children: React.ReactNode }) { // スリープ防止用のラッパー
  useKeepAwake(); // コンポーネントが表示されている間は画面を暗くしない
  return <>{children}</>; // 子要素をそのまま表示
}

// アプリケーションのルートコンポーネント。
// タイマーコンテキスト・スリープ防止・ナビゲーションを順にネストしている。
export default function App() { // アプリケーションのルートコンポーネント
  return ( // JSXを返す
    <TimerProvider> {/* タイマー情報を提供するコンテキストで全体を包む */}
      <WithKeepAwake> {/* 端末がスリープしないようにするラッパー */}
        <NavigationContainer theme={theme}> {/* ナビゲーションを初期化しテーマを適用 */}
          <StatusBar barStyle="dark-content" /> {/* ステータスバーのスタイルをダーク文字に設定 */}
          <RootTabs /> {/* ルートのタブナビゲーションを表示 */}
        </NavigationContainer> {/* ナビゲーションコンテナ終わり */}
      </WithKeepAwake> {/* スリープ防止ラッパー終わり */}
    </TimerProvider> {/* コンテキスト終わり */}
  ); // return終端
}
