import React from 'react'; // React本体を読み込む
import { View, Text, StyleSheet, FlatList, Alert, Pressable } from 'react-native'; // 各種UIコンポーネント
import { Colors } from '../constants/colors'; // カラー定数
import { useTimerState } from '../context/TimerContext'; // タイマーの状態管理コンテキスト
import TimerSetCard from '../components/TimerSetCard'; // タイマーセットを表示するカード
import { Ionicons } from '@expo/vector-icons'; // アイコンライブラリ

// 登録済みのタイマーセット一覧を表示する画面
export default function TimerListScreen({ navigation }: any) { // タイマーセット一覧画面
  const { state, dispatch } = useTimerState(); // 状態と操作関数を取得

  return ( // 画面描画
    <View style={styles.container}>
      {/* 登録済みタイマーセットの一覧 */}
      <FlatList
        contentContainerStyle={{ padding: 16 }} // リスト全体の余白
        data={state.timerSets} // 表示するタイマーセット配列
        keyExtractor={i => i.id} // 各アイテムの一意なキー
        renderItem={({ item }) => ( // 各タイマーセットの描画処理
          <TimerSetCard
            item={item} // 表示対象のタイマーセット
            onRun={() => navigation.navigate('ホーム', { runSetId: item.id })} // 実行ボタン押下時の処理
            onEdit={() => navigation.navigate('作成', { editId: item.id })} // 編集ボタン押下時の処理
            onDuplicate={() => dispatch({ type: 'DUPLICATE_SET', payload: { id: item.id } })} // 複製ボタン押下時の処理
            onDelete={() => { // 削除ボタン押下時の処理
              Alert.alert( // 確認ダイアログを表示
                '削除確認', // ダイアログのタイトル
                'このタイマーセットを削除しますか？', // ダイアログのメッセージ
                [ // 選択肢の配列
                  { text: 'キャンセル', style: 'cancel' }, // キャンセルボタン
                  { // セットのみ削除ボタン
                    text: 'セットのみ削除',
                    onPress: () => dispatch({ type: 'DELETE_SET', payload: { id: item.id } }),
                  },
                  { // データも削除ボタン
                    text: 'データも削除',
                    style: 'destructive',
                    onPress: () => dispatch({ type: 'DELETE_SET_WITH_DATA', payload: { id: item.id } }),
                  },
                ],
              ); // Alert終わり
            }} // onDelete終わり
          /> // TimerSetCard終わり
        )} // renderItem終わり
        ListEmptyComponent={
          <Text style={{ color: Colors.subText }}>
            まだタイマーセットがありません。右下の⊕から追加しましょう。
          </Text>
        } // データが空のときの表示
      />
      {/* 右下のフローティングボタン。新規タイマーセット作成画面へ遷移する */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('作成', { editId: undefined })}
      >
        <Ionicons name="add-circle" size={64} color={Colors.primary} />
      </Pressable>
    </View>
  ); // return終端
}

const styles = StyleSheet.create({ // 画面内で使用するスタイル
  container: { flex: 1, backgroundColor: Colors.background }, // 画面全体を背景色で塗りつぶす
  fab: { position: 'absolute', right: 24, bottom: 24 }, // 右下に配置するフローティングボタン
});

