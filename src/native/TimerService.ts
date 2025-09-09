// React Native からネイティブコードにアクセスするためのモジュール。
// ここでは、ネイティブ側に実装されたタイマー制御機能を呼び出す。
import { NativeModules } from 'react-native';

// ネイティブ側に実装されるタイマー操作用のインターフェース定義。
// アプリ側からはこの型に従ってメソッドを呼び出すだけで良い。
export type TimerServiceType = {
  /**
   * バックグラウンドでも動作するタイマーを開始する。
   * @param setName タイマーセットの名称。通知表示などに利用される。
   * @param timerName 個々のタイマー名称。
   * @param durationSec タイマーの秒数。
   */
  startTimer(setName: string, timerName: string, durationSec: number): void;
  /** タイマーを一時停止または停止する。 */
  stopTimer(): void;
  /**
   * タイマーをリセットし、残り時間を durationSec に戻す。
   * @param setName タイマーセットの名称。
   * @param timerName 個々のタイマー名称。
   * @param durationSec タイマーの秒数。
   */
  resetTimer(setName: string, timerName: string, durationSec: number): void;
  /** 現在動作しているタイマーを完全にキャンセルする。 */
  cancelTimer(): void;
};

// JS から利用可能なネイティブモジュールを取得。
// プラットフォームによっては TimerServiceModule が存在しない場合もあるため、undefined を許容。
const native: TimerServiceType | undefined = (NativeModules as any)?.TimerServiceModule;

// ネイティブモジュールが存在しない環境で呼び出されてもエラーにならないように
// 何もしないダミー関数を用意しておく。
// ネイティブ未対応環境でも呼び出しエラーを防ぐための保険。
const noop = () => {};

// ネイティブ側の実装が提供されていない環境（例: Web）では、
// すべてのメソッドが no-op のオブジェクトを使う。
// これにより、アプリ側のコードは常に TimerService を呼び出せる。
const fallback: TimerServiceType = {
  startTimer: noop,
  stopTimer: noop,
  resetTimer: noop,
  cancelTimer: noop,
};

// 実際に外部へ公開するサービス。
// ネイティブ実装があればそれを使用し、なければフォールバックの no-op 実装を利用する。
const TimerService: TimerServiceType = native ?? fallback;

// 他ファイルからは TimerService をインポートして利用するだけで、
// ネイティブ実装の有無を意識する必要がなくなる。
export default TimerService;
