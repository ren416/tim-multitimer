import { useEffect, useState } from 'react';
import { AppState, NativeModules } from 'react-native';

// Access the native PiP handler directly to avoid depending on the
// `react-native-pip-iphone` package, which isn't available in this repo.
// When the native module isn't linked, fall back to a noop object so that
// bundling still succeeds without the dependency installed.
const PipHandler: {
  enterPictureInPicture?: () => void;
  exitPictureInPicture?: () => void;
} = (NativeModules as any)?.PipHandler ?? {};

export type PipHandlers = {
  start?: () => void;
  stop?: () => void;
  reset?: () => void;
  selectType?: () => void;
};

/**
 * Enter iOS Picture in Picture mode.
 */
export const enterPipMode = () => {
  try {
    PipHandler.enterPictureInPicture?.();
  } catch {
    // ignore errors
  }
};

/**
 * Track whether the app is currently in Picture in Picture mode.
 */
export const usePipMode = () => {
  const [inPip, setInPip] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setInPip(state !== 'active');
    });
    return () => sub.remove();
  }, []);

  const manualEnter = () => {
    enterPipMode();
    setInPip(true);
  };

  return { inPip, enterPip: manualEnter } as const;
};

/**
 * Manage entering Picture in Picture when the app goes to background.
 */
export const usePipTimerControls = (_handlers: PipHandlers) => {
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        enterPipMode();
      }
    });
    return () => sub.remove();
  }, [_handlers]);
};

