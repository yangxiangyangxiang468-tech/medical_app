<script lang="ts">
import { fieldDefs } from '$lib/schema'
import { saveSession } from '$lib/storage'
import type { SessionData } from '$lib/schema'

let screen: "game" | "settings" | "review" = "game"

let settings = {
  speed: 500,
  replaySpeed: 500
}

let subjectCode = ''
let saveStatus: null | 'saving' | 'saved' | 'error' = null
let enabledKeys = new Set(fieldDefs.filter(f => f.defaultEnabled).map(f => f.key))

const MIN_GRID = 3
const MAX_GRID = 4
let gridSize = 3

let flashCount = 1

let sequence: number[] = []
let userSequence: number[] = []

type Attempt = { correct: number[]; inputs: number[] }
let attempts: Attempt[] = []
let currentRun = 0

type RoundRecord = { cleared: boolean; mistakes: number }
let roundHistory: RoundRecord[] = []

type GameRound = { level: number; attempts: Attempt[] }
let gameHistory: GameRound[] = []

let roundMistakeCount = 0
let totalMistakeCount = 0
const maxRoundMistakes = 2

let activeIndex: number | null = null
let isPlaying = false
let countdownText: string | null = null
let result: null | "success" | "fail" = null

let feedbackIndex: number | null = null
let feedbackCorrect: boolean | null = null

let replayIndex: number | null = null
let replayMode: "flash" | "input" | null = null
let replayCorrect: boolean | null = null
let replayLevel: number | null = null
let replayTry: number | null = null

$: replayLabel = replayMode === 'flash' ? 'お手本' : replayMode === 'input' ? 'あなたの回答' : ''

let elapsedTime = 0
let stopwatchStart = 0
let stopwatchInterval: ReturnType<typeof setInterval> | null = null

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

$: cells = Array.from({ length: gridSize * gridSize }, (_, i) => i)
$: maxFlash = gridSize * gridSize
$: gameActive = sequence.length > 0 && result === null
$: currentTry = roundMistakeCount + 1

function startStopwatch(){
  stopwatchStart = Date.now()
  if (stopwatchInterval) clearInterval(stopwatchInterval)
  stopwatchInterval = setInterval(() => {
    elapsedTime = Date.now() - stopwatchStart
  }, 100)
}

function stopStopwatch(){
  if (stopwatchInterval) clearInterval(stopwatchInterval)
}

function generateSequence(){
  const total = gridSize * gridSize
  const len = Math.min(flashCount, maxFlash)
  const pool = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5)
  sequence = pool.slice(0, len)
  userSequence = []
  const next = attempts.slice()
  next[currentRun] = { correct: sequence.slice(), inputs: [] }
  attempts = next
}

async function playRound(isRetry: boolean){
  if (!isRetry) {
    currentRun = 0
    roundMistakeCount = 0
    attempts = []
  }
  generateSequence()

  isPlaying = true
  countdownText = isRetry ? '間違えました 再開します' : 'スタートします'
  await sleep(900)
  for (let n = 3; n >= 1; n--) {
    countdownText = String(n)
    await sleep(700)
  }
  countdownText = null

  for (const i of sequence) {
    activeIndex = i
    await sleep(settings.speed)
    activeIndex = null
    await sleep(300)
  }
  isPlaying = false
}

async function start(){
  result = null
  roundHistory = []
  gameHistory = []
  flashCount = 1
  totalMistakeCount = 0
  elapsedTime = 0
  saveStatus = null
  stopStopwatch()

  await playRound(false)
  startStopwatch()
}

function cloneAttempts(list: Attempt[]): Attempt[] {
  return list.map(a => ({ correct: a.correct.slice(), inputs: a.inputs.slice() }))
}

async function clickCell(i: number){
  if (isPlaying || result) return

  const idx = userSequence.length
  const correct = sequence[idx] === i
  const next = attempts.slice()
  next[currentRun] = { ...next[currentRun], inputs: [...next[currentRun].inputs, i] }
  attempts = next

  isPlaying = true
  feedbackIndex = i
  feedbackCorrect = correct
  await sleep(500)
  feedbackIndex = null
  feedbackCorrect = null

  if (correct) {
    userSequence = [...userSequence, i]

    if (userSequence.length === sequence.length) {
      roundHistory = [...roundHistory, { cleared: true, mistakes: roundMistakeCount }]
      gameHistory = [...gameHistory, { level: flashCount, attempts: cloneAttempts(attempts) }]

      if (flashCount >= maxFlash) {
        result = "success"
        stopStopwatch()
        isPlaying = false
      } else {
        flashCount++
        await playRound(false)
      }
    } else {
      isPlaying = false
    }
  } else {
    roundMistakeCount++
    totalMistakeCount++

    if (roundMistakeCount >= maxRoundMistakes) {
      roundHistory = [...roundHistory, { cleared: false, mistakes: roundMistakeCount }]
      gameHistory = [...gameHistory, { level: flashCount, attempts: cloneAttempts(attempts) }]
      result = "fail"
      stopStopwatch()
      isPlaying = false
    } else {
      currentRun++
      await playRound(true)
    }
  }
}

