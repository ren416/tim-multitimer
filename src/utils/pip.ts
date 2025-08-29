export type PipHandlers = {
  start?: () => void;
  stop?: () => void;
  reset?: () => void;
  selectType?: () => void;
};

// Fallback no-op implementation for platforms without PiP support
export const enterPipMode = () => {};

export const usePipMode = () => {
  return { inPip: false, enterPip: () => {} } as const;
};

export const usePipTimerControls = (_handlers: PipHandlers) => {};
