<script lang="ts">
	import {
		members, currentSession, currentSessionId,
		currentCheckIns, currentCheckedInCount, currentOwnGearCount, currentRentalGearCount,
		currentTeamResult, participationCounts, numTeams,
		currentUser, currentUserId, myParticipatedSessions, myCheckIns,
		checkInMember, checkOutMember, saveTeamResult, clearTeamResult,
		endSession as endSessionFirestore
	} from '$lib/stores';
	import { assignTeams } from '$lib/teamAssignment';
	import { TEAM_CONFIGS } from '$lib/teamColors';
	import type { TeamMember, GearType } from '$lib/types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	let isAssigning = false;

	async function runAssignment() {
		if (!$currentSessionId) return;
		isAssigning = true;
		await new Promise((r) => setTimeout(r, 350));
		const result = assignTeams($members, $currentCheckIns, $participationCounts, $numTeams);
		await saveTeamResult($currentSessionId, result);
		isAssigning = false;
	}

	async function resetResult() {
		if (!$currentSessionId) return;
		await clearTeamResult($currentSessionId);
	}

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

	// 作成者かどうか
	$: isCreator = !!$currentSession && !!$currentUserId &&
		$currentSession.createdBy === $currentUserId;

	// 自分がチェックイン済みかどうか
	$: isMember = !!$currentUserId && $currentCheckIns.some(ci => ci.memberId === $currentUserId);
	$: myCurrentCi = $currentCheckIns.find(ci => ci.memberId === $currentUserId) ?? null;

	// ── 自分の参加トグル ────────────────────────────────────
	let selfGear: GearType = 'own';
	let selfLoading = false;

	async function selfCheckIn() {
		if (!$currentSessionId || !$currentUserId || selfLoading) return;
		selfLoading = true;
		try { await checkInMember($currentSessionId, $currentUserId, selfGear); }
		finally { selfLoading = false; }
	}

	async function selfCheckOut() {
		if (!$currentSessionId || !$currentUserId || selfLoading) return;
		selfLoading = true;
		try { await checkOutMember($currentSessionId, $currentUserId); }
		finally { selfLoading = false; }
	}

	// ── セッション終了（作成者のみ） ────────────────────────
	let ending = false;
	async function endSession() {
		if (!$currentSessionId || !isCreator || ending) return;
		if (!confirm('セッションを終了しますか？\n全員がチェックアウトされます。')) return;
		ending = true;
		try {
			const sid = $currentSessionId;
			const memberIds = $currentCheckIns.map(ci => ci.memberId);
			currentSessionId.set(null);
			// チーム結果は履歴として保持したまま全員チェックアウト＆ステータス更新
			await endSessionFirestore(sid, memberIds);
		} finally {
			ending = false;
		}
	}

	// チェックイン済みメンバーIDセット
	$: checkedInIds = new Set($currentCheckIns.map(ci => ci.memberId));

	// 管理パネルの開閉
	let adminOpen = false;

	// 選択中の装備タイプ（メンバーごと）
	let gearSelections: Record<string, GearType> = {};

	function getGear(memberId: string): GearType {
		return gearSelections[memberId] ?? 'own';
	}

	let ciLoading: Record<string, boolean> = {};

	async function toggleCheckIn(memberId: string) {
		if (!$currentSessionId || ciLoading[memberId]) return;
		ciLoading[memberId] = true;
		ciLoading = { ...ciLoading };
		try {
			if (checkedInIds.has(memberId)) {
				await checkOutMember($currentSessionId, memberId);
			} else {
				await checkInMember($currentSessionId, memberId, getGear(memberId));
			}
		} finally {
			ciLoading[memberId] = false;
			ciLoading = { ...ciLoading };
		}
	}
</script>

<!-- ════════════════════════════════════════
     セッション未選択
