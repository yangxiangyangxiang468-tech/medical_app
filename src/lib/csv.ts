export function escapeCsvField(value: unknown): string {
	const str = value === null || value === undefined ? '' : String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function toCsvRow(values: unknown[]): string {
	return values.map(escapeCsvField).join(',');
}