async function startReplay(){
  for (const round of gameHistory) {
    for (let t = 0; t < round.attempts.length; t++) {
      const attempt = round.attempts[t]
      replayLevel = round.level
      replayTry = t + 1
      replayMode = 'flash'
      for (const c of attempt.correct) {
        replayIndex = c
        await sleep(settings.replaySpeed)
      }
      replayIndex = null

      replayMode = 'input'
      for (let k = 0; k < attempt.inputs.length; k++) {
        const inp = attempt.inputs[k]
        replayIndex = inp
        replayCorrect = attempt.correct[k] === inp
        await sleep(settings.replaySpeed)
      }
      replayIndex = null
      replayCorrect = null
    }
  }
  replayMode = null
  replayLevel = null
  replayTry = null
}

async function handleSave(){
  if (!result) return
  saveStatus = 'saving'
  const session: SessionData = {
    subjectCode,
    gridSize,
    flashCount,
    speedMs: settings.speed,
    result,
    elapsedTimeMs: elapsedTime,
    totalMistakes: totalMistakeCount,
    sequence,
    playLog: gameHistory.flatMap(r => r.attempts.map((a, t) => ({ ...a, level: r.level, try: t + 1 })))
  }
  const enabled = fieldDefs.filter(f => enabledKeys.has(f.key))
  try {
    await saveSession(session, enabled)
    saveStatus = 'saved'
  } catch {
    saveStatus = 'error'
  }
}
</script>

