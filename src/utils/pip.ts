import { useEffect } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import PipHandler from 'react-native-pip-android';

export type PipHandlers = {
  start?: () => void;
  stop?: () => void;
  reset?: () => void;
  selectType?: () => void;
};

/**
 * Manage entering Picture in Picture mode and handle actions from PiP controls.
 */
export const usePipTimerControls = (handlers: PipHandlers) => {
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        try {
          PipHandler.enterPictureInPictureMode?.(300, 214, [
            { id: 'start', title: '開始' },
            { id: 'stop', title: '停止' },
            { id: 'reset', title: 'リセット' },
            { id: 'select', title: '種類' },
          ]);
        } catch (e) {
          // noop
        }
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
