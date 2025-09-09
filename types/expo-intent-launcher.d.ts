// Expo Intent Launcher の簡易型定義。Android の設定画面などを開くために使用。
declare module 'expo-intent-launcher' {
  export const ActivityAction: { MAIN: string };
  export const ActivityCategory: { HOME: string };
  export function startActivityAsync(
    action: string,
    params?: { category?: string }
  ): Promise<void>;
}