<!-- ===== GAME ===== -->
{#if screen === "game"}
<div class="app">

<div class="left">

<div>
被験者コード
<input class="code-input" type="text" bind:value={subjectCode} placeholder="例: P001" />
</div>

<div>
グリッド
<div class="row">
<button on:click={()=>gridSize=Math.max(MIN_GRID,gridSize-1)} disabled={gameActive}>−</button>
<span>{gridSize}×{gridSize}</span>
<button on:click={()=>gridSize=Math.min(MAX_GRID,gridSize+1)} disabled={gameActive}>＋</button>
</div>
</div>

{#if gameActive}
<div class="current-progress">{flashCount}問目 {currentTry}回目</div>
<div class="current-progress">入力: {userSequence.length}/{sequence.length}</div>
{/if}

<button class="start menu-btn" on:click={start} disabled={isPlaying}>
  スタート
</button>

<div class="menu-group">
  <button
    class="menu-btn"
    on:click={()=>screen="settings"}
    disabled={isPlaying}
  >
    設定
  </button>
</div>

{#if result && !isPlaying}

<div class="menu-group">
<button class="menu-btn" on:click={()=>screen="review"}>
 リプレイ
</button>
</div>

<div class="result" class:success={result==="success"} class:fail={result==="fail"}>
 {result === "success" ? "成功！" : "失敗"}
</div>

<div class="elapsed">所要時間: {(elapsedTime/1000).toFixed(1)} 秒</div>
<div class="elapsed">到達: {flashCount}問</div>

<button class="menu-btn save-btn"
  on:click={handleSave}
  disabled={saveStatus === 'saving' || saveStatus === 'saved'}>
  {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '保存済み' : '保存'}
</button>
{#if saveStatus === 'error'}
  <div class="save-error">保存に失敗しました</div>
{/if}

{/if}

</div>

<div class="center">
<div class="grid" style="grid-template-columns:repeat({gridSize},1fr)">
{#each cells as i (i)}
<button class="cell"
class:active={activeIndex===i}
class:feedbackOk={feedbackIndex===i && feedbackCorrect===true}
class:feedbackNg={feedbackIndex===i && feedbackCorrect===false}
on:click={()=>clickCell(i)}
aria-label={`セル ${i+1}`}>
{#if feedbackIndex===i}
<span class="cell-mark">{feedbackCorrect ? '○' : '×'}</span>
{/if}
</button>
{/each}
</div>
{#if countdownText}
<div class="countdown-overlay">{countdownText}</div>
{/if}
</div>

{#if gameActive || result}
<div class="round-status-panel">
<h3>進行状況</h3>
<div class="round-status-list">
{#each roundHistory as r, i (i)}
<div class={`round-status-chip ${r.cleared ? (r.mistakes > 0 ? 'warn2' : 'ok2') : 'ng2'}`}>
<span>{i+1}問目</span>
<span>{r.cleared ? (r.mistakes > 0 ? '○' : '◎') : '×'}</span>
</div>
{/each}
</div>
</div>
{/if}

</div>
{/if}

<!-- ===== SETTINGS ===== -->
{#if screen === "settings"}
<div class="settings">
<h2>設定</h2>

<div>
表示スピード
<input type="range" min="100" max="1000" step="100" bind:value={settings.speed} />
<div>{settings.speed} ms</div>
</div>

<a class="menu-btn csv-link" href="/api/export">データをCSVでダウンロード</a>

<button on:click={()=>screen="game"}>戻る</button>
</div>
{/if}

<!-- ===== REVIEW ===== -->
{#if screen === "review"}
<div class="review">

<!-- 左 -->
<div class="review-left">
<h2>リプレイ</h2>

<button on:click={()=>screen="game"}>戻る</button>
<button class="menu-btn" on:click={startReplay}>再生</button>

<div>
リプレイ速度
<input type="range" min="500" max="1000" step="100" bind:value={settings.replaySpeed} />
<div>{settings.replaySpeed} ms</div>
</div>
</div>

<!-- 中央 -->
<div class="review-center">
{#if replayLabel}
<div class="replay-info">
  <span class="replay-round">{replayLevel}問目 {replayTry}回目</span>
  <span class="replay-label" class:flashLabel={replayMode==='flash'} class:inputLabel={replayMode==='input'}>{replayLabel}</span>
</div>
{/if}
<div class="review-grid" style="--grid:{gridSize}">
  {#each cells as i (i)}
    <div class="review-cell"
  class:replay={replayMode === 'flash' && replayIndex === i}
  class:okReplay={replayMode === 'input' && replayIndex === i && replayCorrect === true}
  class:ngReplay={replayMode === 'input' && replayIndex === i && replayCorrect === false}>
      {i+1}
    </div>
  {/each}
</div>
</div>

<!-- 右 -->
<div class="review-right">

<h3>進行状況</h3>

<div class="round-status-list">
{#each roundHistory as r, i (i)}
<div class={`round-status-chip ${r.cleared ? (r.mistakes > 0 ? 'warn2' : 'ok2') : 'ng2'}`}>
<span>{i+1}問目</span>
<span>{r.cleared ? (r.mistakes > 0 ? '○' : '◎') : '×'}</span>
</div>
{/each}
</div>

</div>

</div>
{/if}

<style>
.app{ display:flex; height:100vh; overflow:hidden; background:#888; }
.left{ width:200px; min-width:160px; padding:10px; background:#ddd; overflow-y:auto; scrollbar-width:none; }
.left::-webkit-scrollbar{ display:none; }
.row{ display:flex; justify-content:space-between; margin:5px 0; }
.start{ width:100%; margin-top:10px; }

.result{
 margin-top:15px;
 font-size:36px;
 text-align:center;
 padding:12px;
 border-radius:12px;
 color:white;
}

.elapsed{
 margin-top:8px;
 font-size:13px;
 color:#555;
 text-align:center;
}

.code-input{
 width:100%;
 padding:6px;
 font-size:14px;
 box-sizing:border-box;
 border:1px solid #aaa;
 border-radius:4px;
 margin-top:4px;
}

.current-progress{
 margin-top:10px;
 padding:8px;
 background:#fff;
 border-radius:6px;
 text-align:center;
 font-weight:bold;
}

.save-btn{
 margin-top:8px;
}

.save-btn:disabled{
 background:#ccc;
 color:#888;
 border-color:#bbb;
 cursor:default;
}

.save-error{
 color:#f44336;
 font-size:12px;
 text-align:center;
 margin-top:4px;
}

.success{ background:#4caf50; }
.fail{ background:#f44336; }

.center{ flex:1; position:relative; display:flex; justify-content:center; align-items:center; min-width:0; min-height:0; overflow:hidden; container-type:size; }
.grid{
  display:grid;
  gap:clamp(4px, 1vmin, 10px);
  width:min(88cqw, 88cqh);
  height:min(88cqw, 88cqh);
}
.cell{ background:#666; aspect-ratio:1/1; border-radius:10px; display:flex; align-items:center; justify-content:center; }
.cell.active{ background:yellow; }
.cell.feedbackOk{ background:#4caf50; }
.cell.feedbackNg{ background:#f44336; }

.cell-mark{
 font-size:clamp(20px, 6vmin, 40px);
 font-weight:bold;
 color:white;
}

.countdown-overlay{
 position:absolute;
 inset:0;
 display:flex;
 align-items:center;
 justify-content:center;
 font-size:40px;
 font-weight:bold;
 color:#fff;
 text-align:center;
 background:rgba(0,0,0,0.45);
 border-radius:10px;
 padding:20px;
 box-sizing:border-box;
}

.settings{
 display:flex;
 flex-direction:column;
 align-items:center;
 justify-content:center;
 min-height:100vh;
 gap:25px;
 background:#ddd;
 font-size:28px;
}

/* ===== REVIEW ===== */
.review{
 display:flex;
 min-height:100vh;
 background:#888;
}

.review-left{
 width:200px;
 padding:20px;
 background:#ccc;
 display:flex;
 flex-direction:column;
 gap:20px;
}

.review-center{
 flex:1;
 display:flex;
 flex-direction:column;
 justify-content:center;
 align-items:center;
 gap:12px;
}

.replay-info{
 display:flex;
 align-items:center;
 gap:12px;
}

.replay-round{
 font-size:16px;
 font-weight:bold;
 color:#333;
}

.replay-label{
 font-size:20px;
 font-weight:bold;
 padding:8px 20px;
 border-radius:20px;
 color:white;
}

.replay-label.flashLabel{ background:#1565c0; }
.replay-label.inputLabel{ background:#e65100; }

.review-right{
 width:200px;
 padding:10px;
 background:#ddd;
 overflow-y:auto;
 box-sizing:border-box;
}

.review-grid{
 display:grid;
 grid-template-columns:repeat(var(--grid), 1fr);
 gap:10px;
 width:min(80vmin, 500px);
 height:min(80vmin, 500px);
}

.review-cell{
 display:flex;
 align-items:center;
 justify-content:center;
 background:#444;
 color:#fff;
 border:1px solid #222;
 font-size:14px;
}

.review-cell.replay{
 background:yellow;
 color:black;
}

.round-status-panel{
 width:200px;
 min-width:140px;
 background:#eee;
 padding:10px;
 overflow-y:auto;
 box-sizing:border-box;
 display:flex;
 flex-direction:column;
 scrollbar-width:none;
}
.round-status-panel::-webkit-scrollbar{ display:none; }
.round-status-panel > h3{ margin:0 0 8px; flex-shrink:0; }
.round-status-panel > .round-status-list{ margin-top:auto; }

.round-status-list{
 display:flex;
 flex-direction:column;
 gap:6px;
}

.round-status-chip{
 display:flex;
 justify-content:space-between;
 align-items:center;
 padding:6px 10px;
 border-radius:6px;
 color:white;
 font-weight:bold;
}

.ok2{
 background:#4caf50;
}

.ng2{
 background:#f44336;
}

.warn2{
 background:#1565c0;
}

@media (max-width: 1000px){
  .round-status-panel{ width:160px; }
}

@media (max-width: 820px){
  .app{ flex-direction:column; height:100vh; overflow:hidden; }
  .left{ width:100%; display:flex; flex-direction:row; flex-wrap:wrap; align-items:center; gap:8px; max-height:35vh; overflow-y:auto; flex-shrink:0; }
  .left > div, .left > button { flex-shrink:0; }
  .center{ width:100%; flex:1; min-height:0; padding:8px 0; }
  .grid{ width:min(62cqw, 62cqh); height:min(62cqw, 62cqh); }
  .round-status-panel{ width:100%; max-height:20vh; flex-shrink:0; }
}

.menu-group{
 display:flex;
 flex-direction:column;
 gap:20px;
 margin-top:10px;
}

.menu-btn{
 width:100%;
 padding:14px;
 background:#fff;
 color:#000;
 font-size:16px;
 font-weight:bold;
 border:2px solid #000;
 border-radius:8px;
 cursor:pointer;
 transition:0.2s;
}

.csv-link{
 display:block;
 box-sizing:border-box;
 text-align:center;
 text-decoration:none;
}

.menu-btn:hover{
 background:#1976d2;
 color:white;
}

.menu-btn:active{
 transform:scale(0.97);
}

.review-cell.okReplay{
 background:#4caf50;
 color:white;
}

.review-cell.ngReplay{
 background:#f44336;
 color:white;
}
</style>
