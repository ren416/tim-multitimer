import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Pressable } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import TimerSetCard from '../components/TimerSetCard';
import { Ionicons } from '@expo/vector-icons';

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
            onEdit={() => navigation.navigate('作成', { editId: item.id })}
            onDuplicate={() => dispatch({ type: 'DUPLICATE_SET', payload: { id: item.id } })}
            onDelete={() => {
              Alert.alert(
                '削除確認',
                'このタイマーセットを削除しますか？',
                [
                  { text: 'キャンセル', style: 'cancel' },
                  {
                    text: 'セットのみ削除',
                    onPress: () => dispatch({ type: 'DELETE_SET', payload: { id: item.id } }),
                  },
                  {
                    text: 'データも削除',
                    style: 'destructive',
                    onPress: () => dispatch({ type: 'DELETE_SET_WITH_DATA', payload: { id: item.id } }),
                  },
                ],
              );
            }}
          />
        )}
        ListEmptyComponent={<Text style={{color: Colors.subText}}>まだタイマーセットがありません。右下の⊕から追加しましょう。</Text>}
      />
      <Pressable style={styles.fab} onPress={() => navigation.navigate('作成', { editId: undefined })}>
        <Ionicons name="add-circle" size={64} color={Colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fab: { position: 'absolute', right: 24, bottom: 24 },
});
