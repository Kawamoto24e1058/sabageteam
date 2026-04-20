<script lang="ts">
	import { members, currentUserId } from '$lib/stores';
	import { authLogin, authRegister } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';

	$: next = $page.url.searchParams.get('next') ?? '/';

	let tab: 'login' | 'register' = 'login';

	// ── ログイン ──
	let loginEmail    = '';
	let loginPassword = '';
	let loginError    = '';
	let loginLoading  = false;

	// ── 新規登録 ──
	let regName      = '';
	let regStudentId = '';
	let regEmail     = '';
	let regPassword  = '';
	let regConfirm   = '';
	let regError     = '';
	let regLoading   = false;

	// パスワードの表示/非表示
	let showLoginPw  = false;
	let showRegPw    = false;

	async function handleLogin() {
		loginError = '';
		if (!loginEmail.trim() || !loginPassword) { loginError = 'すべての項目を入力してください'; return; }
		loginLoading = true;
		await tick();

		const result = authLogin(loginEmail, loginPassword);
		if (result.ok) {
			currentUserId.set(result.userId);
			goto(next);
		} else {
			loginError = result.error;
		}
		loginLoading = false;
	}

	async function handleRegister() {
		regError = '';
		if (!regName.trim() || !regStudentId.trim() || !regEmail.trim() || !regPassword) {
			regError = 'すべての項目を入力してください'; return;
		}
		if (regPassword.length < 6) { regError = 'パスワードは6文字以上にしてください'; return; }
		if (regPassword !== regConfirm)  { regError = 'パスワードが一致しません'; return; }

		regLoading = true;
		await tick();

		const result = authRegister(regEmail, regPassword, regName, regStudentId, $members);
		if (result.ok) {
			members.update((l) => [...l, result.member]);
			currentUserId.set(result.userId);
			goto(next);
		} else {
			regError = result.error;
		}
		regLoading = false;
	}

	function switchTab(t: 'login' | 'register') {
		tab = t;
		loginError = '';
		regError   = '';
	}
</script>

<svelte:head><title>{tab === 'login' ? 'ログイン' : '新規登録'} | SabageManager</title></svelte:head>

