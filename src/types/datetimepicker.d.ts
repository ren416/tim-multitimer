// 型定義が提供されていないモジュール用の簡易型宣言
declare module '@react-native-community/datetimepicker' {
  import * as React from 'react';
  export interface DateTimePickerProps {
    value: Date; // 現在選択されている日時
    mode?: 'date' | 'time'; // 日付・時間どちらを選択するか
    display?: 'default' | 'spinner' | 'calendar' | 'inline'; // 表示スタイル
    onChange: (event: any, date?: Date) => void; // 日時が変更されたときのハンドラ
    locale?: string; // ロケール設定
  }
  export default class DateTimePicker extends React.Component<DateTimePickerProps> {}
}
