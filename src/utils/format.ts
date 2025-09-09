/**
 * 与えられた数値を2桁にゼロ埋めして文字列化する。
 * @param n 変換対象の数値。有限でない場合は0として扱う。
 * @returns 先頭を0で埋めた2桁以上の文字列。
 */
export const pad2 = (n: number): string => {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toString().padStart(2, '0'); // 例: 5 -> "05"
};

/**
 * 秒数を人間が読みやすい "HH:MM:SS" もしくは "MM:SS" 形式へ変換する。
 * @param sec 表示したい時間（秒）。負の値や非数は0として扱う。
 * @returns フォーマット済みの時間文字列。
 */
export const formatHMS = (sec: number): string => {
  const s = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(r)}`;
  return `${pad2(m)}:${pad2(r)}`;
};
