<script lang="ts">
	import {
		members, sessions, currentSession, currentSessionId,
		currentCheckIns, currentCheckedInCount, currentOwnGearCount, currentRentalGearCount,
		currentTeamResult, participationCounts, teamResults, numTeams
	} from '$lib/stores';
	import { assignTeams } from '$lib/teamAssignment';
	import { TEAM_CONFIGS } from '$lib/teamColors';
	import type { TeamMember, TeamResult } from '$lib/types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let isAssigning = false;

	// 旧フォーマット（{red,yellow}）の残存データをクリア
	onMount(() => {
		if (!browser) return;
		teamResults.update((stored) => {
			const cleaned: Record<string, TeamResult> = {};
			for (const [k, v] of Object.entries(stored)) {
				if (v && Array.isArray((v as unknown as { slots?: unknown }).slots)) {
					cleaned[k] = v as TeamResult;
				}
			}
			return cleaned;
		});
	});

	async function runAssignment() {
		if (!$currentSessionId) return;
		isAssigning = true;
		await new Promise((r) => setTimeout(r, 350));
		const result = assignTeams($members, $currentCheckIns, $participationCounts, $numTeams);
		teamResults.update((r) => ({ ...r, [$currentSessionId!]: result }));
		isAssigning = false;
	}

	function resetResult() {
		if (!$currentSessionId) return;
		teamResults.update((r) => { const u = { ...r }; delete u[$currentSessionId!]; return u; });
	}

	$: sortedSessions = [...$sessions].sort((a, b) => b.date.localeCompare(a.date));

	$: checkinUrl = browser && $currentSessionId
		? `${window.location.origin}/checkin/${$currentSessionId}` : '';
	$: qrUrl = checkinUrl
		? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(checkinUrl)}`
		: '';

	let qrOpen = false;
	let copied = false;

	async function share() {
		if (!checkinUrl) return;
		if (navigator.share) await navigator.share({ title: $currentSession?.title, url: checkinUrl });
		else copy();
	}
	function copy() {
		navigator.clipboard.writeText(checkinUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
	}

	function scoreNote(m: TeamMember) {
		const parts = [m.gearType === 'own' ? '自前+2' : 'レンタル+1'];
		if (m.expScore > 0) parts.push(`経験+${m.expScore}`);
		return parts.join(' · ');
	}
</script>

<!-- ════════════════════════════════════════
     セッション未選択
════════════════════════════════════════ -->
{#if !$currentSession}
<div class="page">
	<div class="page-head">
		<h1 class="page-title">ホーム</h1>
		<p class="page-sub">今日のセッションを選択してください</p>
	</div>

	<!-- 新規作成 -->
	<button class="create-btn" on:click={() => goto('/sessions/new')}>
		<span class="create-icon">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
		</span>
		<div>
			<div class="create-label">新しいセッションを作成</div>
			<div class="create-sub">今日のイベントを登録してチーム分けを開始</div>
		</div>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
	</button>

	<!-- 過去セッション -->
	{#if sortedSessions.length > 0}
		<div class="list-section">
			<div class="section-title">過去のセッション</div>
			{#each sortedSessions.slice(0, 5) as s}
				<button class="row-item" on:click={() => { currentSessionId.set(s.id); }}>
					<div class="row-icon">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
							<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
						</svg>
					</div>
					<div class="row-body">
						<span class="row-title">{s.title}</span>
						<span class="row-sub">{formatDate(s.date)}{s.location ? ` · ${s.location}` : ''}</span>
					</div>
					<span class="row-action">選択</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- ════════════════════════════════════════
     セッション選択済み
════════════════════════════════════════ -->
{:else}
<div class="page">

	<!-- セッションバナー -->
	<div class="session-banner">
		<div class="session-info">
			<span class="session-label">開催中</span>
			<h2 class="session-name">{$currentSession.title}</h2>
			<span class="session-date">{formatDate($currentSession.date)}{$currentSession.location ? ` · ${$currentSession.location}` : ''}</span>
		</div>
		<button class="session-change" on:click={() => currentSessionId.set(null)}>変更</button>
	</div>

	<!-- 参加状況 -->
	<div class="stats-row">
		<div class="stat-card">
			<span class="stat-num">{$currentCheckedInCount}</span>
			<span class="stat-label">参加者</span>
		</div>
		<div class="stat-card">
			<span class="stat-num" style="color:#2563eb">{$currentOwnGearCount}</span>
			<span class="stat-label">自前装備</span>
		</div>
		<div class="stat-card">
			<span class="stat-num" style="color:#b45309">{$currentRentalGearCount}</span>
			<span class="stat-label">レンタル</span>
		</div>
	</div>

	<!-- QRコード -->
	<div class="card qr-section">
		<button class="qr-toggle" on:click={() => (qrOpen = !qrOpen)}>
			<div class="qr-toggle-left">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
					<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
					<path d="M14 14h2v2h-2zM18 14h3M14 18h1M17 18h4M14 21h4M20 18v3"/>
				</svg>
				<span>チェックインQRコード</span>
			</div>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"
				style="transition:transform .2s; transform:rotate({qrOpen ? 180 : 0}deg)">
				<polyline points="6 9 12 15 18 9"/>
			</svg>
		</button>

		{#if qrOpen}
			<div class="qr-body">
				<div class="qr-img-wrap">
					<img src={qrUrl} alt="QRコード" width="180" height="180" />
				</div>
				<div class="qr-url">{checkinUrl}</div>
				<div class="qr-actions">
					<button class="btn btn-primary" on:click={share}>共有する</button>
					<button class="btn btn-secondary" on:click={copy} style="{copied ? 'background:#dcfce7;color:#15803d' : ''}">
						{copied ? 'コピー済み' : 'URLをコピー'}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- 参加メンバー -->
	{#if $currentCheckedInCount > 0}
		<div class="card">
			<div class="section-title">参加メンバー</div>
			<div class="chips">
				{#each $currentCheckIns as ci}
					{@const m = $members.find((x) => x.id === ci.memberId)}
					{#if m}
						<span class="chip {ci.gearType === 'own' ? 'chip-own' : 'chip-rental'}">{m.name}</span>
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- チーム分け -->
	<div class="card">
		<div class="section-title">チーム分け</div>

		<div class="team-count-section">
			<span class="team-count-label">チーム数</span>
			<div class="team-count-btns">
				{#each [2, 3, 4, 5, 6] as n}
					<button
						class="team-count-btn"
						class:selected={$numTeams === n}
						on:click={() => numTeams.set(n)}
					>{n}</button>
				{/each}
			</div>
		</div>

		<div class="assign-actions">
			<button
				class="btn btn-primary"
				style="flex:1; justify-content:center; padding:12px;"
				disabled={$currentCheckedInCount < 2 || isAssigning}
				on:click={runAssignment}
			>
				{#if isAssigning}振り分け中…{:else}チーム分けを実行{/if}
			</button>
			{#if $currentTeamResult?.slots}
				<button class="btn btn-secondary" on:click={resetResult}>リセット</button>
			{/if}
		</div>

		{#if $currentCheckedInCount < 2}
			<p class="hint">2名以上のチェックインが必要です</p>
		{/if}
	</div>

	<!-- 振り分け結果 -->
	{#if $currentTeamResult?.slots}
		{@const slots = $currentTeamResult.slots}
		{@const maxS = Math.max(...slots.map(s => s.totalScore))}
		{@const minS = Math.min(...slots.map(s => s.totalScore))}
		<div>
			<div class="result-header">
				<span class="result-title">振り分け結果</span>
				<span class="result-diff">スコア差 {maxS - minS}pt</span>
			</div>

			<div class="result-grid">
				{#each slots as slot}
					<div class="team-card" style="border-color:{slot.config.borderColor}">
						<div class="team-header" style="background:{slot.config.headerBg}">
							<span class="team-name" style="color:{slot.config.headerText}">{slot.config.name}</span>
							<span class="team-score" style="color:{slot.config.headerText}">{slot.totalScore}pt</span>
						</div>
						<div class="team-body" style="background:{slot.config.lightBg}">
							{#each slot.members as m}
								<div class="team-member">
									<span class="team-member-name">{m.name}</span>
									<span class="team-member-score" style="color:{slot.config.accentText}">{m.totalScore}pt</span>
								</div>
								<div class="team-member-note">{scoreNote(m)}</div>
							{/each}
							{#if slot.members.length === 0}
								<p class="team-empty">メンバーなし</p>
							{/if}
						</div>
						<div class="team-footer" style="background:{slot.config.lightBg};border-color:{slot.config.borderColor}">
							<span style="color:{slot.config.accentText};font-size:11px;font-weight:600">{slot.members.length}名</span>
						</div>
					</div>
				{/each}
			</div>

			<div class="score-legend card" style="margin-top:8px">
				<div class="section-title">スコア計算</div>
				<div class="legend-grid">
					<span>自前装備</span><span>+2pt</span>
					<span>レンタル</span><span>+1pt</span>
					<span>参加5回〜</span><span>+1pt</span>
					<span>参加10回〜</span><span>+2pt</span>
				</div>
			</div>
		</div>
	{/if}
</div>
{/if}

<style>
.page { display:flex; flex-direction:column; gap:12px; }
.page-head { margin-bottom:4px; }
.page-title { font-size:22px; font-weight:700; color:#0f172a; margin:0 0 2px; }
.page-sub   { font-size:13px; color:#94a3b8; margin:0; }

/* 新規作成ボタン */
.create-btn {
	display:flex; align-items:center; gap:14px;
	width:100%; text-align:left;
	background:#fff; border:1px solid #e2e8f0; border-radius:12px;
	padding:16px; cursor:pointer; transition:border-color .15s, box-shadow .15s;
	box-shadow:0 1px 3px rgba(0,0,0,.06);
}
.create-btn:hover { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.08); }
.create-icon {
	width:40px; height:40px; border-radius:10px; background:#2563eb;
	display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0;
}
.create-label { font-size:14px; font-weight:600; color:#0f172a; }
.create-sub   { font-size:12px; color:#94a3b8; margin-top:2px; }

/* セッション行 */
.list-section { display:flex; flex-direction:column; gap:2px; }
.row-item {
	display:flex; align-items:center; gap:12px;
	background:#fff; border:1px solid #e2e8f0; border-radius:10px;
	padding:12px 14px; cursor:pointer; width:100%; text-align:left;
	transition:background .12s;
}
.row-item:hover { background:#f8fafc; }
.row-icon { width:32px; height:32px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#64748b; flex-shrink:0; }
.row-body { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
.row-title { font-size:13px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.row-sub   { font-size:11px; color:#94a3b8; }
.row-action { font-size:12px; font-weight:600; color:#2563eb; flex-shrink:0; }

/* セッションバナー */
.session-banner {
	background:#2563eb; border-radius:12px; padding:16px;
	display:flex; align-items:flex-start; justify-content:space-between; gap:8px;
}
.session-info { display:flex; flex-direction:column; gap:2px; }
.session-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#bfdbfe; }
.session-name  { font-size:18px; font-weight:700; color:#fff; margin:0; line-height:1.2; }
.session-date  { font-size:12px; color:#bfdbfe; }
.session-change {
	background:rgba(255,255,255,.15); color:#fff; border:none; border-radius:7px;
	padding:5px 10px; font-size:12px; font-weight:600; cursor:pointer; flex-shrink:0;
	transition:background .15s;
}
.session-change:hover { background:rgba(255,255,255,.25); }

/* 参加状況 */
.stats-row { display:flex; gap:8px; }
.stat-card {
	flex:1; background:#fff; border:1px solid #e2e8f0; border-radius:10px;
	padding:12px 8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.05);
}
.stat-num   { display:block; font-size:22px; font-weight:700; color:#0f172a; line-height:1; }
.stat-label { display:block; font-size:11px; color:#94a3b8; margin-top:4px; }

/* QR */
.qr-section { padding:14px 16px; }
.qr-toggle {
	display:flex; align-items:center; justify-content:space-between;
	background:none; border:none; cursor:pointer; width:100%; padding:0;
}
.qr-toggle-left { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#0f172a; }
.qr-body { margin-top:16px; display:flex; flex-direction:column; gap:12px; }
.qr-img-wrap { display:flex; justify-content:center; }
.qr-img-wrap img { border-radius:10px; border:1px solid #e2e8f0; }
.qr-url { font-size:11px; color:#94a3b8; font-family:monospace; background:#f8fafc; border-radius:7px; padding:8px 10px; word-break:break-all; }
.qr-actions { display:flex; gap:8px; }
.qr-actions .btn { flex:1; justify-content:center; }

/* チップ */
.chips { display:flex; flex-wrap:wrap; gap:6px; }

/* チーム数 */
.team-count-section { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.team-count-label { font-size:13px; font-weight:600; color:#475569; }
.team-count-btns { display:flex; gap:4px; }
.team-count-btn {
	width:36px; height:36px; border-radius:8px; border:1px solid #e2e8f0;
	background:#f8fafc; color:#64748b; font-weight:600; font-size:14px;
	cursor:pointer; transition:all .15s;
}
.team-count-btn.selected { background:#2563eb; color:#fff; border-color:#2563eb; }

.assign-actions { display:flex; gap:8px; }
.hint { font-size:11px; color:#94a3b8; text-align:center; margin:6px 0 0; }

/* 結果 */
.result-header { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:10px; }
.result-title { font-size:15px; font-weight:700; color:#0f172a; }
.result-diff  { font-size:12px; color:#94a3b8; }

.result-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }

.team-card { border:2px solid; border-radius:14px; overflow:hidden; }
.team-header { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; }
.team-name  { font-size:13px; font-weight:700; }
.team-score { font-size:13px; font-weight:700; }
.team-body  { padding:8px; display:flex; flex-direction:column; gap:4px; }
.team-member { display:flex; align-items:center; justify-content:space-between; background:#fff; border-radius:8px; padding:7px 10px 2px; }
.team-member-name  { font-size:12px; font-weight:600; color:#0f172a; }
.team-member-score { font-size:11px; font-weight:700; }
.team-member-note  { font-size:10px; color:#94a3b8; background:#fff; border-radius:0 0 8px 8px; padding:0 10px 6px; margin-top:-2px; }
.team-empty { font-size:11px; color:#94a3b8; text-align:center; padding:8px 0; margin:0; }
.team-footer { padding:6px 14px; border-top:1px solid; }

.score-legend { padding:14px 16px; }
.legend-grid {
	display:grid; grid-template-columns:1fr auto;
	gap:4px 16px; font-size:12px; color:#475569;
}
.legend-grid span:nth-child(even) { font-weight:700; color:#0f172a; text-align:right; }
</style>
