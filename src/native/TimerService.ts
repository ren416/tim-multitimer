// React Native からネイティブコードにアクセスするためのモジュール。
// フロントエンド(JavaScript)の setInterval などはアプリがバックグラウンドに
// 入ると実行が止まってしまうため、各 OS が提供するサービス(例: Android の
// Foreground Service)へ処理を委譲する必要がある。本ファイルはその橋渡し役で
// あり、タイマーを OS レベルで駆動させるためのインターフェースを公開する。
import { NativeModules } from 'react-native';

// ネイティブ側に実装されるタイマー操作用のインターフェース定義。
// アプリ側からはこの型に従ってメソッドを呼び出すだけで良い。
export type TimerServiceType = {
  /**
   * バックグラウンドでも動作するタイマーを開始する。
   * 実装例: Android では Foreground Service を起動し、カウントダウン完了時に
   * ローカル通知を送信する。iOS では BackgroundTask などを想定。
   * @param setName タイマーセットの名称。通知表示などに利用される。
   * @param timerName 個々のタイマー名称。
   * @param durationSec タイマーの秒数。
   */
  startTimer(setName: string, timerName: string, durationSec: number): void;
  /**
   * ネイティブ側で進行中のタイマーを停止する。
   * 状態は保持されるため、再度 startTimer を呼べば続きから再開できる実装を
   * 想定している。
   */
  stopTimer(): void;
  /**
   * タイマーをリセットし、残り時間を durationSec に戻す。
   * バックグラウンドサービスが保持している残り時間もこの値に再設定する。
   * @param setName タイマーセットの名称。
   * @param timerName 個々のタイマー名称。
   * @param durationSec タイマーの秒数。
   */
  resetTimer(setName: string, timerName: string, durationSec: number): void;
  /**
   * 現在動作しているタイマーを完全にキャンセルする。
   * 予約されている通知や OS 側のサービスも停止することを想定。
   */
  cancelTimer(): void;
};

// JS から利用可能なネイティブモジュールを取得。
// ビルド対象のプラットフォームに TimerServiceModule が存在しないケースも
// あるため、undefined を許容しておき、後段でフォールバック処理を行う。
const native: TimerServiceType | undefined = (NativeModules as any)?.TimerServiceModule;

// ネイティブモジュールが存在しない環境で呼び出されてもエラーにならないように
// 何もしないダミー関数を用意しておく。Web などネイティブサービスを利用できな
// い環境では実際にはバックグラウンド動作が行われないが、アプリの他の部分では
// 同じ API で呼び出せるようにするための保険である。
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
// ネイティブ実装の有無を意識する必要がなくなる。ただし fallback の場合は
// 実際にはバックグラウンド動作は行われない点に注意。
export default TimerService;
