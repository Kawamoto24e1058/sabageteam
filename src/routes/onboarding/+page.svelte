<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { signInAnonymously } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { ensureMemberDoc } from '$lib/auth';
	import { members, currentUserId } from '$lib/stores';

	$: next = $page.url.searchParams.get('next') ?? '/';

	let name      = '';
	let studentId = '';
	let error     = '';
	let loading   = false;
	let authReady = false;

	onMount(async () => {
		// 既にサインイン済みなら何もしない
		if (!auth.currentUser) {
			try {
				await signInAnonymously(auth);
			} catch (e) {
				console.error('Anonymous sign-in failed:', e);
				error = '初期化に失敗しました。ページを再読み込みしてください。';
			}
		}
		authReady = true;
	});

	async function handleSubmit() {
		error = '';
		if (!name.trim())      { error = '名前を入力してください'; return; }
		if (!studentId.trim()) { error = '学籍番号を入力してください'; return; }
		loading = true;
		try {
			const user = auth.currentUser;
			if (!user) {
				error = '認証エラーが発生しました。ページを再読み込みしてください。';
				loading = false;
				return;
			}
			const member = await ensureMemberDoc(user, name.trim(), studentId.trim());
			if (!member) { error = '登録に失敗しました'; loading = false; return; }
			// ストアに即時反映してリダイレクトループを防止
			members.update((list) => {
				if (list.find((m) => m.id === member.id)) return list;
				return [...list, member];
			});
			currentUserId.set(user.uid);
			goto(next);
		} catch {
			error = '登録に失敗しました。もう一度お試しください。';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>はじめましょう | SabageManager</title>
</svelte:head>

<div class="shell">
	<div class="top">
		<div class="app-icon">
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
				<circle cx="12" cy="12" r="10"/>
				<circle cx="12" cy="10" r="3"/>
				<path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
			</svg>
		</div>
		<h1 class="app-title">SabageManager</h1>
		<p class="app-sub">サバゲーサークル管理アプリ</p>
	</div>

	<div class="card">
		{#if !authReady}
			<div class="loading-area">
				<div class="spinner"></div>
				<p class="loading-text">準備中…</p>
			</div>
		{:else}
			<div class="form-head">
				<p class="form-title">はじめましょう</p>
				<p class="form-sub">名前と学籍番号を登録するだけで使えます</p>
			</div>

			<form class="form" on:submit|preventDefault={handleSubmit}>
				<div class="field">
					<label class="label" for="name">名前</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="例：田中 翔太"
						class="input"
						autocomplete="name"
						autocapitalize="words"
					/>
				</div>

				<div class="field">
					<label class="label" for="sid">学籍番号</label>
					<input
						id="sid"
						type="text"
						bind:value={studentId}
						placeholder="例：S2401001"
						class="input mono"
						autocomplete="off"
					/>
				</div>

				{#if error}
					<div class="err-msg">{error}</div>
				{/if}

				<button type="submit" class="submit-btn" disabled={loading}>
					{#if loading}
						<div class="btn-spinner"></div>
						登録中…
					{:else}
						はじめる
					{/if}
				</button>
			</form>

			<p class="note">
				このデバイスで登録します。端末やブラウザが変わると再登録が必要です。
			</p>
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
	padding: 52px 24px 28px;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 8px;
	flex-shrink: 0;
}

.app-icon {
	width: 64px;
	height: 64px;
	border-radius: 20px;
	background: #2563eb;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 4px;
	box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 8px 24px rgba(37,99,235,.4);
}

.app-title { font-size: 26px; font-weight: 700; color: #fff; margin: 0; letter-spacing: -.02em; }
.app-sub   { font-size: 13px; color: #475569; margin: 0; }

.card {
	flex: 1;
	background: #fff;
	border-radius: 24px 24px 0 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* ローディング */
.loading-area {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 60px 0;
}
.spinner {
	width: 28px; height: 28px;
	border: 3px solid #e2e8f0;
	border-top-color: #2563eb;
	border-radius: 50%;
	animation: spin .7s linear infinite;
}
.loading-text { font-size: 13px; color: #94a3b8; margin: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* フォームヘッダー */
.form-head {
	padding: 28px 24px 4px;
	text-align: center;
}
.form-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
.form-sub   { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.55; }

/* フォーム */
.form {
	padding: 20px 24px 0;
	display: flex;
	flex-direction: column;
	gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; font-weight: 600; color: #374151; }
.mono  { font-family: monospace; letter-spacing: .05em; }

.input {
	width: 100%;
	padding: 13px 14px;
	border: 1.5px solid #e2e8f0;
	border-radius: 12px;
	background: #f8fafc;
	color: #0f172a;
	font-size: 15px;
	box-sizing: border-box;
	transition: border-color .15s, box-shadow .15s;
	outline: none;
}
.input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); background: #fff; }

.err-msg {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 10px;
	padding: 11px 14px;
	font-size: 13px;
}

.submit-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 15px;
	background: #2563eb;
	color: #fff;
	border: none;
	border-radius: 14px;
	font-size: 16px;
	font-weight: 700;
	cursor: pointer;
	transition: background .15s, opacity .15s;
	letter-spacing: -.01em;
}
.submit-btn:hover:not(:disabled) { background: #1d4ed8; }
.submit-btn:disabled { opacity: .6; cursor: not-allowed; }

.btn-spinner {
	width: 16px; height: 16px;
	border: 2.5px solid rgba(255,255,255,.4);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin .6s linear infinite;
}

.note {
	padding: 16px 24px 32px;
	font-size: 11px;
	color: #94a3b8;
	text-align: center;
	line-height: 1.6;
	margin: 0;
}
</style>
