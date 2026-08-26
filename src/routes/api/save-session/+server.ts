import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fieldDefs, type SessionData } from '$lib/schema';
import { toCsvRow } from '$lib/csv';

const CSV_KEY = 'sessions.csv';

export const POST: RequestHandler = async ({ request, platform }) => {
	const { session, keys } = (await request.json()) as { session: SessionData; keys: string[] };

	const bucket = platform?.env?.SESSIONS_BUCKET;
	if (!bucket) {
		return json({ error: 'R2 not configured' }, { status: 500 });
	}

	const fields = fieldDefs.filter((f) => keys.includes(f.key));
	const row = toCsvRow(fields.map((f) => f.getValue(session)));

	const existing = await bucket.get(CSV_KEY);
	let content: string;
	if (existing) {
		const text = await existing.text();
		content = (text.endsWith('\n') ? text : text + '\n') + row + '\n';
	} else {
		const header = toCsvRow(fields.map((f) => f.label));
		content = header + '\n' + row + '\n';
	}

	await bucket.put(CSV_KEY, content);
	return json({ ok: true });
};
