// 2桁になるようゼロ埋めするユーティリティ関数
export const pad2 = (n: number) => {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toString().padStart(2, '0');
};

// 秒数を「HH:MM:SS」または「MM:SS」形式の文字列に変換
export const formatHMS = (sec: number) => {
  const s = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(r)}`;
  return `${pad2(m)}:${pad2(r)}`;
};
