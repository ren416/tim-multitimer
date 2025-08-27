// 型定義が提供されていないモジュール用の簡易型宣言
declare module '@react-native-community/datetimepicker' {
  import * as React from 'react';
  export interface DateTimePickerProps {
    value: Date;
    mode?: 'date' | 'time';
    display?: 'default' | 'spinner' | 'calendar' | 'inline';
    onChange: (event: any, date?: Date) => void;
    locale?: string;
  }
  export default class DateTimePicker extends React.Component<DateTimePickerProps> {}
}
