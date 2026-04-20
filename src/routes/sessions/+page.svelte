<script lang="ts">
	import { sessions, currentSessionId, allCheckIns, mySessions, myCheckIns } from '$lib/stores';
	import { goto } from '$app/navigation';

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
	}
	function ciCount(id: string) {
		return $allCheckIns.filter((ci) => ci.sessionId === id).length;
	}
	function select(id: string) { currentSessionId.set(id); goto('/'); }
	function remove(id: string) {
		if (!confirm('このセッションを削除しますか？')) return;
		sessions.update((l) => l.filter((s) => s.id !== id));
		if ($currentSessionId === id) currentSessionId.set(null);
	}
	// 自分が参加したセッションのみ表示（mySessions は新しい順）
	$: sorted = $mySessions;
</script>

<div class="page">
	<div class="page-head">
		<div>
			<h1 class="page-title">セッション</h1>
			<p class="page-sub">参加済み {sorted.length} 件</p>
		</div>
		<button class="btn btn-primary" on:click={() => goto('/sessions/new')}>作成</button>
	</div>

	{#if sorted.length === 0}
		<div class="card empty">
			<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
				<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
			</svg>
			<p class="empty-title">参加したセッションがありません</p>
			<p class="empty-sub">QRコードをスキャンしてイベントに参加しましょう</p>
			<button class="btn btn-primary" style="margin-top:12px" on:click={() => goto('/sessions/new')}>セッションを作成</button>
		</div>
	{:else}
		<div class="session-list">
			{#each sorted as s (s.id)}
				{@const active = $currentSessionId === s.id}
				<div class="session-card" class:active>
					<div class="session-main">
						<div class="s-info">
							<div class="s-name-row">
								<span class="s-name">{s.title}</span>
								{#if active}<span class="badge badge-blue">開催中</span>{/if}
							</div>
							<div class="s-meta">{formatDate(s.date)}{s.location ? ` · ${s.location}` : ''}</div>
							<div class="s-count">{ciCount(s.id)}名チェックイン</div>
						</div>
						<div class="s-actions">
							<button class="btn btn-ghost" style="font-size:12px;padding:5px 10px" on:click={() => goto(`/sessions/${s.id}`)}>QR</button>
							{#if !active}
								<button class="btn btn-primary" style="font-size:12px;padding:5px 12px" on:click={() => select(s.id)}>選択</button>
							{:else}
								<button class="btn btn-secondary" style="font-size:12px;padding:5px 10px" on:click={() => goto('/')}>ホームへ</button>
							{/if}
							<button class="del-btn" on:click={() => remove(s.id)}>
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
									<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
.page { display:flex; flex-direction:column; gap:12px; }
.page-head { display:flex; align-items:center; justify-content:space-between; }
.page-title { font-size:22px; font-weight:700; color:#0f172a; margin:0 0 2px; }
.page-sub   { font-size:13px; color:#94a3b8; margin:0; }

.session-list { display:flex; flex-direction:column; gap:6px; }
.session-card {
	background:#fff; border:1px solid #e2e8f0; border-radius:12px;
	padding:14px; transition:border-color .15s;
}
.session-card.active { border-color:#93c5fd; }

.session-main { display:flex; align-items:flex-start; gap:12px; }
.s-info { flex:1; min-width:0; }
.s-name-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.s-name { font-size:14px; font-weight:600; color:#0f172a; }
.s-meta  { font-size:11px; color:#94a3b8; margin-top:3px; }
.s-count { font-size:11px; color:#64748b; margin-top:2px; }

.s-actions { display:flex; align-items:center; gap:5px; flex-shrink:0; }

.del-btn {
	width:28px; height:28px; border-radius:7px; border:none; cursor:pointer;
	background:#f1f5f9; color:#94a3b8; display:flex; align-items:center; justify-content:center;
	transition:background .12s, color .12s;
}
.del-btn:hover { background:#fee2e2; color:#ef4444; }
</style>
