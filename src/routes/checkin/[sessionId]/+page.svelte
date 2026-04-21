<script lang="ts">
	import { page } from '$app/stores';
	import { members, sessions, allCheckIns, participationCounts, checkInMember, currentUserId } from '$lib/stores';
	import { onMount } from 'svelte';

	$: sid     = $page.params.sessionId;
	$: session = $sessions.find((s) => s.id === sid);
	$: cis     = $allCheckIns.filter((ci) => ci.sessionId === sid);
	$: inIds   = new Set(cis.map((ci) => ci.memberId));

	let query = '';
	$: filtered = query.trim()
		? $members.filter((m) => m.name.includes(query) || m.studentId.toLowerCase().includes(query.toLowerCase()))
		: $members;

	// ログイン済みなら 'self' から、未ログインなら 'list' から
	let step: 'self' | 'list' | 'gear' | 'done' = 'self';
	let selId: string | null = null;
	let gear: 'own' | 'rental' = 'own';
	let doneForSelf = true; // done 後に「自分のチェックイン」だったか

	onMount(() => {
		if ($currentUserId) {
			selId = $currentUserId;
			const existing = cis.find((ci) => ci.memberId === $currentUserId);
			gear = existing?.gearType ?? 'own';
			step = 'self';
		} else {
			step = 'list';
		}
	});

	$: sel     = $members.find((m) => m.id === selId);
	$: already = selId ? inIds.has(selId) : false;
	$: myAlready = $currentUserId ? inIds.has($currentUserId) : false;
	$: myCount   = $participationCounts.get($currentUserId ?? '') ?? 0;

	async function confirmSelf() {
		if (!$currentUserId) return;
		await checkInMember(sid, $currentUserId, gear);
		doneForSelf = true;
		step = 'done';
	}
	function pick(id: string) {
		selId = id;
		gear  = cis.find((ci) => ci.memberId === id)?.gearType ?? 'own';
		step  = 'gear';
	}
	async function confirmOther() {
		if (!selId) return;
		await checkInMember(sid, selId, gear);
		doneForSelf = false;
		step = 'done';
	}
	function backToSelf() {
		selId = $currentUserId;
		const existing = cis.find((ci) => ci.memberId === $currentUserId);
		gear = existing?.gearType ?? 'own';
		step = 'self';
		query = '';
	}

	function fmtDate(d: string) {
		return new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
	}
	function expLabel(n: number) {
		if (n >= 10) return 'ベテラン';
		if (n >= 5)  return '経験者';
		return '';
	}
	function setGear(val: string) { gear = val as 'own' | 'rental'; }
</script>

<svelte:head><title>{session?.title ?? 'チェックイン'} | SabageManager</title></svelte:head>

