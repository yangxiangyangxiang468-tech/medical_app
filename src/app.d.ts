// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

interface R2ObjectLike {
	text(): Promise<string>;
}

interface R2BucketLike {
	get(key: string): Promise<R2ObjectLike | null>;
	put(key: string, value: string): Promise<unknown>;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				SESSIONS_BUCKET: R2BucketLike;
			};
		}
	}
}

export {};
