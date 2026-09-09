import type { RequestHandler } from './$types';
import { listShards } from '$lib/sessions-store';

const BOM = '\uFEFF';

export const GET: RequestHandler = async ({ platform }) => {
	const bucket = platform?.env?.SESSIONS_BUCKET;
	if (!bucket) {
		return new Response('R2 not configured', { status: 500 });
	}

	// 全シャードを番号順に連結して1つのCSVとして返す。
	// ヘッダー行は最初のシャードのものだけ残し、2つ目以降のヘッダーは捨てる。
	const shards = await listShards(bucket);

	let out = '';
	let headerDone = false;
	for (const { key } of shards) {
		const obj = await bucket.get(key);
		if (!obj) continue;
		const text = await obj.text();
		if (text === '') continue;

		const nl = text.indexOf('\n');
		const firstLine = nl === -1 ? text : text.slice(0, nl);
		const body = nl === -1 ? '' : text.slice(nl + 1);

		if (!headerDone) {
			out += firstLine + '\n';
			headerDone = true;
		}
		out += body;
		if (body !== '' && !body.endsWith('\n')) out += '\n';
	}

	return new Response(BOM + out, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="sessions.csv"'
		}
	});
};
