import { getIdToken } from './firebase.client.svelte';

type FetchInit = RequestInit & { auth?: boolean };
export async function apiFetch<T>(url: string, init: FetchInit = {}): Promise<T> {
	const headers = new Headers(init.headers || {});
	if (init.auth) {
		const token = await getIdToken();
		if (!token) throw new Error('Not authenticated');
		headers.set('Authorization', `Bearer ${token}`);
	}
	const res = await fetch(url, { ...init, headers });
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`${res.status} ${res.statusText} ${text}`);
	}
	return (await res.json().catch(() => ({}))) as T;
}