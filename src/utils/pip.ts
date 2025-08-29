export type PipHandlers = {
  start?: () => void;
  stop?: () => void;
  reset?: () => void;
  selectType?: () => void;
};

// No-op implementation for non-Android platforms
export const enterPipMode = () => {};

export const usePipMode = () => {
  return { inPip: false, enterPip: () => {} } as const;
};

export const usePipTimerControls = (_handlers: PipHandlers) => {};
