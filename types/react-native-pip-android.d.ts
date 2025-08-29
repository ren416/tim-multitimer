declare module 'react-native-pip-android' {
  interface PipAction {
    id: string;
    title: string;
    icon?: any;
  }
  function enterPictureInPictureMode(width?: number, height?: number, actions?: PipAction[]): void;
  function exitPictureInPictureMode(): void;
  const PipHandler: {
    enterPictureInPictureMode: typeof enterPictureInPictureMode;
    exitPictureInPictureMode: typeof exitPictureInPictureMode;
  };
  export default PipHandler;
}
