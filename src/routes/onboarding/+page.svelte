<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import { auth } from '$lib/firebase';
	import { authLogin, authRegister, authSignInWithGoogle, ensureMemberDoc } from '$lib/auth';
	import { currentUserId, members } from '$lib/stores';
	import type { Member } from '$lib/types';
	import type { User } from 'firebase/auth';

	function injectMember(member: Member) {
		members.update((list) => {
			if (list.find((m) => m.id === member.id)) return list;
			return [...list, member];
		});
	}

	$: next = $page.url.searchParams.get('next') ?? '/';

	type PageState = 'auth' | 'social-profile';
	let state: PageState = 'auth';
	let tab: 'login' | 'register' = 'login';

	// メールログイン
	let loginEmail    = '';
	let loginPassword = '';
	let loginError    = '';
	let loginLoading  = false;

	// メール新規登録
	let regName      = '';
	let regStudentId = '';
	let regEmail     = '';
	let regPassword  = '';
	let regConfirm   = '';
	let regError     = '';
	let regLoading   = false;

	// ソーシャル → プロフィール設定
	let socialUser: User | null = null;
	let socialStudentId = '';
	let socialName      = '';
	let socialError     = '';
	let socialLoading   = false;
	let socialBtnError  = '';

	let showLoginPw = false;
	let showRegPw   = false;

	async function handleLogin() {
		loginError = '';
		if (!loginEmail.trim() || !loginPassword) { loginError = 'すべての項目を入力してください'; return; }
		loginLoading = true;
		await tick();
		const result = await authLogin(loginEmail, loginPassword);
		if (result.ok) { currentUserId.set(result.userId); goto(next); }
		else loginError = result.error;
		loginLoading = false;
	}

	async function handleRegister() {
		regError = '';
		if (!regName.trim() || !regStudentId.trim() || !regEmail.trim() || !regPassword) {
			regError = 'すべての項目を入力してください'; return;
		}
		if (regPassword.length < 6) { regError = 'パスワードは6文字以上にしてください'; return; }
		if (regPassword !== regConfirm) { regError = 'パスワードが一致しません'; return; }
		regLoading = true;
		await tick();
		const result = await authRegister(regEmail, regPassword, regName, regStudentId);
		if (result.ok) {
			injectMember({ id: result.userId, name: regName.trim(), studentId: regStudentId.trim(), createdAt: new Date().toISOString() });
			currentUserId.set(result.userId);
			goto(next);
		} else regError = result.error;
		regLoading = false;
	}

	async function handleGoogle() {
		socialBtnError = '';
		const result = await authSignInWithGoogle();
		if (!result.ok) { socialBtnError = result.error || ''; return; }
		if (!result.isNew) { currentUserId.set(result.userId); goto(next); }
		else { socialUser = auth.currentUser; socialName = result.displayName ?? ''; state = 'social-profile'; }
	}

	async function handleSocialProfile() {
		socialError = '';
		if (!socialName.trim())      { socialError = '名前を入力してください'; return; }
		if (!socialStudentId.trim()) { socialError = '学籍番号を入力してください'; return; }
		if (!socialUser) { socialError = 'エラーが発生しました。再度サインインしてください'; return; }
		socialLoading = true;
		await tick();
		try {
			const member = await ensureMemberDoc(socialUser, socialName, socialStudentId);
			if (!member) { socialError = '登録に失敗しました'; socialLoading = false; return; }
			injectMember(member);
			currentUserId.set(socialUser.uid);
			goto(next);
		} catch {
			socialError = '登録に失敗しました。もう一度お試しください。';
			socialLoading = false;
		}
	}

	function switchTab(t: 'login' | 'register') { tab = t; loginError = ''; regError = ''; }
</script>

<svelte:head>
	<title>{state === 'social-profile' ? 'プロフィール設定' : tab === 'login' ? 'ログイン' : '新規登録'} | SabageManager</title>
</svelte:head>

