/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `sabage-${version}`;

// ビルド成果物 + static ファイルをキャッシュ対象に
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	// ASSETS が空（開発サーバー）のときはキャッシュをスキップ
	if (ASSETS.length === 0) {
		sw.skipWaiting();
		return;
	}
	event.waitUntil(
		caches.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
			.catch(() => sw.skipWaiting()) // エラーでも進む
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE) await caches.delete(key);
			}
			sw.clients.claim();
		})
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	if (!event.request.url.startsWith('http')) return;

	// 開発サーバーのリクエストはキャッシュしない
	const url = new URL(event.request.url);
	if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

	event.respondWith(
		caches.match(event.request).then((cached) => {
			if (cached) return cached;
			return fetch(event.request).then((res) => {
				if (res.status === 200) {
					const clone = res.clone();
					caches.open(CACHE).then((c) => c.put(event.request, clone)).catch(() => {});
				}
				return res;
			}).catch(() => cached ?? new Response('Offline', { status: 503 }));
		})
	);
});
