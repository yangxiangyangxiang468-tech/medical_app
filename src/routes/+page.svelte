<script lang="ts">
import { fieldDefs } from '$lib/schema'
import { saveSession } from '$lib/storage'
import type { SessionData } from '$lib/schema'

let screen: "game" | "settings" | "review" = "game"

let settings = {
  speed: 500,
  replaySpeed: 300
}

let subjectCode = ''
let saveStatus: null | 'saving' | 'saved' | 'error' = null
let enabledKeys = new Set(fieldDefs.filter(f => f.defaultEnabled).map(f => f.key))

let gridSize = 3
let flashCount = 5

const MIN_GRID = 2
const MAX_GRID = 6
const MIN_FLASH = 1
const MAX_FLASH = 10

let sequence:number[]=[]
let userSequence:number[]=[]
let playLog:{ correct:number, inputs:number[] }[]=[]

let fullUserInputs:number[] = []
let fullUserTargets:number[] = []
let replayIndex:number|null = null
let replayStep:number|null = null

let activeIndex:number|null=null
let isPlaying=false
let result:null|"success"|"fail"=null

let mistakes:number[] = []
const maxMistakes = 2

let elapsedTime:number = 0
let stopwatchStart:number = 0
let stopwatchInterval:ReturnType<typeof setInterval> | null = null

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
$: cells = Array.from({length:gridSize*gridSize},(_,i)=>i)

function startStopwatch(){
  stopwatchStart = Date.now()
  if(stopwatchInterval) clearInterval(stopwatchInterval)
  stopwatchInterval = setInterval(()=>{
    elapsedTime = Date.now() - stopwatchStart
  }, 100)
}

function stopStopwatch(){
  if(stopwatchInterval) clearInterval(stopwatchInterval)
}

// ===== スタート =====
async function start(){
  sequence=[]
  userSequence=[]
  playLog=[]
  result=null
  fullUserInputs=[]
  fullUserTargets=[]
  activeIndex = null
  elapsedTime = 0
  saveStatus = null
  stopStopwatch()

  let pool = Array.from({ length: gridSize*gridSize }, (_, i) => i)
  pool = pool.sort(() => Math.random() - 0.5)

  sequence = pool.slice(0, Math.min(flashCount, MAX_FLASH))

  playLog = sequence.map(s => ({
    correct: s,
    inputs: []
  }))

  mistakes = Array(sequence.length).fill(0)

  isPlaying=true
  for(let i of sequence){
    activeIndex=i
    await sleep(settings.speed)
    activeIndex=null
    await sleep(300)
  }
  isPlaying=false

  startStopwatch()
}

// ===== クリック =====
async function clickCell(i:number){
  if(isPlaying || result) return

  const index = userSequence.length
  fullUserInputs.push(i)
  fullUserTargets.push(index)
  playLog[index].inputs.push(i)

  if(sequence[index] === i){
    userSequence = [...userSequence, i]

    if(userSequence.length === sequence.length){
      result="success"
      stopStopwatch()
    }

  }else{
    mistakes[index]++

    if(mistakes[index] >= maxMistakes){
      result="fail"
      stopStopwatch()
      return
    }

    userSequence = userSequence.slice(0, index)

    await replayFrom(index)
  }
}

// ===== 問題リプレイ =====
async function replayFrom(startIndex:number){
  isPlaying = true

  for(let i=startIndex;i<sequence.length;i++){
    activeIndex = sequence[i]
    await sleep(settings.speed)
    activeIndex = null
    await sleep(300)
  }

  isPlaying = false
}

// ===== 入力リプレイ =====
async function startReplay(){
  replayIndex = null
  replayStep = null

  for(let i=0;i<fullUserInputs.length;i++){
    replayIndex = fullUserInputs[i]
    replayStep = i
    await sleep(settings.replaySpeed)
  }

  replayIndex = null
  replayStep = null
}

function isReplayCorrect(){
  if(replayStep === null) return null
  const target = fullUserTargets[replayStep]
  return fullUserInputs[replayStep] === sequence[target]
}

function getMark(row:number, col:number){
  const log = playLog[row]
  if(!log) return ""
  const input = log.inputs[col]
  if(input === undefined) return ""
  return input === log.correct ? "○" : "×"
}

function getClass(row:number, col:number){
  const log = playLog[row]
  if(!log) return ""
  const input = log.inputs[col]
  if(input === undefined) return ""
  return input === log.correct ? "ok2" : "ng2"
}

