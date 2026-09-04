export type SessionData = {
  subjectCode: string
  gridSize: number
  flashCount: number
  speedMs: number
  result: 'success' | 'fail'
  elapsedTimeMs: number
  totalMistakes: number
  sequence: number[]
  playLog: { correct: number[]; inputs: number[]; level: number; try: number }[]
}

export type FieldDef = {
  key: string
  label: string
  defaultEnabled: boolean
  getValue: (s: SessionData) => unknown
}

// 同じ光の数(レベル)での再挑戦を丸数字で表す。1回目は無印
const tryMark = (t: number) => ['', '', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][t] ?? `(${t})`

// ここに項目を追加・削除する。labelがCSVのヘッダー行になる
export const fieldDefs: FieldDef[] = [
  { key: 'subject_code',    label: '被験者コード',    defaultEnabled: true,  getValue: s => s.subjectCode },
  { key: 'grid_size',       label: 'グリッドサイズ',  defaultEnabled: true,  getValue: s => s.gridSize },
  { key: 'flash_count',     label: '光の数',          defaultEnabled: true,  getValue: s => s.flashCount },
  { key: 'speed_ms',        label: '表示速度(ms)',     defaultEnabled: false, getValue: s => s.speedMs },
  { key: 'result',          label: '結果',            defaultEnabled: true,  getValue: s => s.result },
  { key: 'elapsed_time_sec', label: '所要時間(秒)',     defaultEnabled: true,  getValue: s => Math.round(s.elapsedTimeMs / 10) / 100 },
  { key: 'total_mistakes',  label: '総ミス数',         defaultEnabled: true,  getValue: s => s.totalMistakes },
  { key: 'sequence',        label: '正解配列',         defaultEnabled: false, getValue: s => s.sequence },
  { key: 'play_log',        label: '詳細ログ',         defaultEnabled: true,  getValue: s =>
    s.playLog.map((a) => {
      const cleared = a.correct.every((c, r) => a.inputs[r] === c)
      return `${a.level}問目${tryMark(a.try)}${cleared ? '〇' : '×'}`
    }).join('\n')
  },
  { key: 'mistake_log',     label: 'ミス詳細',         defaultEnabled: true,  getValue: s =>
    s.playLog.flatMap((a) =>
      a.inputs
        .map((inp, r) => ({ inp, r, c: a.correct[r] }))
        .filter(x => x.inp !== x.c)
        .map(x => `${a.level}問目${tryMark(a.try)} 第${x.r+1}問 ${x.c+1}(正)→${x.inp+1}(誤)`)
    ).join('\n')
  },
]
