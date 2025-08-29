import { useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import PipHandler from 'react-native-pip-android';

export type PipHandlers = {
  start?: () => void;
  stop?: () => void;
  reset?: () => void;
  selectType?: () => void;
};

const ACTIONS = [
  { id: 'start', title: '開始' },
  { id: 'stop', title: '停止' },
];

/**
 * Enter Android Picture-in-Picture mode with predefined timer controls.
 */
export const enterPipMode = () => {
  try {
    PipHandler.enterPictureInPictureMode?.(300, 214, ACTIONS);
  } catch {
    // ignore errors
  }
};

/**
 * Track whether the app is currently in Picture in Picture mode.
 * Returns a boolean state and a helper to manually enter PiP.
 */
export const usePipMode = () => {
  const [inPip, setInPip] = useState(false);

  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setInPip(false);
      } else if (state === 'background') {
        setInPip(true);
      }
    });

    const enterSub = DeviceEventEmitter.addListener('onPipEnter', () => setInPip(true));
    const exitSub = DeviceEventEmitter.addListener('onPipExit', () => setInPip(false));

    return () => {
      appStateSub.remove();
      enterSub.remove();
      exitSub.remove();
    };
  }, []);

  const manualEnter = () => {
    enterPipMode();
    setInPip(true);
  };

  return { inPip, enterPip: manualEnter } as const;
};

/**
 * Manage entering Picture in Picture mode and handle actions from PiP controls.
 */
export const usePipTimerControls = (handlers: PipHandlers) => {
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        enterPipMode();
      } else if (state === 'active') {
        try { PipHandler.exitPictureInPictureMode?.(); } catch {}
      }
    });

    const pipEvent = DeviceEventEmitter.addListener('onPipAction', (e: any) => {
      switch (e?.id || e?.name || e?.action) {
        case 'start':
          handlers.start?.();
          break;
        case 'stop':
          handlers.stop?.();
          break;
        case 'reset':
          handlers.reset?.();
          break;
        case 'select':
          handlers.selectType?.();
          break;
      }
    });

    return () => {
      appStateSub.remove();
      pipEvent.remove();
    };
  }, [handlers]);
};
