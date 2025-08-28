// Picker コンポーネントの簡易型宣言
declare module '@react-native-picker/picker' {
  import * as React from 'react';
  export interface PickerProps {
    selectedValue?: any; // 現在選択されている値
    onValueChange?: (itemValue: any, itemIndex: number) => void; // 選択が変わった際のハンドラ
    style?: any; // Picker全体のスタイル
    itemStyle?: any; // 各アイテムのスタイル
    children?: React.ReactNode; // Picker.Item などの子要素
  }
  export class Picker extends React.Component<PickerProps> {
    static Item: React.ComponentType<{ label: string; value: any }>; // 個々の選択肢を表すコンポーネント
  }
  export default Picker;
}
