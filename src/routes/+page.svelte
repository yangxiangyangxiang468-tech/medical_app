<script lang="ts">
  import { onMount } from 'svelte';

  let rows = 2;
  let cols = 2;
  let flashCount = 1;
  let onTime = 500;
  let offTime = 500;

  let cells: number[] = [];
  let sequence: number[] = [];
  let userIndex = 0;
  let activeIndex: number | null = null;
  let isPlaying = false;

  type Result = { challenge: number; success: number };
  let results: Record<number, Result> = {};

  $: {
    cells = Array.from({ length: rows * cols }, (_, i) => i);
    results = {};
  }

  let containerWidth = 0;
  let containerHeight = 0;

  function updateContainerSize() {
    containerWidth = Math.min(window.innerWidth - 200, 600);
    containerHeight = Math.min(window.innerHeight - 200, 600);
  }

  onMount(() => {
    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);

    return () => window.removeEventListener("resize", updateContainerSize);
  });

  $: cellSize = Math.floor(Math.min(containerWidth / cols, containerHeight / rows));

  async function start(): Promise<void> {
    if (isPlaying) return;

    isPlaying = true;
    userIndex = 0;
    sequence = [];

    if (!results[flashCount]) results[flashCount] = { challenge: 0, success: 0 };
    results[flashCount].challenge++;

    for (let i = 0; i < flashCount; i++) {
      sequence.push(Math.floor(Math.random() * cells.length));
    }

    for (const idx of sequence) {
      activeIndex = idx;
      await sleep(onTime);
      activeIndex = null;
      await sleep(offTime);
    }

    isPlaying = false;
  }

  function clickCell(index: number): void {
    if (isPlaying || sequence.length === 0) return;

    if (index === sequence[userIndex]) {
      userIndex++;
      if (userIndex === sequence.length) {
        results[flashCount].success++;
        resetRound();
      }
    } else {
      resetRound();
    }
  }

  function resetRound(): void {
    sequence = [];
    userIndex = 0;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
</script>

<div class="container">

  <div class="main-area">
    <!-- 設定サイドバー -->
    <div class="sidebar">
      <div class="controls">
        <label>縦
          <input type="number" min="1" max="6" bind:value={rows} />
        </label>

        <label>横
          <input type="number" min="1" max="6" bind:value={cols} />
        </label>

        <label>光らせる回数
          <input type="number" min="1" bind:value={flashCount} />
        </label>

        <label>光る時間(ms)
  <input type="number" min="100" step="10" bind:value={onTime} />
</label>

<label>休止時間(ms)
  <input type="number" min="100" step="10" bind:value={offTime} />
</label>

        <button type="button" class="start" on:click={start}>
          スタート
        </button>
      </div>
    </div>

    <!-- グリッド -->
    <div class="grid-wrapper">
      <div
        class="grid"
        style="
          grid-template-columns: repeat({cols}, {cellSize}px);
          justify-content: center;
        "
      >
        {#each cells as _, index}
          <button
            type="button"
            class="cell {activeIndex === index ? 'active' : ''}"
            aria-label="cell"
            on:click={() => clickCell(index)}
            style="width: {cellSize}px; height: {cellSize}px;"
          ></button>
        {/each}
      </div>
    </div>
  </div>

  <!-- 結果テーブル -->
  <table>
    <thead>
      <tr>
        <th>光数</th>
        <th>挑戦数</th>
        <th>成功数</th>
      </tr>
    </thead>
    <tbody>
      {#each Object.entries(results) as [count, r]}
        <tr>
          <td>{count}</td>
          <td>{r.challenge}</td>
          <td>{r.success}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .container {
    padding: 1rem;
    font-family: sans-serif;
    background: #f5f5f5;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .main-area {
    display: flex;
    width: 100%;
    justify-content: center;
    gap: 20px;
  }

  .sidebar {
    flex-shrink: 0;
    width: 180px;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
  }

  input {
    padding: 0.25rem;
  }

  .start {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .grid-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    min-height: 200px;
  }

  .grid {
    display: grid;
    gap: 10px;
  }

  .cell {
    background: #ccc;
    border: none;
    border-radius: 8px;
  }

  .cell.active {
    background: yellow;
  }

  table {
    border-collapse: collapse;
    margin-top: 1rem;
  }

  th, td {
    border: 1px solid #999;
    padding: 0.5rem 1rem;
  }
</style>

