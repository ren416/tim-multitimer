import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import TimerSetCard from '../components/TimerSetCard';

export default function TimerListScreen({ navigation }: any) {
  const { state, dispatch } = useTimerState();

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={{padding:16}}
        data={state.timerSets}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <TimerSetCard
            item={item}
            onRun={() => navigation.navigate('ホーム', { runSetId: item.id })}
            onEdit={() => {
              Alert.alert('未実装', '簡易版では「作成」タブから新規作成のみ対応です。');
            }}
            onDuplicate={() => dispatch({ type: 'DUPLICATE_SET', payload: { id: item.id } })}
            onDelete={() => {
              Alert.alert('削除確認', '本当に削除しますか？', [
                { text: 'キャンセル', style: 'cancel' },
                { text: '削除', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_SET', payload: { id: item.id } })}
              ]);
            }}
          />
        )}
        ListEmptyComponent={<Text style={{color: Colors.subText}}>まだタイマーセットがありません。「作成」から追加しましょう。</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
