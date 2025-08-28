/**
 * RFC4122に準拠した簡易的な UUID v4 を生成する。
 * 内部では16進数のテンプレート文字列をランダム値で置き換える。
 * @returns ランダムな一意識別子（UUID）。
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    // y 部分は RFC4122 の仕様に従い 8,9,A,B のいずれかとなる
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
