// R2 上のセッションCSVを一定サイズで分割して保存する。
// sessions-001.csv, sessions-002.csv ... と増やし、書き込みは常に「最新の1シャード」だけ。
// これにより1回の保存で読み書きするサイズが件数によらず一定（<= MAX_SHARD_BYTES）になる。
// VPS へ移行するときは、このファイルと save-session / export を差し替える。

type Bucket = App.Platform['env']['SESSIONS_BUCKET'];

const PREFIX = 'sessions-';

// 1シャードの上限サイズ。超えたら次の番号の新規シャードに切り替える。
export const MAX_SHARD_BYTES = 5 * 1024 * 1024; // 5MB

export const shardKey = (n: number) => `${PREFIX}${String(n).padStart(3, '0')}.csv`;

export const shardNumber = (key: string): number | null => {
	const m = key.match(/^sessions-(\d+)\.csv$/);
	return m ? parseInt(m[1], 10) : null;
};

// 全シャードを番号の昇順で返す（key と size）。
export async function listShards(bucket: Bucket): Promise<{ key: string; size: number }[]> {
	const found: { key: string; size: number; n: number }[] = [];
	let cursor: string | undefined;
	do {
		const res = await bucket.list({ prefix: PREFIX, cursor });
		for (const o of res.objects) {
			const n = shardNumber(o.key);
			if (n !== null) found.push({ key: o.key, size: o.size, n });
		}
		cursor = res.truncated ? res.cursor : undefined;
	} while (cursor);
	found.sort((a, b) => a.n - b.n);
	return found.map(({ key, size }) => ({ key, size }));
}
