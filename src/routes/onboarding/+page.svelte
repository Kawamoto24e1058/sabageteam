<script lang="ts">
	import { members, currentUserId, generateId } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	$: next = $page.url.searchParams.get('next') ?? '/';

	// members が存在する場合は選択モード、なければ登録モードから開始
	let mode: 'select' | 'register' = 'register';
	$: if ($members.length > 0 && mode === 'register' && !forceRegister) mode = 'select';

	let forceRegister = false;
	let query = '';
	let name = '';
	let studentId = '';
	let error = '';

	$: filtered = query.trim()
		? $members.filter(
				(m) =>
					m.name.includes(query) ||
					m.studentId.toLowerCase().includes(query.toLowerCase())
		  )
		: $members;

	function selectMember(id: string) {
		currentUserId.set(id);
		goto(next);
	}

	function goRegister() {
		forceRegister = true;
		mode = 'register';
	}

	function register() {
		error = '';
		if (!name.trim()) { error = '名前を入力してください'; return; }
		if (!studentId.trim()) { error = '学籍番号を入力してください'; return; }

		// 同じ学籍番号が既に存在する場合はそのメンバーとしてログイン
		const existing = $members.find((m) => m.studentId === studentId.trim());
		if (existing) {
			currentUserId.set(existing.id);
			goto(next);
			return;
		}

		const id = generateId();
		members.update((l) => [
			...l,
			{ id, name: name.trim(), studentId: studentId.trim(), createdAt: new Date().toISOString() }
		]);
		currentUserId.set(id);
		goto(next);
	}
</script>

<svelte:head><title>プロフィール設定 | SabageManager</title></svelte:head>

<div class="shell">
	<!-- ヘッダー -->
	<div class="top">
		<div class="app-icon">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round">
				<circle cx="12" cy="12" r="10"/>
				<circle cx="12" cy="10" r="3"/>
				<path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
			</svg>
		</div>
		<h1 class="app-title">SabageManager</h1>
		<p class="app-sub">
			{#if mode === 'select'}あなたのプロフィールを選んでください{:else}プロフィールを登録してください{/if}
		</p>
	</div>

	<!-- カード -->
	<div class="body">
		{#if mode === 'select'}
			<!-- ── 選択モード ── -->
			<div class="search-wrap">
				<input type="search" bind:value={query} placeholder="名前・学籍番号で検索" class="input" />
			</div>

			<div class="member-scroll">
				{#each filtered as m (m.id)}
					<button class="m-row" on:click={() => selectMember(m.id)}>
						<div class="m-avatar">{m.name[0]}</div>
						<div class="m-info">
							<span class="m-name">{m.name}</span>
							<span class="m-id">{m.studentId}</span>
						</div>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round">
							<polyline points="9 18 15 12 9 6"/>
						</svg>
					</button>
				{/each}

				{#if filtered.length === 0}
					<p class="empty-msg">見つかりませんでした</p>
				{/if}
			</div>

			<div class="divider"><span>または</span></div>

			<button class="btn-new" on:click={goRegister}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				新しくプロフィールを作成
			</button>

		{:else}
			<!-- ── 登録モード ── -->
			{#if $members.length > 0}
				<button class="back-link" on:click={() => { forceRegister = false; mode = 'select'; query = ''; }}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<polyline points="15 18 9 12 15 6"/>
					</svg>
					一覧から選ぶ
				</button>
			{/if}

			<div class="form">
				<div class="field">
					<label class="label" for="name">名前</label>
					<input id="name" type="text" bind:value={name} placeholder="例：田中 翔太" class="input" />
				</div>
				<div class="field">
					<label class="label" for="sid">学籍番号</label>
					<input id="sid" type="text" bind:value={studentId} placeholder="例：S2401001" class="input mono" />
				</div>

				{#if error}
					<div class="err-msg">{error}</div>
				{/if}

				<button class="btn-submit" on:click={register}>
					登録して始める
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</button>
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

/* ── ヘッダー ── */
.top {
	padding: 52px 24px 24px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 8px;
}
.app-icon {
	width: 56px; height: 56px; border-radius: 16px;
	background: #1e3a8a; display: flex; align-items: center; justify-content: center;
	margin-bottom: 4px;
}
.app-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0; }
.app-sub   { font-size: 14px; color: #64748b; margin: 0; }

/* ── カード ── */
.body {
	flex: 1;
	background: #fff;
	border-radius: 20px 20px 0 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

/* ── 検索 ── */
.search-wrap { padding: 12px 16px 8px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; }

/* ── メンバー一覧 ── */
.member-scroll { flex: 1; overflow-y: auto; }
.m-row {
	display: flex; align-items: center; gap: 12px;
	width: 100%; text-align: left; padding: 12px 16px;
	background: none; border: none; cursor: pointer;
	border-bottom: 1px solid #f8fafc; transition: background .1s;
}
.m-row:hover { background: #f8fafc; }
.m-avatar {
	width: 40px; height: 40px; border-radius: 12px;
	background: #eff6ff; color: #2563eb;
	display: flex; align-items: center; justify-content: center;
	font-weight: 700; font-size: 15px; flex-shrink: 0;
}
.m-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.m-name { font-size: 14px; font-weight: 600; color: #0f172a; }
.m-id   { font-size: 11px; color: #94a3b8; font-family: monospace; }

.empty-msg { text-align: center; color: #94a3b8; font-size: 13px; padding: 32px 0; }

/* ── 区切り線 ── */
.divider {
	display: flex; align-items: center; gap: 8px;
	padding: 0 16px; flex-shrink: 0;
	margin: 8px 0;
}
.divider::before, .divider::after {
	content: ''; flex: 1; height: 1px; background: #f1f5f9;
}
.divider span { font-size: 11px; color: #cbd5e1; white-space: nowrap; }

/* ── 新規登録ボタン ── */
.btn-new {
	margin: 0 16px 20px;
	padding: 14px;
	border: 2px dashed #e2e8f0;
	border-radius: 12px;
	background: none;
	color: #64748b;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	transition: border-color .15s, color .15s;
	flex-shrink: 0;
}
.btn-new:hover { border-color: #2563eb; color: #2563eb; }

/* ── 登録モード ── */
.back-link {
	display: flex; align-items: center; gap: 4px;
	background: none; border: none; cursor: pointer;
	color: #2563eb; font-size: 13px; font-weight: 500;
	padding: 16px 16px 0; flex-shrink: 0;
}
.form {
	padding: 16px;
	display: flex; flex-direction: column; gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.mono { font-family: monospace; }
.err-msg {
	background: #fee2e2; color: #b91c1c;
	border-radius: 8px; padding: 10px 14px; font-size: 13px;
}
.btn-submit {
	padding: 14px;
	background: #2563eb;
	color: #fff;
	border: none;
	border-radius: 12px;
	font-size: 15px;
	font-weight: 700;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	transition: background .15s;
}
.btn-submit:hover { background: #1d4ed8; }
</style>
