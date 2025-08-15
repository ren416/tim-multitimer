import React, {createContext, useContext, useEffect, useReducer} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv4 } from '../utils/uuid';
import dayjs from 'dayjs';

export type Timer = {
  id: string;
  label: string;
  durationSec: number;
  note?: string;
};

export type TimerSet = {
  id: string;
  name: string;
  description?: string;
  timers: Timer[];
  sound?: string; // asset path
  createdAt: string;
  updatedAt: string;
};

export type HistoryEntry = {
  id: string;
  timerSetId?: string;
  timersRun: number;
  totalDurationSec: number;
  startedAt: string;
  completedAt?: string;
  cancelled?: boolean;
};

export type Settings = {
  age?: number;
  gender?: 'male'|'female'|'other'|'unspecified';
  theme: 'light'|'dark'|'system';
  primaryColor?: string;
  keepAwake?: boolean;
  enableNotifications: boolean;
};

type State = {
  timerSets: TimerSet[];
  history: HistoryEntry[];
  settings: Settings;
};

type Action =
  | { type: 'ADD_SET'; payload: Omit<TimerSet,'id'|'createdAt'|'updatedAt'> }
  | { type: 'UPDATE_SET'; payload: TimerSet }
  | { type: 'DELETE_SET'; payload: { id: string } }
  | { type: 'DUPLICATE_SET'; payload: { id: string } }
  | { type: 'LOG_START'; payload: { timerSetId?: string } }
  | { type: 'LOG_COMPLETE'; payload: { id: string; cancelled?: boolean; totalDurationSec?: number; timersRun?: number } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'HYDRATE'; payload: Partial<State> };

const initial: State = {
  timerSets: [],
  history: [],
  settings: {
    theme: 'light',
    enableNotifications: true,
    keepAwake: true,
  }
};

const STORAGE_KEY = 'tim.state.v1';

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_SET': {
      const now = dayjs().toISOString();
      const set: TimerSet = { id: uuidv4(), createdAt: now, updatedAt: now, ...action.payload };
      return { ...state, timerSets: [set, ...state.timerSets] };
    }
    case 'UPDATE_SET': {
      const updated = action.payload;
      updated.updatedAt = dayjs().toISOString();
      return {
        ...state,
        timerSets: state.timerSets.map(s => s.id === updated.id ? updated : s)
      };
    }
    case 'DELETE_SET': {
      return { ...state, timerSets: state.timerSets.filter(s => s.id !== action.payload.id) };
    }
    case 'DUPLICATE_SET': {
      const src = state.timerSets.find(s => s.id === action.payload.id);
      if (!src) return state;
      const now = dayjs().toISOString();
      const dup: TimerSet = {
        ...src,
        id: uuidv4(),
        name: src.name + ' (複製)',
        createdAt: now,
        updatedAt: now
      };
      return { ...state, timerSets: [dup, ...state.timerSets] };
    }
    case 'LOG_START': {
      const entry: HistoryEntry = {
        id: uuidv4(),
        timerSetId: action.payload.timerSetId,
        timersRun: 0,
        totalDurationSec: 0,
        startedAt: dayjs().toISOString()
      };
      return { ...state, history: [entry, ...state.history] };
    }
    case 'LOG_COMPLETE': {
      return {
        ...state,
        history: state.history.map(h => h.id === action.payload.id ? {
          ...h,
          completedAt: dayjs().toISOString(),
          cancelled: action.payload.cancelled,
          totalDurationSec: action.payload.totalDurationSec ?? h.totalDurationSec,
          timersRun: action.payload.timersRun ?? h.timersRun
        } : h)
      };
    }
    case 'UPDATE_SETTINGS': {
      return { ...state, settings: { ...state.settings, ...action.payload } };
    }
    case 'HYDRATE': {
      return { ...state, ...action.payload };
    }
    default: return state;
  }
};

const Ctx = createContext<{state: State; dispatch: React.Dispatch<Action>}>({state: initial, dispatch: ()=>{}});

export const TimerProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(STORAGE_KEY);
        if (s) {
          dispatch({ type: 'HYDRATE', payload: JSON.parse(s) });
        } else {
          // Seed example
          const example: Omit<TimerSet,'id'|'createdAt'|'updatedAt'> = {
            name: 'ポモドーロ (25-5 x2)',
            description: '25分集中 + 5分休憩を2セット',
            sound: 'beep',
            timers: [
              { id: uuidv4(), label: '集中 1', durationSec: 25*60 },
              { id: uuidv4(), label: '休憩 1', durationSec: 5*60 },
              { id: uuidv4(), label: '集中 2', durationSec: 25*60 },
              { id: uuidv4(), label: '休憩 2', durationSec: 5*60 },
            ]
          };
          const now = dayjs().toISOString();
          const set: TimerSet = { id: uuidv4(), createdAt: now, updatedAt: now, ...example };
          dispatch({ type: 'HYDRATE', payload: { ...initial, timerSets: [set] } });
        }
      } catch(e) {
        console.warn('Failed to hydrate', e);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(()=>{});
  }, [state]);

  return <Ctx.Provider value={{state, dispatch}}>{children}</Ctx.Provider>
};

export const useTimerState = () => useContext(Ctx);
