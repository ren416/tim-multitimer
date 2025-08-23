export type SoundOption = {
  value: string;
  label: string;
  file: any;
};

export const SOUND_OPTIONS: SoundOption[] = [
  { value: 'none', label: 'なし', file: null },
  { value: 'normal', label: 'ノーマル', file: require('../../assets/sounds/normal.mp3') },
  { value: 'normal(high)', label: 'ノーマル（高）', file: require('../../assets/sounds/normal(high).mp3') },
  { value: 'simple', label: 'シンプル', file: require('../../assets/sounds/simple.mp3') },
  { value: 'slow', label: 'スロー', file: require('../../assets/sounds/slow.mp3') },
  { value: 'speed', label: 'スピード', file: require('../../assets/sounds/speed.mp3') },
  { value: 'step', label: 'ステップ', file: require('../../assets/sounds/step.mp3') },
  { value: 'taiko', label: '太鼓', file: require('../../assets/sounds/taiko.mp3') },
  { value: 'telephone', label: '電話', file: require('../../assets/sounds/telephone.mp3') },
  { value: 'bird', label: '鳥', file: require('../../assets/sounds/bird.mp3') },
  { value: 'chicken', label: 'ニワトリ', file: require('../../assets/sounds/chicken.mp3') },
  { value: 'chime', label: 'チャイム', file: require('../../assets/sounds/chime.mp3') },
  { value: 'beep', label: 'ビープ', file: require('../../assets/sounds/beep.wav') },
];

export const SOUND_FILES: Record<string, any> = SOUND_OPTIONS.reduce((acc, cur) => {
  acc[cur.value] = cur.file;
  return acc;
}, {} as Record<string, any>);