async function handleSave(){
  if(!result) return
  saveStatus = 'saving'
  const session: SessionData = {
    subjectCode,
    gridSize,
    flashCount,
    speedMs: settings.speed,
    result,
    elapsedTimeMs: elapsedTime,
    totalMistakes: mistakes.reduce((a, b) => a + b, 0),
    sequence,
    playLog
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
<button on:click={()=>gridSize=Math.max(MIN_GRID,gridSize-1)}>−</button>
<span>{gridSize}×{gridSize}</span>
<button on:click={()=>gridSize=Math.min(MAX_GRID,gridSize+1)}>＋</button>
</div>
</div>

<div>
光の数
<div class="row">
<button on:click={()=>flashCount=Math.max(MIN_FLASH,flashCount-1)}>−</button>
<span>{flashCount}</span>
<button on:click={()=>flashCount=Math.min(MAX_FLASH,flashCount+1)}>＋</button>
</div>
</div>

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

{#if result && !isPlaying && sequence.length > 0}

<div class="menu-group">
<button class="menu-btn" on:click={()=>screen="review"}>
 リプレイ
</button>
</div>

<div class="result" class:success={result==="success"} class:fail={result==="fail"}>
 {result === "success" ? "成功！" : "失敗"}
</div>

<div class="elapsed">所要時間: {(elapsedTime/1000).toFixed(1)} 秒</div>

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
on:click={()=>clickCell(i)}>
</button>
{/each}
</div>
</div>

<!-- ===== 比較表 ===== -->
{#if result}
<div class="matrix-panel">

<h3>比較</h3>

<div class="matrix">

<div></div>
<div class="matrix-header">1</div>
<div class="matrix-header">2</div>

{#each sequence as _item, row (row)}
  <div class="matrix-row-label">{row+1}</div>

  <div class={`matrix-cell ${getClass(row,0)}`}>
    {getMark(row,0)}
  </div>

  <div class={`matrix-cell ${getClass(row,1)}`}>
    {getMark(row,1)}
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

<div class="field-settings">
  <h3>保存項目</h3>
  {#each fieldDefs as f}
    <label class="field-row">
      <input type="checkbox"
        checked={enabledKeys.has(f.key)}
        on:change={e => {
          if (e.currentTarget.checked) enabledKeys.add(f.key)
          else enabledKeys.delete(f.key)
          enabledKeys = new Set(enabledKeys)
        }}
      />
      {f.label}
    </label>
  {/each}
</div>

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
<input type="range" min="100" max="1000" step="100" bind:value={settings.replaySpeed} />
<div>{settings.replaySpeed} ms</div>
</div>
</div>

<!-- 中央 -->
<div class="review-center">
<div class="review-grid" style="--grid:{gridSize}">
  {#each cells as i (i)}
    <div class="review-cell"
  class:replay={replayIndex === i}
  class:okReplay={replayIndex === i && isReplayCorrect()}
  class:ngReplay={replayIndex === i && isReplayCorrect() === false}>
      {i+1}
    </div>
  {/each}
</div>
</div>

<!-- 右 -->
<div class="review-right">

<h3>結果（比較表）</h3>

<div class="simple-table">

<!-- ヘッダー -->
<div></div>
<div>正解</div>
<div>1回目</div>
<div>2回目</div>

{#each playLog as log, row (row)}
  <div>{row+1}</div>
  <div>{log.correct+1}</div>
  <div>{log.inputs[0] !== undefined ? log.inputs[0]+1 : ""}</div>
  <div>{log.inputs[1] !== undefined ? log.inputs[1]+1 : ""}</div>
{/each}

</div>

</div>

</div>
{/if}

<style>
.app{ display:flex; min-height:100vh; background:#888; }
.left{ width:200px; min-width:160px; padding:10px; background:#ddd; }
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

.field-settings{
 display:flex;
 flex-direction:column;
 gap:8px;
 background:#eee;
 padding:12px;
 border-radius:8px;
 font-size:15px;
}

.field-row{
 display:flex;
 align-items:center;
 gap:8px;
 cursor:pointer;
}

.simple-table{
 display:grid;
 grid-template-columns:30px 50px 50px 50px;
 gap:5px;
 align-items:center;
 text-align:center;
 font-size:14px;
}

.simple-table div{
 padding:6px;
 background:#ccc;
 border-radius:4px;
}

.simple-table div:nth-child(-n+4){
 font-weight:bold;
 background:#bbb;
}
.success{ background:#4caf50; }
.fail{ background:#f44336; }

.center{ flex:1; display:flex; justify-content:center; align-items:center; min-width:0; }
.grid{
  display:grid;
  gap:clamp(4px, 1vmin, 10px);
  width:min(calc(100vw - 480px), 700px);
  height:min(calc(100vw - 480px), 700px);
}
.cell{ background:#666; aspect-ratio:1/1; border-radius:10px; }
.cell.active{ background:yellow; }

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
 justify-content:center;
 align-items:center;
}

.review-right{
 width:200px;
 padding:10px;
 background:#ddd;
 overflow:hidden;
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

.log-header, .log-row{
 display:grid;
 grid-template-columns:40px 50px 50px 50px;
 text-align:center;
 margin-bottom:5px;
}

.log-header{
 font-weight:bold;
 border-bottom:2px solid #333;
 margin-bottom:10px;
}

.ok{ color:#4caf50; font-weight:bold; }

.matrix-panel{
 width:260px;
 min-width:120px;
 background:#eee;
 padding:10px;
}

@media (max-width: 1000px){
  .matrix-panel{ width:200px; }
}

@media (max-width: 820px){
  .app{ flex-wrap:wrap; height:auto; }
  .left{ width:100%; display:flex; flex-direction:row; flex-wrap:wrap; align-items:center; gap:8px; }
  .left > div, .left > button { flex-shrink:0; }
  .center{ width:100%; padding:16px 0; }
  .grid{
    width:min(80vmin, 700px);
    height:min(80vmin, 700px);
  }
  .matrix-panel{ width:100%; }
}

.matrix{
 display:grid;
 grid-template-columns:40px 40px 40px;
 gap:5px;
 align-items:center;
}

.matrix-header,
.matrix-row-label{
 width:40px;
 height:40px;
 display:flex;
 align-items:center;
 justify-content:center;
 text-align:center;
 font-weight:bold;
 background:#999;
 color:white;
 border-radius:4px;
}

.matrix-cell{
 width:40px;
 height:40px;
 display:flex;
 align-items:center;
 justify-content:center;
 background:#bbb;
}

.ok2{
 background:#4caf50;
 color:white;
}

.ng2{
 background:#f44336;
 color:white;
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
