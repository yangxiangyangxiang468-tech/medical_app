<script lang="ts">
  const CONTAINER_SIZE = 550; // 少し小さくして画面内に収まりやすく調整

  /* ===== デフォルト ===== */
  const DEFAULT = { grid: 2, flash: 1, on: 500, off: 500 };

  /* ===== 設定 ===== */
  let gridSize = DEFAULT.grid;
  let flashCount = DEFAULT.flash;
  let onTime = DEFAULT.on;
  let offTime = DEFAULT.off;
  let colorMode: 'yellow' | 'cyan' | 'high-contrast' = 'yellow';

  /* ===== 状態 ===== */
  let sequence: number[] = [];
  let userSequence: number[] = [];
  let activeIndex: number | null = null;
  let isPlaying = false;
  let isLocked = false;
  let showInputMessage = false;
  let result: 'success' | 'fail' | null = null;
  let hasFinished = false; 
  let cancelPlay = false;

  let holdTimer: number;
  let isHolding = false;

  $: cells = Array.from({ length: gridSize * gridSize }, (_, i) => i);

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  async function start() {
    if (isPlaying || isLocked) return;
    sequence = []; userSequence = []; activeIndex = null; result = null;
    showInputMessage = false; cancelPlay = false; hasFinished = false;
    isPlaying = true; isLocked = true;

    for (let i = 0; i < flashCount; i++) {
      sequence.push(Math.floor(Math.random() * (gridSize * gridSize)));
    }

    for (const idx of sequence) {
      if (cancelPlay) break;
      activeIndex = idx;
      await sleep(onTime);
      activeIndex = null;
      await sleep(offTime);
    }
    isPlaying = false;
    if (!cancelPlay) {
      showInputMessage = true;
      setTimeout(() => (showInputMessage = false), 1500);
    }
  }

  function startHold() {
    if (!isLocked) return;
    isHolding = true;
    holdTimer = window.setTimeout(() => { executeInterrupt(); isHolding = false; }, 1000);
  }

  function clearHold() { clearTimeout(holdTimer); isHolding = false; }

  function executeInterrupt() {
    cancelPlay = true; isPlaying = false; isLocked = false;
    activeIndex = null; result = null; hasFinished = false;
  }

  function clickCell(i: number) {
    if (isPlaying || result || !isLocked) return;
    if (userSequence.length >= sequence.length) return;
    userSequence = [...userSequence, i];
  }

  function confirm() {
    if (userSequence.length !== sequence.length) return;
    result = sequence.every((v, i) => v === userSequence[i]) ? 'success' : 'fail';
    isLocked = false;
    hasFinished = true;
  }

  function resetAll() {
    if (isLocked) return;
    gridSize = DEFAULT.grid; flashCount = DEFAULT.flash;
    onTime = DEFAULT.on; offTime = DEFAULT.off;
    sequence = []; userSequence = []; activeIndex = null; result = null; hasFinished = false;
  }
</script>

