declare module 'react-native-pip-iphone' {
  function enterPictureInPicture(): void;
  function exitPictureInPicture(): void;
  const PipHandler: {
    enterPictureInPicture: typeof enterPictureInPicture;
    exitPictureInPicture: typeof exitPictureInPicture;
  };
  export default PipHandler;
}

