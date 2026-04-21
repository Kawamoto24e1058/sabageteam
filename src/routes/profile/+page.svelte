<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		currentUser,
		currentUserId,
		myCheckIns,
		mySessions,
		sessions,
		authReady
	} from '$lib/stores';
	import { authSignOut } from '$lib/auth';

	function experienceLabel(count: number): string {
		if (count >= 10) return 'ベテラン';
		if (count >= 5)  return '中級者';
		if (count >= 1)  return '初級者';
		return '未参加';
	}

	function experienceColor(count: number): string {
		if (count >= 10) return '#f59e0b';
		if (count >= 5)  return '#3b82f6';
		return '#10b981';
	}

	async function handleSignOut() {
		await authSignOut();
		goto('/onboarding');
	}

	$: totalCount = $myCheckIns.length;
	$: ownCount   = $myCheckIns.filter(ci => ci.gearType === 'own').length;
	$: rentCount  = $myCheckIns.filter(ci => ci.gearType === 'rental').length;
	$: recentSessions = $mySessions.slice(0, 5);
</script>

<div class="page">
	{#if !$authReady}
		<div class="loading">
			<div class="spinner"></div>
		</div>
	{:else if $currentUser}
		<!-- アバター & 名前 -->
		<div class="hero">
			<div class="avatar">{$currentUser.name.slice(0, 1)}</div>
			<h1 class="name">{$currentUser.name}</h1>
			{#if $currentUser.studentId}
				<p class="student-id">{$currentUser.studentId}</p>
			{/if}
			<span class="badge" style="background:{experienceColor(totalCount)}20; color:{experienceColor(totalCount)}">
				{experienceLabel(totalCount)}
			</span>
		</div>

		<!-- 統計カード -->
		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-value">{totalCount}</span>
				<span class="stat-label">累計参加</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{ownCount}</span>
				<span class="stat-label">自前装備</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{rentCount}</span>
				<span class="stat-label">レンタル</span>
			</div>
		</div>

		<!-- 直近の参加履歴 -->
		{#if recentSessions.length > 0}
			<section class="section">
				<h2 class="section-title">参加履歴</h2>
				<div class="history-list">
					{#each recentSessions as s}
						<div class="history-row">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
								<rect x="3" y="4" width="18" height="18" rx="2"/>
								<line x1="16" y1="2" x2="16" y2="6"/>
								<line x1="8" y1="2" x2="8" y2="6"/>
								<line x1="3" y1="10" x2="21" y2="10"/>
							</svg>
							<span class="history-date">{s.date}</span>
							<span class="history-name">{s.name}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- UID (開発用情報) -->
		<section class="section">
			<h2 class="section-title">アカウント情報</h2>
			<div class="info-card">
				<div class="info-row">
					<span class="info-key">UID</span>
					<span class="info-val uid">{$currentUserId}</span>
				</div>
			</div>
		</section>

		<!-- サインアウト -->
		<div class="signout-area">
			<button class="signout-btn" on:click={handleSignOut}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
					<polyline points="16 17 21 12 16 7"/>
					<line x1="21" y1="12" x2="9" y2="12"/>
				</svg>
				ログアウト
			</button>
		</div>
	{:else}
		<div class="empty">
			<p>プロフィール情報を取得できませんでした</p>
			<button class="signout-btn" on:click={handleSignOut}>ログアウト</button>
		</div>
	{/if}
</div>

<style>
.page {
	padding: 8px 0;
}

/* ローディング */
.loading {
	display: flex;
	justify-content: center;
	padding: 60px 0;
}
.spinner {
	width: 28px; height: 28px;
	border: 3px solid #e2e8f0;
	border-top-color: #2563eb;
	border-radius: 50%;
	animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ヒーロー */
.hero {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 28px 16px 20px;
	gap: 6px;
}
.avatar {
	width: 72px; height: 72px;
	border-radius: 50%;
	background: linear-gradient(135deg, #2563eb, #60a5fa);
	color: #fff;
	font-size: 28px;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 4px;
	box-shadow: 0 4px 16px rgba(37,99,235,.25);
}
.name {
	margin: 0;
	font-size: 22px;
	font-weight: 700;
	color: #0f172a;
	letter-spacing: -.02em;
}
.student-id {
	margin: 0;
	font-size: 13px;
	color: #94a3b8;
}
.badge {
	margin-top: 2px;
	padding: 3px 12px;
	border-radius: 20px;
	font-size: 12px;
	font-weight: 600;
}

/* 統計 */
.stats-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
	padding: 0 16px;
	margin-bottom: 24px;
}
.stat-card {
	background: #fff;
	border-radius: 14px;
	border: 1px solid #f1f5f9;
	padding: 16px 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.stat-value {
	font-size: 26px;
	font-weight: 700;
	color: #0f172a;
	line-height: 1;
}
.stat-label {
	font-size: 11px;
	color: #94a3b8;
	font-weight: 500;
}

/* セクション */
.section {
	margin-bottom: 20px;
}
.section-title {
	font-size: 12px;
	font-weight: 600;
	color: #94a3b8;
	text-transform: uppercase;
	letter-spacing: .06em;
	padding: 0 16px;
	margin: 0 0 8px;
}

/* 履歴 */
.history-list {
	background: #fff;
	border-radius: 14px;
	border: 1px solid #f1f5f9;
	overflow: hidden;
	margin: 0 16px;
	box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.history-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 12px 14px;
	border-bottom: 1px solid #f8fafc;
	font-size: 14px;
}
.history-row:last-child { border-bottom: none; }
.history-date {
	color: #64748b;
	font-size: 13px;
	flex-shrink: 0;
}
.history-name {
	color: #0f172a;
	font-weight: 500;
	flex: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* アカウント情報 */
.info-card {
	background: #fff;
	border-radius: 14px;
	border: 1px solid #f1f5f9;
	margin: 0 16px;
	overflow: hidden;
	box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.info-row {
	display: flex;
	align-items: center;
	padding: 12px 14px;
	gap: 12px;
}
.info-key {
	font-size: 13px;
	font-weight: 600;
	color: #64748b;
	width: 36px;
	flex-shrink: 0;
}
.info-val {
	font-size: 13px;
	color: #475569;
}
.uid {
	font-family: monospace;
	font-size: 11px;
	word-break: break-all;
}

/* サインアウト */
.signout-area {
	padding: 8px 16px 24px;
}
.signout-btn {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 13px;
	background: #fff;
	border: 1px solid #fecaca;
	border-radius: 14px;
	color: #ef4444;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: background .15s, border-color .15s;
	box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.signout-btn:hover {
	background: #fef2f2;
	border-color: #f87171;
}

/* エンプティ */
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	padding: 60px 16px;
	color: #94a3b8;
}
</style>
