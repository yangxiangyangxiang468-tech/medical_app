import type { RequestHandler } from './$types';

const CSV_KEY = 'sessions.csv';
const BOM = '\uFEFF';

export const GET: RequestHandler = async ({ platform }) => {
	const bucket = platform?.env?.SESSIONS_BUCKET;
	if (!bucket) {
		return new Response('R2 not configured', { status: 500 });
	}

	const obj = await bucket.get(CSV_KEY);
	const text = obj ? await obj.text() : '';

	return new Response(BOM + text, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="sessions.csv"'
		}
	});
};