<div class="shell">
	<!-- ヘッダー -->
	<div class="top">
		<div class="app-icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round">
				<circle cx="12" cy="12" r="10"/>
				<circle cx="12" cy="10" r="3"/>
				<path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
			</svg>
		</div>
		<h1 class="app-title">SabageManager</h1>
		<p class="app-sub">サバゲーサークル管理アプリ</p>
	</div>

	<!-- カード -->
	<div class="card">
		<!-- タブ -->
		<div class="tabs">
			<button class="tab" class:active={tab === 'login'}    on:click={() => switchTab('login')}>ログイン</button>
			<button class="tab" class:active={tab === 'register'} on:click={() => switchTab('register')}>新規登録</button>
		</div>

		{#if tab === 'login'}
		<!-- ══ ログインフォーム ══ -->
		<form class="form" on:submit|preventDefault={handleLogin}>
			<div class="field">
				<label class="label" for="l-email">メールアドレス</label>
				<input
					id="l-email" type="email" bind:value={loginEmail}
					placeholder="example@mail.com" class="input" autocomplete="email"
				/>
			</div>

			<div class="field">
				<label class="label" for="l-pw">パスワード</label>
				<div class="pw-wrap">
					{#if showLoginPw}
						<input id="l-pw" type="text"     bind:value={loginPassword} placeholder="パスワードを入力" class="input" autocomplete="current-password" />
					{:else}
						<input id="l-pw" type="password" bind:value={loginPassword} placeholder="パスワードを入力" class="input" autocomplete="current-password" />
					{/if}
					<button type="button" class="eye-btn" on:click={() => (showLoginPw = !showLoginPw)} tabindex="-1">
						{#if showLoginPw}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
								<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			{#if loginError}
				<div class="err-msg">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
					</svg>
					{loginError}
				</div>
			{/if}

			<button type="submit" class="submit-btn" disabled={loginLoading}>
				{loginLoading ? 'ログイン中…' : 'ログイン'}
			</button>
		</form>

		{:else}
		<!-- ══ 新規登録フォーム ══ -->
		<form class="form" on:submit|preventDefault={handleRegister}>
			<div class="field">
				<label class="label" for="r-name">名前</label>
				<input
					id="r-name" type="text" bind:value={regName}
					placeholder="例：田中 翔太" class="input" autocomplete="name"
				/>
			</div>

			<div class="field">
				<label class="label" for="r-sid">学籍番号</label>
				<input
					id="r-sid" type="text" bind:value={regStudentId}
					placeholder="例：S2401001" class="input mono" autocomplete="off"
				/>
			</div>

			<div class="field">
				<label class="label" for="r-email">メールアドレス</label>
				<input
					id="r-email" type="email" bind:value={regEmail}
					placeholder="example@mail.com" class="input" autocomplete="email"
				/>
			</div>

			<div class="field">
				<label class="label" for="r-pw">パスワード <span class="hint-label">（6文字以上）</span></label>
				<div class="pw-wrap">
					{#if showRegPw}
						<input id="r-pw" type="text"     bind:value={regPassword} placeholder="パスワードを設定" class="input" autocomplete="new-password" />
					{:else}
						<input id="r-pw" type="password" bind:value={regPassword} placeholder="パスワードを設定" class="input" autocomplete="new-password" />
					{/if}
					<button type="button" class="eye-btn" on:click={() => (showRegPw = !showRegPw)} tabindex="-1">
						{#if showRegPw}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
								<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<div class="field">
				<label class="label" for="r-confirm">パスワード（確認）</label>
				{#if showRegPw}
					<input id="r-confirm" type="text"     bind:value={regConfirm} placeholder="もう一度入力" class="input" autocomplete="new-password" />
				{:else}
					<input id="r-confirm" type="password" bind:value={regConfirm} placeholder="もう一度入力" class="input" autocomplete="new-password" />
				{/if}
			</div>

			{#if regError}
				<div class="err-msg">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
					</svg>
					{regError}
				</div>
			{/if}

			<button type="submit" class="submit-btn" disabled={regLoading}>
				{regLoading ? '登録中…' : 'アカウントを作成'}
			</button>
		</form>
		{/if}
	</div>
</div>

<style>
/* ── シェル ── */
.shell {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: #0f172a;
}

/* ── ヘッダー ── */
.top {
	padding: 52px 24px 28px;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 8px;
	flex-shrink: 0;
}
.app-icon {
	width: 60px; height: 60px; border-radius: 18px;
	background: #1e3a8a;
	display: flex; align-items: center; justify-content: center;
	margin-bottom: 4px;
	box-shadow: 0 0 0 1px rgba(255,255,255,.08);
}
.app-title { font-size: 24px; font-weight: 700; color: #fff; margin: 0; letter-spacing: -.01em; }
.app-sub   { font-size: 13px; color: #475569; margin: 0; }

/* ── カード ── */
.card {
	flex: 1;
	background: #fff;
	border-radius: 20px 20px 0 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

/* ── タブ ── */
.tabs {
	display: flex;
	border-bottom: 1px solid #f1f5f9;
	flex-shrink: 0;
}
.tab {
	flex: 1; padding: 16px;
	background: none; border: none; cursor: pointer;
	font-size: 14px; font-weight: 600; color: #94a3b8;
	border-bottom: 2px solid transparent;
	transition: color .15s, border-color .15s;
	margin-bottom: -1px;
}
.tab.active { color: #2563eb; border-bottom-color: #2563eb; }

/* ── フォーム ── */
.form {
	padding: 24px 20px;
	display: flex; flex-direction: column; gap: 16px;
	flex: 1;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.hint-label { font-size: 11px; font-weight: 400; color: #94a3b8; }
.mono { font-family: monospace; letter-spacing: .05em; }

/* ── パスワード入力 ── */
.pw-wrap { position: relative; }
.pw-wrap .input { padding-right: 42px; }
.eye-btn {
	position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
	background: none; border: none; cursor: pointer;
	color: #94a3b8; display: flex; align-items: center;
	padding: 0; transition: color .15s;
}
.eye-btn:hover { color: #475569; }

/* ── エラー ── */
.err-msg {
	display: flex; align-items: center; gap: 6px;
	background: #fee2e2; color: #b91c1c;
	border-radius: 8px; padding: 10px 12px; font-size: 13px;
}

/* ── 送信ボタン ── */
.submit-btn {
	padding: 14px;
	background: #2563eb; color: #fff;
	border: none; border-radius: 12px;
	font-size: 15px; font-weight: 700;
	cursor: pointer;
	transition: background .15s, opacity .15s;
	margin-top: 4px;
}
.submit-btn:hover:not(:disabled) { background: #1d4ed8; }
.submit-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
