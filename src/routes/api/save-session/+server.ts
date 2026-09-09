import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fieldDefs, type SessionData } from '$lib/schema';
import { toCsvRow } from '$lib/csv';
import { listShards, shardKey, shardNumber, MAX_SHARD_BYTES } from '$lib/sessions-store';

export const POST: RequestHandler = async ({ request, platform }) => {
	const { session, keys } = (await request.json()) as { session: SessionData; keys: string[] };

	const bucket = platform?.env?.SESSIONS_BUCKET;
	if (!bucket) {
		return json({ error: 'R2 not configured' }, { status: 500 });
	}

	const fields = fieldDefs.filter((f) => keys.includes(f.key));
	const header = toCsvRow(fields.map((f) => f.label));
	const row = toCsvRow(fields.map((f) => f.getValue(session)));

	const shards = await listShards(bucket);
	const last = shards[shards.length - 1];

	let targetKey: string;
	let content: string;

	if (!last) {
		// 初回：最初のシャードを作る
		targetKey = shardKey(1);
		content = header + '\n' + row + '\n';
	} else if (last.size >= MAX_SHARD_BYTES) {
		// 最新シャードが上限超過：次の番号で新規シャード（既存は読まない＝一定コスト）
		targetKey = shardKey((shardNumber(last.key) ?? shards.length) + 1);
		content = header + '\n' + row + '\n';
	} else {
		// 最新シャードに1行追記（読み書きするのは最大 MAX_SHARD_BYTES）
		const existing = await bucket.get(last.key);
		const text = existing ? await existing.text() : '';
		targetKey = last.key;
		content = text === '' ? header + '\n' + row + '\n' : (text.endsWith('\n') ? text : text + '\n') + row + '\n';
	}

	await bucket.put(targetKey, content);
	return json({ ok: true });
};