<div class="shell">
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

	<div class="card">

		<!-- プロフィール設定（Google初回） -->
		{#if state === 'social-profile'}
			<div class="sp-head">
				<p class="sp-title">プロフィールを設定</p>
				<p class="sp-sub">名前と学籍番号を登録してください</p>
			</div>
			<form class="form" on:submit|preventDefault={handleSocialProfile}>
				<div class="field">
					<label class="label" for="sp-name">名前</label>
					<input id="sp-name" type="text" bind:value={socialName} placeholder="例：田中 翔太" class="input" />
				</div>
				<div class="field">
					<label class="label" for="sp-sid">学籍番号</label>
					<input id="sp-sid" type="text" bind:value={socialStudentId} placeholder="例：S2401001" class="input mono" />
				</div>
				{#if socialError}<div class="err-msg">{socialError}</div>{/if}
				<button type="submit" class="submit-btn" disabled={socialLoading}>
					{socialLoading ? '設定中…' : '設定を保存'}
				</button>
			</form>

		<!-- ログイン / 新規登録 -->
		{:else}
			<div class="tabs">
				<button class="tab" class:active={tab === 'login'}    on:click={() => switchTab('login')}>ログイン</button>
				<button class="tab" class:active={tab === 'register'} on:click={() => switchTab('register')}>新規登録</button>
			</div>

			<div class="social-btns">
				<button class="social-btn google-btn" on:click={handleGoogle} type="button">
					<svg width="18" height="18" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Googleで{tab === 'login' ? 'ログイン' : '登録'}
				</button>
				{#if socialBtnError}
					<div class="err-msg">{socialBtnError}</div>
				{/if}
			</div>

			<div class="divider"><span>またはメールで</span></div>

			{#if tab === 'login'}
			<form class="form" on:submit|preventDefault={handleLogin}>
				<div class="field">
					<label class="label" for="l-email">メールアドレス</label>
					<input id="l-email" type="email" bind:value={loginEmail} placeholder="example@mail.com" class="input" autocomplete="email" />
				</div>
				<div class="field">
					<label class="label" for="l-pw">パスワード</label>
					<div class="pw-wrap">
						<input id="l-pw" type={showLoginPw ? 'text' : 'password'} bind:value={loginPassword}
							placeholder="パスワードを入力" class="input" autocomplete="current-password" />
						<button type="button" class="eye-btn" on:click={() => (showLoginPw = !showLoginPw)} tabindex="-1">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								{#if showLoginPw}
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
								{:else}
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
								{/if}
							</svg>
						</button>
					</div>
				</div>
				{#if loginError}<div class="err-msg">{loginError}</div>{/if}
				<button type="submit" class="submit-btn" disabled={loginLoading}>
					{loginLoading ? 'ログイン中…' : 'ログイン'}
				</button>
			</form>

			{:else}
			<form class="form" on:submit|preventDefault={handleRegister}>
				<div class="field">
					<label class="label" for="r-name">名前</label>
					<input id="r-name" type="text" bind:value={regName} placeholder="例：田中 翔太" class="input" autocomplete="name" />
				</div>
				<div class="field">
					<label class="label" for="r-sid">学籍番号</label>
					<input id="r-sid" type="text" bind:value={regStudentId} placeholder="例：S2401001" class="input mono" autocomplete="off" />
				</div>
				<div class="field">
					<label class="label" for="r-email">メールアドレス</label>
					<input id="r-email" type="email" bind:value={regEmail} placeholder="example@mail.com" class="input" autocomplete="email" />
				</div>
				<div class="field">
					<label class="label" for="r-pw">パスワード <span class="hint-label">（6文字以上）</span></label>
					<div class="pw-wrap">
						<input id="r-pw" type={showRegPw ? 'text' : 'password'} bind:value={regPassword}
							placeholder="パスワードを設定" class="input" autocomplete="new-password" />
						<button type="button" class="eye-btn" on:click={() => (showRegPw = !showRegPw)} tabindex="-1">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								{#if showRegPw}
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
								{:else}
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
								{/if}
							</svg>
						</button>
					</div>
				</div>
				<div class="field">
					<label class="label" for="r-confirm">パスワード（確認）</label>
					<input id="r-confirm" type={showRegPw ? 'text' : 'password'} bind:value={regConfirm}
						placeholder="もう一度入力" class="input" autocomplete="new-password" />
				</div>
				{#if regError}<div class="err-msg">{regError}</div>{/if}
				<button type="submit" class="submit-btn" disabled={regLoading}>
					{regLoading ? '登録中…' : 'アカウントを作成'}
				</button>
			</form>
			{/if}
		{/if}
	</div>
</div>

<style>
.shell {
	min-height: 100vh;
	display: flex; flex-direction: column;
	background: #0f172a;
}
.top {
	padding: 52px 24px 28px;
	display: flex; flex-direction: column; align-items: center;
	text-align: center; gap: 8px; flex-shrink: 0;
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

.card {
	flex: 1; background: #fff;
	border-radius: 20px 20px 0 0;
	overflow: hidden; display: flex; flex-direction: column;
}

.tabs { display: flex; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; }
.tab {
	flex: 1; padding: 16px;
	background: none; border: none; cursor: pointer;
	font-size: 14px; font-weight: 600; color: #94a3b8;
	border-bottom: 2px solid transparent;
	transition: color .15s, border-color .15s; margin-bottom: -1px;
}
.tab.active { color: #2563eb; border-bottom-color: #2563eb; }

.social-btns { display: flex; flex-direction: column; gap: 8px; padding: 16px 20px 0; }
.social-btn {
	display: flex; align-items: center; justify-content: center; gap: 10px;
	padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;
	font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s;
}
.google-btn { background: #fff; color: #0f172a; }
.google-btn:hover { background: #f8fafc; }

.divider {
	display: flex; align-items: center; gap: 12px;
	padding: 12px 20px; color: #94a3b8; font-size: 12px;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }

.form { padding: 4px 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; font-weight: 600; color: #374151; }
.hint-label { font-size: 11px; font-weight: 400; color: #94a3b8; }
.mono { font-family: monospace; letter-spacing: .05em; }

.input {
	width: 100%; padding: 12px 14px;
	border: 1px solid #e2e8f0; border-radius: 10px;
	background: #f8fafc; color: #0f172a;
	font-size: 14px; box-sizing: border-box;
	transition: border-color .15s, box-shadow .15s;
	outline: none;
}
.input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

.pw-wrap { position: relative; }
.pw-wrap .input { padding-right: 42px; }
.eye-btn {
	position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
	background: none; border: none; cursor: pointer;
	color: #94a3b8; display: flex; align-items: center; padding: 0;
	transition: color .15s;
}
.eye-btn:hover { color: #475569; }

.err-msg { background: #fee2e2; color: #b91c1c; border-radius: 8px; padding: 10px 12px; font-size: 13px; }

.submit-btn {
	padding: 14px; background: #2563eb; color: #fff;
	border: none; border-radius: 12px;
	font-size: 15px; font-weight: 700; cursor: pointer;
	transition: background .15s, opacity .15s;
}
.submit-btn:hover:not(:disabled) { background: #1d4ed8; }
.submit-btn:disabled { opacity: .5; cursor: not-allowed; }

.sp-head { padding: 24px 20px 0; text-align: center; }
.sp-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.sp-sub   { font-size: 13px; color: #94a3b8; margin: 0; }
</style>
