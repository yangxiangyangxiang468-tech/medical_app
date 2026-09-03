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
    s.playLog.map((attempt) => {
      const mark = ['', '', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][attempt.try] ?? `(${attempt.try})`
      const head = `${attempt.level}問目${mark}`
      const allCorrect = attempt.correct.every((c, r) => attempt.inputs[r] === c)
      if (allCorrect) return `${head}〇`
      const rows = attempt.inputs.map((inp, r) => {
        const c = attempt.correct[r]
        if (inp === c) return `  第${r+1}問〇`
        return `  第${r+1}問× ${c+1}〇→${inp+1}×`
      }).join('\n')
      return `${head}\n${rows}`
    }).join('\n')
  },
]
