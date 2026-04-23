export type SessionData = {
  subjectCode: string
  gridSize: number
  flashCount: number
  speedMs: number
  result: 'success' | 'fail'
  elapsedTimeMs: number
  totalMistakes: number
  sequence: number[]
  playLog: { correct: number; inputs: number[] }[]
}

export type FieldDef = {
  key: string
  label: string
  defaultEnabled: boolean
  getValue: (s: SessionData) => unknown
}

// ここに項目を追加・削除する。keyはSupabaseのカラム名と一致させる
export const fieldDefs: FieldDef[] = [
  { key: 'subject_code',    label: '被験者コード',    defaultEnabled: true,  getValue: s => s.subjectCode },
  { key: 'grid_size',       label: 'グリッドサイズ',  defaultEnabled: true,  getValue: s => s.gridSize },
  { key: 'flash_count',     label: '光の数',          defaultEnabled: true,  getValue: s => s.flashCount },
  { key: 'speed_ms',        label: '表示速度(ms)',     defaultEnabled: true,  getValue: s => s.speedMs },
  { key: 'result',          label: '結果',            defaultEnabled: true,  getValue: s => s.result },
  { key: 'elapsed_time_ms', label: '所要時間(ms)',     defaultEnabled: true,  getValue: s => s.elapsedTimeMs },
  { key: 'total_mistakes',  label: '総ミス数',         defaultEnabled: true,  getValue: s => s.totalMistakes },
  { key: 'sequence',        label: '正解配列',         defaultEnabled: false, getValue: s => s.sequence },
  { key: 'play_log',        label: '詳細ログ',         defaultEnabled: true,  getValue: s =>
    s.playLog.map((log, i) => {
      const inputs = log.inputs.map(inp => `マス${inp+1}${inp === log.correct ? '○' : '×'}`).join(' → ')
      return `第${i+1}問: 正解=マス${log.correct+1} → ${inputs}`
    }).join('\n')
  },
]