<div class="shell">
	<!-- ヘッダー -->
	<div class="top">
		<div class="top-label">Check In</div>
		{#if session}
			<h1 class="top-title">{session.title}</h1>
			<p class="top-sub">{fmtDate(session.date)}</p>
		{:else}
			<h1 class="top-title">チェックイン</h1>
		{/if}
		<div class="top-count">
			<span class="dot-live"></span>
			{inIds.size} 名参加済み
		</div>
	</div>

	<!-- カード -->
	<div class="body">
		{#if !session}
			<div class="empty-state">
				<p style="font-weight:600;color:#0f172a">セッションが見つかりません</p>
				<p style="color:#94a3b8;font-size:13px;margin-top:4px">URLを確認してください</p>
			</div>

		<!-- ── 完了 ── -->
		{:else if step === 'done'}
			<div class="done-state">
				<div class="done-icon">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"/>
					</svg>
				</div>
				<h2 class="done-name">{sel?.name ?? ''}</h2>
				<p class="done-msg">チェックイン完了</p>
				<span class="badge {gear === 'own' ? 'badge-blue' : 'badge-amber'}" style="margin-top:8px">
					{gear === 'own' ? '自前装備' : 'レンタル装備'}
				</span>
				{#if doneForSelf}
					<p class="done-count">累計参加 {myCount} 回</p>
				{/if}
			</div>

		<!-- ── 自分チェックイン ── -->
		{:else if step === 'self' && $currentUserId}
			{@const me = $members.find(m => m.id === $currentUserId)}
			<div class="self-state">
				{#if me}
					<div class="self-hero">
						<div class="self-avatar">{me.name[0]}</div>
						<div>
							<div class="self-name">{me.name}</div>
							<div class="self-meta">
								{me.studentId}
								{#if myCount > 0}· 参加 {myCount} 回{/if}
								{#if expLabel(myCount)}<span class="badge badge-blue" style="margin-left:4px;font-size:10px">{expLabel(myCount)}</span>{/if}
							</div>
						</div>
					</div>

					{#if myAlready}
						<div class="warn-bar">チェックイン済みです。装備を変更できます。</div>
					{/if}

					<p class="gear-q">今日の装備を選んでください</p>
					<div class="gear-grid">
						{#each [
							{ val: 'own',    label: '自前装備', sub: 'スコア +2pt', color: '#2563eb', bg: '#eff6ff' },
							{ val: 'rental', label: 'レンタル', sub: 'スコア +1pt', color: '#b45309', bg: '#fef3c7' }
						] as opt}
							<button
								class="gear-opt"
								class:gear-sel={gear === opt.val}
								style="--sel-color:{opt.color}; --sel-bg:{opt.bg}"
								on:click={() => setGear(opt.val)}
							>
								<span class="gear-label">{opt.label}</span>
								<span class="gear-sub">{opt.sub}</span>
							</button>
						{/each}
					</div>

					<button
						class="btn btn-primary"
						style="width:100%;justify-content:center;padding:14px;font-size:15px;background:{gear === 'own' ? '#2563eb' : '#d97706'}"
						on:click={confirmSelf}
					>
						{myAlready ? '装備を更新する' : 'チェックイン'}
					</button>

					<!-- 別の人としてチェックイン（主催者用） -->
					<button class="other-link" on:click={() => { step = 'list'; selId = null; }}>
						別の人のチェックインを代行する
					</button>
				{/if}
			</div>

		<!-- ── 他人のgear選択（代行） ── -->
		{:else if step === 'gear' && sel}
			<div class="gear-state">
				<button class="back-link" on:click={backToSelf}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
					戻る
				</button>

				<div class="member-hero">
					<div class="hero-avatar">{sel.name[0]}</div>
					<div>
						<div class="hero-name">{sel.name}</div>
						<div class="hero-meta">
							{sel.studentId}
							{#if ($participationCounts.get(sel.id) ?? 0) > 0}
								· 参加 {$participationCounts.get(sel.id)} 回
								{#if expLabel($participationCounts.get(sel.id) ?? 0)}
									<span class="badge badge-blue" style="margin-left:4px">{expLabel($participationCounts.get(sel.id) ?? 0)}</span>
								{/if}
							{/if}
						</div>
					</div>
				</div>

				{#if already}
					<div class="warn-bar">チェックイン済みです。装備を変更できます。</div>
				{/if}

				<p class="gear-q">今日の装備を選んでください</p>
				<div class="gear-grid">
					{#each [
						{ val: 'own',    label: '自前装備', sub: 'スコア +2pt', color: '#2563eb', bg: '#eff6ff' },
						{ val: 'rental', label: 'レンタル', sub: 'スコア +1pt', color: '#b45309', bg: '#fef3c7' }
					] as opt}
						<button
							class="gear-opt"
							class:gear-sel={gear === opt.val}
							style="--sel-color:{opt.color}; --sel-bg:{opt.bg}"
							on:click={() => setGear(opt.val)}
						>
							<span class="gear-label">{opt.label}</span>
							<span class="gear-sub">{opt.sub}</span>
						</button>
					{/each}
				</div>

				<button
					class="btn btn-primary"
					style="width:100%;justify-content:center;padding:14px;font-size:15px;background:{gear === 'own' ? '#2563eb' : '#d97706'}"
					on:click={confirmOther}
				>
					{already ? '装備を更新する' : 'チェックイン'}
				</button>
			</div>

		<!-- ── メンバー一覧（代行 or 未ログイン） ── -->
		{:else if step === 'list'}
			<div class="list-state">
				{#if $currentUserId}
					<div class="list-top-bar">
						<span class="list-top-label">代行チェックイン</span>
						<button class="back-link" on:click={backToSelf}>自分に戻る</button>
					</div>
				{/if}
				<div class="search-bar">
					<input type="search" bind:value={query} placeholder="名前・学籍番号で検索" class="input" />
				</div>
				<div class="member-scroll">
					{#each filtered as m (m.id)}
						{@const isIn  = inIds.has(m.id)}
						{@const count = $participationCounts.get(m.id) ?? 0}
						<button class="m-row" on:click={() => pick(m.id)}>
							<div class="m-avatar" class:checked={isIn}>
								{#if isIn}
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								{:else}
									{m.name[0]}
								{/if}
							</div>
							<div class="m-info">
								<div class="m-name-row">
									<span class="m-name">{m.name}</span>
									{#if isIn}<span class="badge badge-green">参加済み</span>{/if}
									{#if expLabel(count)}<span class="badge badge-blue" style="font-size:10px">{expLabel(count)}</span>{/if}
								</div>
								<div class="m-meta">{m.studentId} · {count}回参加</div>
							</div>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
						</button>
					{/each}
					{#if filtered.length === 0}
						<p style="text-align:center;color:#94a3b8;font-size:13px;padding:32px 0">見つかりませんでした</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
.shell {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: #0f172a;
}
.top {
	padding: 40px 20px 20px;
	flex-shrink: 0;
}
.top-label { font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#475569; margin-bottom:4px; }
.top-title { font-size:24px; font-weight:700; color:#fff; margin:0 0 2px; line-height:1.2; }
.top-sub   { font-size:13px; color:#475569; margin:0; }
.top-count { display:flex; align-items:center; gap:6px; font-size:12px; color:#475569; margin-top:10px; }
.dot-live  { width:7px; height:7px; border-radius:50%; background:#22c55e; animation:pulse 2s infinite; flex-shrink:0; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.body { flex:1; background:#fff; border-radius:20px 20px 0 0; overflow:hidden; display:flex; flex-direction:column; }

/* empty */
.empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; text-align:center; }

/* done */
.done-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px; text-align:center; }
.done-icon { width:72px; height:72px; border-radius:50%; background:#dcfce7; display:flex; align-items:center; justify-content:center; margin-bottom:16px; }
.done-name { font-size:22px; font-weight:700; color:#0f172a; margin:0 0 4px; }
.done-msg  { font-size:13px; color:#64748b; margin:0; }
.done-count{ font-size:12px; color:#94a3b8; margin-top:8px; }

/* self check-in */
.self-state { padding:20px; display:flex; flex-direction:column; gap:16px; flex:1; }
.self-hero  { display:flex; align-items:center; gap:14px; }
.self-avatar { width:56px; height:56px; border-radius:16px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:22px; flex-shrink:0; }
.self-name   { font-size:20px; font-weight:700; color:#0f172a; }
.self-meta   { font-size:12px; color:#64748b; margin-top:2px; display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
.other-link {
	text-align:center; font-size:12px; color:#94a3b8; background:none; border:none;
	cursor:pointer; padding:4px; text-decoration:underline; text-underline-offset:2px;
}
.other-link:hover { color:#475569; }

/* gear (shared) */
.gear-state { padding:20px; display:flex; flex-direction:column; gap:16px; flex:1; }
.back-link { display:flex; align-items:center; gap:4px; background:none; border:none; cursor:pointer; color:#2563eb; font-size:13px; font-weight:500; padding:0; }
.member-hero { display:flex; align-items:center; gap:14px; }
.hero-avatar { width:52px; height:52px; border-radius:14px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:20px; flex-shrink:0; }
.hero-name { font-size:18px; font-weight:700; color:#0f172a; }
.hero-meta { font-size:12px; color:#64748b; margin-top:2px; display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
.warn-bar { background:#fef3c7; color:#92400e; border-radius:8px; padding:10px 12px; font-size:12px; }
.gear-q { font-size:13px; font-weight:600; color:#475569; margin:0; }
.gear-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.gear-opt {
	border:2px solid #e2e8f0; border-radius:12px; padding:16px 12px;
	text-align:left; cursor:pointer; background:#f8fafc;
	display:flex; flex-direction:column; gap:4px; transition:all .15s;
}
.gear-opt.gear-sel { border-color:var(--sel-color); background:var(--sel-bg); }
.gear-label { font-size:14px; font-weight:600; color:#0f172a; }
.gear-sub   { font-size:11px; color:#64748b; }

/* list */
.list-state { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.list-top-bar {
	display:flex; align-items:center; justify-content:space-between;
	padding:10px 16px 6px; border-bottom:1px solid #f1f5f9; flex-shrink:0;
}
.list-top-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; }
.search-bar { padding:12px 16px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.member-scroll { flex:1; overflow-y:auto; }
.m-row {
	display:flex; align-items:center; gap:12px; width:100%; text-align:left;
	padding:12px 16px; background:none; border:none; cursor:pointer;
	border-bottom:1px solid #f8fafc; transition:background .1s;
}
.m-row:hover { background:#f8fafc; }
.m-avatar {
	width:38px; height:38px; border-radius:10px;
	background:#f1f5f9; color:#64748b;
	display:flex; align-items:center; justify-content:center;
	font-weight:700; font-size:14px; flex-shrink:0;
}
.m-avatar.checked { background:#dcfce7; color:#16a34a; }
.m-info { flex:1; min-width:0; }
.m-name-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.m-name { font-size:13px; font-weight:600; color:#0f172a; }
.m-meta { font-size:11px; color:#94a3b8; margin-top:2px; }
</style>