════════════════════════════════════════ -->
{#if !$currentSession}
<div class="page">
	<!-- 挨拶 -->
	<div class="greeting-card">
		<div class="greeting-avatar">{$currentUser?.name[0] ?? '?'}</div>
		<div>
			<div class="greeting-name">{$currentUser?.name ?? ''}</div>
			<div class="greeting-meta">
				{$currentUser?.studentId ?? ''}
				{#if $myCheckIns.length > 0}
					· 累計 {$myCheckIns.length} 回参加
				{/if}
			</div>
		</div>
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

	<!-- 参加履歴（チェックインしたセッションのみ） -->
	{#if $myParticipatedSessions.length > 0}
		<div class="list-section">
			<div class="section-title">参加履歴</div>
			{#each $myParticipatedSessions.slice(0, 8) as s}
				{@const myCi = $myCheckIns.find(ci => ci.sessionId === s.id)}
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
					{#if myCi}
						<span class="gear-badge {myCi.gearType === 'own' ? 'gear-own' : 'gear-rental'}">
							{myCi.gearType === 'own' ? '自前' : 'レンタル'}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{:else}
		<div class="card empty-hint">
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:8px">
				<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
			</svg>
			<p class="empty-title">まだ参加したイベントはありません</p>
			<p class="empty-sub">QRコードをスキャンしてイベントに参加しましょう</p>
			<button class="btn btn-primary" style="margin-top:12px" on:click={() => goto('/scan')}>QRをスキャン</button>
		</div>
	{/if}
</div>

<!-- ════════════════════════════════════════
     セッション選択済み
════════════════════════════════════════ -->
{:else}
<div class="page">

	<!-- セッションバナー（共通） -->
	<div class="session-banner" class:banner-member={!isCreator}>
		<div class="session-info">
			<span class="session-label">{isCreator ? '主催中' : '参加中'}</span>
			<h2 class="session-name">{$currentSession.title}</h2>
			<span class="session-date">{formatDate($currentSession.date)}{$currentSession.location ? ` · ${$currentSession.location}` : ''}</span>
		</div>
		{#if isCreator}
			<button class="session-change" on:click={() => currentSessionId.set(null)}>変更</button>
		{/if}
	</div>

	<!-- 参加状況（共通） -->
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

	<!-- 自分の参加状態トグル（全員共通） -->
	{#if $currentUserId}
		<div class="card self-status-card">
			{#if isMember}
				<!-- 参加中 → 不参加にするボタン -->
				<div class="self-status-row">
					<div class="self-status-info">
						<span class="self-status-dot"></span>
						<span class="self-status-label">参加中</span>
						<span class="gear-badge-sm {myCurrentCi?.gearType === 'own' ? 'gear-own-sm' : 'gear-rental-sm'}">
							{myCurrentCi?.gearType === 'own' ? '自前装備' : 'レンタル'}
						</span>
					</div>
					<button class="self-out-btn" disabled={selfLoading} on:click={selfCheckOut}>
						{selfLoading ? '…' : '不参加にする'}
					</button>
				</div>
			{:else}
				<!-- 未参加 → 参加するボタン＋装備選択 -->
				<div class="self-join-row">
					<div class="self-gear-row">
						<button class="gear-mini" class:gear-mini-active={selfGear === 'own'}
							on:click={() => selfGear = 'own'}>自前装備</button>
						<button class="gear-mini" class:gear-mini-active={selfGear === 'rental'}
							on:click={() => selfGear = 'rental'}>レンタル</button>
					</div>
					<button class="self-in-btn" disabled={selfLoading} on:click={selfCheckIn}>
						{selfLoading ? '…' : '参加する'}
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ══════════════════════════════════════
	     作成者ビュー
	══════════════════════════════════════ -->
	{#if isCreator}

		<!-- QRコード共有 -->
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

		<!-- チェックイン管理パネル -->
		<div class="card admin-panel">
			<button class="admin-toggle" on:click={() => (adminOpen = !adminOpen)}>
				<div class="admin-toggle-left">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
					<span>メンバーをチェックイン</span>
					<span class="admin-count">{$currentCheckedInCount}/{$members.length}</span>
				</div>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"
					style="transition:transform .2s; transform:rotate({adminOpen ? 180 : 0}deg)">
					<polyline points="6 9 12 15 18 9"/>
				</svg>
			</button>
			{#if adminOpen}
				<div class="admin-list">
					{#each $members as m (m.id)}
						{@const checked = checkedInIds.has(m.id)}
						{@const loading = ciLoading[m.id] ?? false}
						<div class="admin-row" class:admin-row-checked={checked}>
							<div class="admin-member">
								<div class="admin-avatar" class:admin-avatar-checked={checked}>
									{m.name.slice(0, 1)}
								</div>
								<div class="admin-name-wrap">
									<span class="admin-name">{m.name}</span>
									<span class="admin-sid">{m.studentId}</span>
								</div>
							</div>
							{#if !checked}
								<div class="admin-gear-row">
									<button class="gear-mini" class:gear-mini-active={getGear(m.id) === 'own'}
										on:click={() => { gearSelections[m.id] = 'own'; gearSelections = {...gearSelections}; }}>自前</button>
									<button class="gear-mini" class:gear-mini-active={getGear(m.id) === 'rental'}
										on:click={() => { gearSelections[m.id] = 'rental'; gearSelections = {...gearSelections}; }}>レンタル</button>
									<button class="ci-btn ci-btn-in" disabled={loading} on:click={() => toggleCheckIn(m.id)}>
										{#if loading}…{:else}参加{/if}
									</button>
								</div>
							{:else}
								{@const ci = $currentCheckIns.find(c => c.memberId === m.id)}
								<div class="admin-gear-row">
									<span class="gear-badge-sm {ci?.gearType === 'own' ? 'gear-own-sm' : 'gear-rental-sm'}">
										{ci?.gearType === 'own' ? '自前' : 'レンタル'}
									</span>
									<button class="ci-btn ci-btn-out" disabled={loading} on:click={() => toggleCheckIn(m.id)}>
										{#if loading}…{:else}取消{/if}
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- チーム分けボタン -->
		<div class="card">
			<div class="section-title">チーム分け</div>
			<div class="team-count-section">
				<span class="team-count-label">チーム数</span>
				<div class="team-count-btns">
					{#each [2, 3, 4, 5, 6] as n}
						<button class="team-count-btn" class:selected={$numTeams === n} on:click={() => numTeams.set(n)}>{n}</button>
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

		<!-- セッション終了ボタン（作成者のみ） -->
		<button class="end-session-btn" disabled={ending} on:click={endSession}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<rect x="3" y="3" width="18" height="18" rx="2"/>
				<line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
			</svg>
			{ending ? '終了中…' : 'セッションを終了する'}
		</button>

	<!-- ══════════════════════════════════════
	     参加者ビュー
	══════════════════════════════════════ -->
	{:else}

		<!-- 参加メンバー一覧 -->
		{#if $currentCheckedInCount > 0}
			<div class="card">
				<div class="section-title">参加メンバー ({$currentCheckedInCount}名)</div>
				<div class="member-list">
					{#each $currentCheckIns as ci}
						{@const m = $members.find((x) => x.id === ci.memberId)}
						{#if m}
							<div class="member-row" class:member-me={ci.memberId === $currentUserId}>
								<div class="member-avatar">{m.name[0]}</div>
								<span class="member-name">{m.name}{ci.memberId === $currentUserId ? ' (自分)' : ''}</span>
								<span class="gear-badge-sm {ci.gearType === 'own' ? 'gear-own-sm' : 'gear-rental-sm'}">
									{ci.gearType === 'own' ? '自前' : 'レンタル'}
								</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}

	{/if}

	<!-- 振り分け結果（共通・作成者は下部、参加者はメインコンテンツ） -->
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
								<div class="team-member" class:team-member-me={m.id === $currentUserId}>
									<span class="team-member-name">{m.name}{m.id === $currentUserId ? ' ★' : ''}</span>
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
			{#if isCreator}
				<div class="score-legend card" style="margin-top:8px">
					<div class="section-title">スコア計算</div>
					<div class="legend-grid">
						<span>自前装備</span><span>+2pt</span>
						<span>レンタル</span><span>+1pt</span>
						<span>参加5回〜</span><span>+1pt</span>
						<span>参加10回〜</span><span>+2pt</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
{/if}

<style>
.page { display:flex; flex-direction:column; gap:12px; }

/* 挨拶カード */
.greeting-card {
	background:#fff; border:1px solid #e2e8f0; border-radius:12px;
	padding:14px 16px; display:flex; align-items:center; gap:12px;
	box-shadow:0 1px 3px rgba(0,0,0,.05);
}
.greeting-avatar {
	width:44px; height:44px; border-radius:12px; background:#eff6ff;
	color:#2563eb; display:flex; align-items:center; justify-content:center;
	font-weight:700; font-size:18px; flex-shrink:0;
}
.greeting-name { font-size:15px; font-weight:700; color:#0f172a; }
.greeting-meta { font-size:12px; color:#94a3b8; margin-top:2px; }

/* 空状態 */
.empty-hint {
	display:flex; flex-direction:column; align-items:center;
	padding:32px 16px; text-align:center; gap:4px;
}

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
.gear-badge { font-size:10px; font-weight:600; padding:2px 8px; border-radius:99px; flex-shrink:0; }
.gear-own    { background:#dbeafe; color:#1e40af; }
.gear-rental { background:#fef3c7; color:#92400e; }

/* セッションバナー */
.session-banner {
	background:#2563eb; border-radius:12px; padding:16px;
	display:flex; align-items:flex-start; justify-content:space-between; gap:8px;
}
.banner-member { background:#0f172a; }
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

/* 参加者メンバーリスト */
.member-list { display:flex; flex-direction:column; gap:4px; margin-top:4px; }
.member-row {
	display:flex; align-items:center; gap:10px;
	padding:8px 10px; border-radius:9px;
	background:#f8fafc;
}
.member-row.member-me { background:#eff6ff; }
.member-avatar {
	width:32px; height:32px; border-radius:8px;
	background:#e2e8f0; color:#475569;
	display:flex; align-items:center; justify-content:center;
	font-size:13px; font-weight:700; flex-shrink:0;
}
.member-me .member-avatar { background:#dbeafe; color:#1d4ed8; }
.member-name { flex:1; font-size:13px; font-weight:600; color:#0f172a; }

/* 自分の参加状態トグルカード */
.self-status-card { padding:12px 14px; }
.self-status-row {
	display:flex; align-items:center; justify-content:space-between; gap:10px;
}
.self-status-info { display:flex; align-items:center; gap:8px; }
.self-status-dot {
	width:8px; height:8px; border-radius:50%; background:#22c55e;
	animation:pulse 2s infinite; flex-shrink:0;
}
.self-status-label { font-size:13px; font-weight:700; color:#15803d; }
.self-out-btn {
	padding:6px 14px; border-radius:8px; border:1.5px solid #fca5a5;
	background:#fff; color:#dc2626; font-size:12px; font-weight:600;
	cursor:pointer; transition:background .15s; flex-shrink:0;
	white-space:nowrap;
}
.self-out-btn:hover:not(:disabled) { background:#fff1f2; }
.self-out-btn:disabled { opacity:.5; cursor:not-allowed; }

.self-join-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.self-gear-row { display:flex; gap:6px; }
.self-in-btn {
	padding:7px 18px; border-radius:9px; border:none;
	background:#2563eb; color:#fff; font-size:13px; font-weight:700;
	cursor:pointer; transition:background .15s; flex-shrink:0;
	white-space:nowrap;
}
.self-in-btn:hover:not(:disabled) { background:#1d4ed8; }
.self-in-btn:disabled { opacity:.5; cursor:not-allowed; }

/* セッション終了ボタン（作成者） */
.end-session-btn {
	display:flex; align-items:center; justify-content:center; gap:7px;
	width:100%; padding:12px; border-radius:10px; border:1.5px solid #fca5a5;
	background:#fff; color:#dc2626; font-size:13px; font-weight:600;
	cursor:pointer; transition:background .15s;
}
.end-session-btn:hover:not(:disabled) { background:#fff1f2; }
.end-session-btn:disabled { opacity:.5; cursor:not-allowed; }

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
.team-member-me { background:#fefce8; }
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

/* ── 管理パネル ──────────────────────────── */
.admin-panel { padding:0; overflow:hidden; }

.admin-toggle {
	display:flex; align-items:center; justify-content:space-between;
	background:none; border:none; cursor:pointer; width:100%;
	padding:14px 16px;
}
.admin-toggle-left { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#0f172a; }
.admin-count {
	background:#f1f5f9; color:#64748b;
	font-size:11px; font-weight:700;
	padding:2px 7px; border-radius:99px;
}

.admin-list { border-top:1px solid #f1f5f9; }
.admin-row {
	display:flex; align-items:center; justify-content:space-between;
	padding:10px 16px; gap:8px;
	border-bottom:1px solid #f8fafc;
	transition:background .12s;
}
.admin-row:last-child { border-bottom:none; }
.admin-row-checked { background:#f0fdf4; }

.admin-member { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
.admin-avatar {
	width:34px; height:34px; border-radius:9px;
	background:#f1f5f9; color:#64748b;
	display:flex; align-items:center; justify-content:center;
	font-size:13px; font-weight:700; flex-shrink:0;
}
.admin-avatar-checked { background:#dcfce7; color:#16a34a; }
.admin-name-wrap { display:flex; flex-direction:column; min-width:0; }
.admin-name { font-size:13px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.admin-sid  { font-size:11px; color:#94a3b8; }

.admin-gear-row { display:flex; align-items:center; gap:5px; flex-shrink:0; }

.gear-mini {
	padding:4px 8px; border-radius:7px; border:1px solid #e2e8f0;
	background:#f8fafc; color:#94a3b8;
	font-size:11px; font-weight:600; cursor:pointer; transition:all .12s;
}
.gear-mini-active { border-color:#2563eb; background:#eff6ff; color:#2563eb; }

.ci-btn {
	padding:5px 12px; border-radius:8px; border:none;
	font-size:12px; font-weight:700; cursor:pointer; transition:all .12s;
}
.ci-btn:disabled { opacity:.5; cursor:not-allowed; }
.ci-btn-in  { background:#2563eb; color:#fff; }
.ci-btn-in:hover:not(:disabled)  { background:#1d4ed8; }
.ci-btn-out { background:#fee2e2; color:#dc2626; }
.ci-btn-out:hover:not(:disabled) { background:#fecaca; }

.gear-badge-sm { font-size:10px; font-weight:600; padding:2px 7px; border-radius:99px; }
.gear-own-sm    { background:#dbeafe; color:#1e40af; }
.gear-rental-sm { background:#fef3c7; color:#92400e; }
</style>
