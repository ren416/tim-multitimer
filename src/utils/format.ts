export const pad2 = (n: number) => n.toString().padStart(2, '0');

export const formatHMS = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(r)}`;
  return `${pad2(m)}:${pad2(r)}`;
};
