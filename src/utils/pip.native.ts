import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Dynamically resolve the Picture-in-Picture helper from expo-video.
// When the module isn't available (e.g. during web builds or in environments
// without the package installed) we gracefully fall back to a noop object so
// bundling still succeeds.
let PictureInPicture: any;
try {
  // eslint-disable-next-line global-require
  PictureInPicture = require('expo-video').PictureInPicture;
} catch {
  PictureInPicture = null;
}

export type PipHandlers = {
  start?: () => void;
  stop?: () => void;
  reset?: () => void;
  selectType?: () => void;
};

/**
 * Enter Picture-in-Picture mode using expo-video's helper when available.
 */
export const enterPipMode = () => {
  try {
    const start =
      PictureInPicture?.startAsync ||
      PictureInPicture?.presentPictureInPictureAsync;
    start?.();
  } catch {
    // ignore errors
  }
};

/**
 * Track whether the application is currently in PiP mode. Returns a boolean
 * state and a helper to manually enter PiP.
 */
export const usePipMode = () => {
  const [inPip, setInPip] = useState(false);

  useEffect(() => {
    const listener = PictureInPicture?.addPictureInPictureListener?.((event: any) => {
      if (typeof event === 'boolean') {
        setInPip(event);
      } else if (typeof event?.isActive === 'boolean') {
        setInPip(event.isActive);
      } else if (event?.state) {
        setInPip(event.state === 'active');
      }
    });
    return () => listener?.remove?.();
  }, []);

  const manualEnter = () => enterPipMode();

  return { inPip, enterPip: manualEnter } as const;
};

/**
 * Enter PiP when the app goes to background and handle basic actions from the
 * PiP window (when the platform supports it).
 */
export const usePipTimerControls = (handlers: PipHandlers) => {
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        enterPipMode();
      } else if (state === 'active') {
        try {
          const stop =
            PictureInPicture?.stopAsync ||
            PictureInPicture?.dismissPictureInPictureAsync;
          stop?.();
        } catch {}
      }
    });

    const controlsSub = PictureInPicture?.addPictureInPictureListener?.((e: any) => {
      switch (e?.action || e?.name) {
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
      controlsSub?.remove?.();
    };
  }, [handlers]);
};
