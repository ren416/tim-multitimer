declare module '@react-native-community/datetimepicker' {
  import * as React from 'react';
  export interface DateTimePickerProps {
    value: Date;
    mode?: 'date' | 'time';
    display?: 'default' | 'spinner' | 'calendar';
    onChange: (event: any, date?: Date) => void;
  }
  export default class DateTimePicker extends React.Component<DateTimePickerProps> {}
}
