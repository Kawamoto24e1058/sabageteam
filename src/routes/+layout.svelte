<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	$: p = $page.url.pathname;
	$: isCheckinPage = p.startsWith('/checkin');
	$: isScanPage    = p.startsWith('/scan');
	$: showChrome    = !isCheckinPage && !isScanPage;

	// 開発中は古いService Workerをアンレジスト（干渉防止）
	onMount(() => {
		if (!browser) return;
		if (location.hostname === 'localhost' && 'serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((regs) => {
				regs.forEach((r) => r.unregister());
			});
		}
	});
</script>

{#if showChrome}
	<header class="app-header">
		<div class="app-header-inner">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#2563eb">
				<circle cx="12" cy="12" r="10"/>
				<circle cx="12" cy="10" r="3"/>
				<path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
			</svg>
			<span class="app-title">SabageManager</span>
		</div>
	</header>
{/if}

<main class="app-main" class:has-chrome={showChrome}>
	<slot />
</main>

{#if showChrome}
	<nav class="bottom-nav">
		<div class="nav-row">
			<!-- ホーム -->
			<a href="/" class="nav-link" class:active={p === '/'}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H14v-5h-4v5H4a1 1 0 0 1-1-1V9.5z"/>
				</svg>
				<span>ホーム</span>
			</a>
			<!-- スキャン -->
			<a href="/scan" class="nav-link" class:active={p.startsWith('/scan')}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="7" height="7" rx="1"/>
					<rect x="14" y="3" width="7" height="7" rx="1"/>
					<rect x="3" y="14" width="7" height="7" rx="1"/>
					<path d="M14 14h2v2h-2zM18 14h3M14 18h1M17 18h4M14 21h4M20 18v3"/>
				</svg>
				<span>スキャン</span>
			</a>
			<!-- メンバー -->
			<a href="/members" class="nav-link" class:active={p.startsWith('/members')}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
					<circle cx="9" cy="7" r="4"/>
					<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
				</svg>
				<span>メンバー</span>
			</a>
			<!-- セッション -->
			<a href="/sessions" class="nav-link" class:active={p.startsWith('/sessions')}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="4" width="18" height="18" rx="2"/>
					<line x1="16" y1="2" x2="16" y2="6"/>
					<line x1="8" y1="2" x2="8" y2="6"/>
					<line x1="3" y1="10" x2="21" y2="10"/>
				</svg>
				<span>セッション</span>
			</a>
		</div>
	</nav>
{/if}

<style>
/* ── アプリシェル ────────────────────────────────── */
:global(body) {
	margin: 0;
	background: #f8fafc;
}

.app-header {
	position: sticky;
	top: 0;
	z-index: 40;
	background: rgba(255,255,255,.92);
	backdrop-filter: blur(10px);
	border-bottom: 1px solid #e2e8f0;
}
.app-header-inner {
	display: flex;
	align-items: center;
	gap: 8px;
	max-width: 42rem;
	margin: 0 auto;
	padding: 0 16px;
	height: 52px;
}
.app-title {
	font-size: 16px;
	font-weight: 700;
	color: #0f172a;
	letter-spacing: -.01em;
}

.app-main {
	max-width: 42rem;
	margin: 0 auto;
	width: 100%;
	padding: 0;
}
.app-main.has-chrome {
	padding: 20px 16px 88px;
}

/* ── ボトムナビ ──────────────────────────────────── */
.bottom-nav {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 50;
	background: rgba(255,255,255,.95);
	backdrop-filter: blur(10px);
	border-top: 1px solid #e2e8f0;
	padding-bottom: env(safe-area-inset-bottom, 0px);
}
.nav-row {
	display: flex;          /* ← これが横並びの核心 */
	flex-direction: row;
	max-width: 42rem;
	margin: 0 auto;
}
.nav-link {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 10px 0;
	gap: 3px;
	text-decoration: none;
	color: #94a3b8;
	font-size: 10px;
	font-weight: 600;
	letter-spacing: .01em;
	transition: color .15s;
	-webkit-tap-highlight-color: transparent;
}
.nav-link.active {
	color: #2563eb;
}
</style>
