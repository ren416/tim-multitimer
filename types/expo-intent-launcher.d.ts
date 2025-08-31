declare module 'expo-intent-launcher' {
  export const ActivityAction: { MAIN: string };
  export const ActivityCategory: { HOME: string };
  export function startActivityAsync(
    action: string,
    params?: { category?: string }
  ): Promise<void>;
}
