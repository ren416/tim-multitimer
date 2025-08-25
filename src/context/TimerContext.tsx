import React, {createContext, useContext, useEffect, useReducer} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv4 } from '../utils/uuid';
import dayjs from 'dayjs';

export type Timer = {
  id: string;
  label: string;
  durationSec: number;
  note?: string;
  notify?: boolean;
};

export type TimerSet = {
  id: string;
  name: string;
  description?: string;
  timers: Timer[];
  sound?: string; // asset path
  notifications?: {
    enabled: boolean;
    scheduleType?: 'datetime' | 'interval';
    dateTime?: string; // ISO string
    intervalSec?: number; // seconds
    id?: string; // scheduled notification identifier
  };
  createdAt: string;
  updatedAt: string;
};

export type HistoryEntry = {
  id: string;
  timerSetId?: string;
  timerSetName?: string;
  timersRun: number;
  totalDurationSec: number;
  startedAt: string;
  completedAt?: string;
  cancelled?: boolean;
};

export type Settings = {
  theme: 'light'|'dark'|'system';
  primaryColor?: string;
  enableNotifications: boolean;
  notificationVolume: number;
};

type State = {
  timerSets: TimerSet[];
  history: HistoryEntry[];
  settings: Settings;
  hiddenTimerSetIds: string[];
};

type Action =
  | { type: 'ADD_SET'; payload: Omit<TimerSet,'id'|'createdAt'|'updatedAt'> }
  | { type: 'UPDATE_SET'; payload: TimerSet }
  | { type: 'DELETE_SET'; payload: { id: string } }
  | { type: 'DELETE_SET_WITH_DATA'; payload: { id: string } }
  | { type: 'DELETE_HISTORY_BY_SET'; payload: { id: string } }
  | { type: 'DUPLICATE_SET'; payload: { id: string } }
  | { type: 'LOG_START'; payload: { id?: string; timerSetId?: string } }
  | { type: 'LOG_COMPLETE'; payload: { id: string; cancelled?: boolean; totalDurationSec?: number; timersRun?: number } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SET_HIDDEN_SETS'; payload: { ids: string[] } }
  | { type: 'HYDRATE'; payload: Partial<State> };

const initial: State = {
  timerSets: [],
  history: [],
  settings: {
    theme: 'light',
    enableNotifications: true,
    notificationVolume: 1,
  },
  hiddenTimerSetIds: [],
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
        timerSets: state.timerSets.map(s => s.id === updated.id ? updated : s),
        history: state.history.map(h =>
          h.timerSetId === updated.id ? { ...h, timerSetName: updated.name } : h,
        ),
      };
    }
    case 'DELETE_SET': {
      const removed = state.timerSets.find(s => s.id === action.payload.id);
      const history = removed
        ? state.history.map(h =>
            h.timerSetId === removed.id && !h.timerSetName
              ? { ...h, timerSetName: removed.name }
              : h,
          )
        : state.history;
      return {
        ...state,
        timerSets: state.timerSets.filter(s => s.id !== action.payload.id),
        hiddenTimerSetIds: state.hiddenTimerSetIds.filter(id => id !== action.payload.id),
        history,
      };
    }
    case 'DELETE_SET_WITH_DATA': {
      const removed = state.timerSets.find(s => s.id === action.payload.id);
      const history = removed
        ? state.history.map(h =>
            h.timerSetId === removed.id && !h.timerSetName
              ? { ...h, timerSetName: removed.name }
              : h,
          )
        : state.history;
      return {
        ...state,
        timerSets: state.timerSets.filter(s => s.id !== action.payload.id),
        history: history.filter(h => h.timerSetId !== action.payload.id),
        hiddenTimerSetIds: state.hiddenTimerSetIds.filter(id => id !== action.payload.id),
      };
    }
    case 'DELETE_HISTORY_BY_SET': {
      return {
        ...state,
        history: state.history.filter(h => h.timerSetId !== action.payload.id),
      };
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
      const set = state.timerSets.find(s => s.id === action.payload.timerSetId);
      const entry: HistoryEntry = {
        id: action.payload.id ?? uuidv4(),
        timerSetId: action.payload.timerSetId,
        timerSetName: set?.name,
        timersRun: 0,
        totalDurationSec: 0,
        startedAt: dayjs().toISOString(),
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
    case 'SET_HIDDEN_SETS': {
      return { ...state, hiddenTimerSetIds: action.payload.ids };
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
          const parsed = JSON.parse(s);
          dispatch({
            type: 'HYDRATE',
            payload: {
              ...initial,
              ...parsed,
              settings: { ...initial.settings, ...parsed.settings },
            },
          });
        } else {
          // Seed example
          const example: Omit<TimerSet,'id'|'createdAt'|'updatedAt'> = {
            name: 'ポモドーロ (25-5 x2)',
            description: '25分集中 + 5分休憩を2セット',
            sound: 'normal',
            timers: [
              { id: uuidv4(), label: '集中 1', durationSec: 25*60, notify: true },
              { id: uuidv4(), label: '休憩 1', durationSec: 5*60, notify: true },
              { id: uuidv4(), label: '集中 2', durationSec: 25*60, notify: true },
              { id: uuidv4(), label: '休憩 2', durationSec: 5*60, notify: true },
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
