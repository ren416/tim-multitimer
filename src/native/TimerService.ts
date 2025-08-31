import { NativeModules } from 'react-native';

export type TimerServiceType = {
  startTimer(setName: string, timerName: string, durationSec: number): void;
  stopTimer(): void;
  resetTimer(setName: string, timerName: string, durationSec: number): void;
  cancelTimer(): void;
};

const native: TimerServiceType | undefined = (NativeModules as any)?.TimerServiceModule;

const noop = () => {};

const fallback: TimerServiceType = {
  startTimer: noop,
  stopTimer: noop,
  resetTimer: noop,
  cancelTimer: noop,
};

const TimerService: TimerServiceType = native ?? fallback;

export default TimerService;
