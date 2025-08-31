import { useEffect, useState } from 'react';

export type PipHandlers = {
  start?: () => void;
  stop?: () => void;
  reset?: () => void;
  selectType?: () => void;
};

/**
 * Enter web Picture in Picture mode using the first video element.
 */
export const enterPipMode = () => {
  try {
    const video = document.querySelector('video') as any;
    if (video && video.requestPictureInPicture) {
      video.requestPictureInPicture();
    }
  } catch {
    // ignore errors
  }
};

/**
 * Track whether the page is in Picture in Picture mode.
 */
export const usePipMode = () => {
  const [inPip, setInPip] = useState(false);

  useEffect(() => {
    const onEnter = () => setInPip(true);
    const onLeave = () => setInPip(false);

    document.addEventListener('enterpictureinpicture', onEnter as any);
    document.addEventListener('leavepictureinpicture', onLeave as any);

    return () => {
      document.removeEventListener('enterpictureinpicture', onEnter as any);
      document.removeEventListener('leavepictureinpicture', onLeave as any);
    };
  }, []);

  return { inPip, enterPip: enterPipMode } as const;
};

/**
 * Enter Picture in Picture when the tab becomes hidden.
 */
export const usePipTimerControls = (_handlers: PipHandlers) => {
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        enterPipMode();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [_handlers]);
};

