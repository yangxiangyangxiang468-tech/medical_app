import type { SessionData, FieldDef } from './schema';

// VPSへ移行するときは、このファイルと src/routes/api/save-session, src/routes/api/export を変更する

export async function saveSession(session: SessionData, enabledFields: FieldDef[]): Promise<void> {
	const keys = enabledFields.map((f) => f.key);
	const res = await fetch('/api/save-session', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ session, keys })
	});
	if (!res.ok) throw new Error('保存に失敗しました');
}