<div class="app" data-color-mode={colorMode}>
  <div class="side-panel">
    <div class="scroll-area">
      <div class="group-title">設定</div>
      <div class="block">
        <div class="label">カラーモード</div>
        <div class="color-picker">
          <button class:active={colorMode === 'yellow'} on:click={() => colorMode = 'yellow'}>標準</button>
          <button class:active={colorMode === 'cyan'} on:click={() => colorMode = 'cyan'}>シアン</button>
          <button class:active={colorMode === 'high-contrast'} on:click={() => colorMode = 'high-contrast'}>高コントラスト</button>
        </div>
      </div>

      <div class="block">
        <div class="label">マス: {gridSize}x{gridSize} / 光: {flashCount}</div>
        <div class="row">
          <button disabled={isLocked} on:click={() => gridSize = Math.max(2, gridSize - 1)}>マス−</button>
          <button disabled={isLocked} on:click={() => gridSize = Math.min(5, gridSize + 1)}>マス＋</button>
        </div>
        <div class="row mt-xs">
          <button disabled={isLocked} on:click={() => flashCount = Math.max(1, flashCount - 1)}>光−</button>
          <button disabled={isLocked} on:click={() => flashCount++}>光＋</button>
        </div>
      </div>

      <div class="block">
        <div class="label">点灯/消灯 (ms)</div>
        <div class="row">
          <button disabled={isLocked} on:click={() => onTime = Math.max(10, onTime - 10)}>点−10</button>
          <button disabled={isLocked} on:click={() => onTime += 10}>点＋10</button>
        </div>
        <div class="row mt-xs">
          <button disabled={isLocked} on:click={() => offTime = Math.max(10, offTime - 10)}>消−10</button>
          <button disabled={isLocked} on:click={() => offTime += 10}>消＋10</button>
        </div>
      </div>

      <div class="group-title">操作</div>
      <div class="actions">
        <button class="primary" disabled={isLocked} on:click={start}>スタート</button>
        
        <button 
          class="interrupt-btn" 
          class:holding={isHolding}
          disabled={!isLocked}
          on:mousedown={startHold}
          on:mouseup={clearHold}
          on:mouseleave={clearHold}
          on:touchstart|preventDefault={startHold}
          on:touchend={clearHold}
        >
          <span>中断（長押し）</span>
          <div class="progress" style="transition: {isHolding ? '1s linear' : '0s'}; width: {isHolding ? '100%' : '0%'}"></div>
        </button>

        {#if hasFinished}
          <button class="replay-btn" on:click={() => {
              const temp = sequence; sequence = [];
              setTimeout(() => { sequence = temp; (async () => {
                isPlaying = true;
                for (const idx of sequence) {
                  activeIndex = idx; await sleep(onTime); activeIndex = null; await sleep(offTime);
                }
                isPlaying = false;
              })() }, 10);
            }} disabled={isPlaying}>
            正解のみ再生
          </button>
        {/if}

        <div class="row mt-sm">
          <button class="undo" on:click={() => userSequence = userSequence.slice(0, -1)} disabled={isPlaying || result || userSequence.length === 0}>1手戻る</button>
          <button class="confirm" on:click={confirm} disabled={isPlaying || result || !isLocked || userSequence.length !== sequence.length}>確定</button>
        </div>
        
        <button class="reset" on:click={resetAll} disabled={isLocked}>全体リセット</button>
      </div>
    </div>
  </div>

  <div class="main-content">
    <div class="grid-wrapper">
      <div
        class="grid"
        style="width:{CONTAINER_SIZE}px; height:{CONTAINER_SIZE}px; grid-template-columns:repeat({gridSize}, 1fr);"
      >
        {#each cells as i}
          <button class="cell" class:active={activeIndex === i} on:click={() => clickCell(i)}>
            {#each userSequence as val, idx}
              {#if val === i}
                <span class="num">{idx + 1}</span>
              {/if}
            {/each}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#if showInputMessage}<div class="overlay">入力してください</div>{/if}
  {#if result}<div class="overlay {result}" on:click={() => result = null}>{result === 'success' ? '正解！' : '失敗...'}</div>{/if}
</div>

<style>
  /* レイアウト：左にパネル、右にグリッド */
  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden; /* 全体スクロール禁止 */
    background: #e5e5e5;
    font-family: sans-serif;
  }

  .side-panel {
    width: 260px;
    background: #f8f9fa;
    border-right: 1px solid #ccc;
    display: flex;
    flex-direction: column;
  }

  .scroll-area {
    padding: 15px;
    overflow-y: auto; /* パネル内だけ必要ならスクロール */
    flex: 1;
  }

  .main-content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .group-title {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 15px 0 5px;
    border-bottom: 1px solid #ddd;
  }

  .block { background: white; padding: 8px; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .label { font-weight: bold; margin-bottom: 6px; font-size: 0.8rem; color: #333; }
  .row { display: flex; gap: 4px; }
  .row button { flex: 1; padding: 6px 2px; font-size: 0.75rem; }
  .mt-xs { margin-top: 4px; }
  .mt-sm { margin-top: 8px; }

  /* カラーボタン */
  .color-picker { display: flex; flex-direction: column; gap: 2px; }
  .color-picker button { font-size: 0.7rem; padding: 4px; border: 1px solid #ddd; }
  .color-picker button.active { background: #444; color: white; }

  /* アクションボタン */
  .actions { display: flex; flex-direction: column; gap: 6px; }
  .primary { background: #007bff; color: white; padding: 15px; font-size: 1.2rem; border: none; }
  .confirm { background: #28a745; color: white; border: none; }
  .undo { background: #6c757d; color: white; border: none; }
  .replay-btn { background: #6f42c1; color: white; border: none; padding: 10px; }
  .reset { margin-top: 10px; font-size: 0.75rem; background: #eee; }

  /* 中断ボタン */
  .interrupt-btn { position: relative; overflow: hidden; padding: 10px; background: white; }
  .interrupt-btn span { position: relative; z-index: 3; }
  .interrupt-btn .progress { position: absolute; left: 0; top: 0; bottom: 0; background: #ff4444; opacity: 0.3; z-index: 2; }

  /* グリッド表示 */
  .grid-wrapper { background: #222; padding: 12px; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
  .grid { display: grid; gap: 8px; }
  .cell { background: #444; border: none; border-radius: 6px; position: relative; cursor: pointer; transition: background 0.15s; }
  .cell:hover:not(.active) { background: #555; }

  /* カラーモードごとの発光色 */
  [data-color-mode="yellow"] .cell.active { background: #ffff00 !important; box-shadow: 0 0 30px #ffff00; }
  [data-color-mode="cyan"]   .cell.active { background: #00ffff !important; box-shadow: 0 0 30px #00ffff; }
  [data-color-mode="high-contrast"] .cell.active { background: #ffffff !important; box-shadow: 0 0 40px #ffffff; border: 5px solid #ff00ff; }

  .num { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; font-size: 2.5rem; color: white; text-shadow: 0 0 10px #000; font-weight: 900; pointer-events: none; }

  /* 結果表示（少し透過を下げてグリッドが見えるように） */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); color: white; font-size: 4rem; display: flex; justify-content: center; align-items: center; z-index: 100; cursor: pointer; text-align: center; }
  .overlay.success { border: 25px solid #44ff44; color: #44ff44; }
  .overlay.fail { border: 25px solid #ff4444; color: #ff4444; }

  button { border: 1px solid #ccc; cursor: pointer; font-weight: bold; border-radius: 4px; }
  button:hover:not(:disabled) { filter: brightness(0.9); }
  button:disabled { opacity: 0.2; cursor: not-allowed; }
</style>