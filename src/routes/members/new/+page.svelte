<script lang="ts">
	import { members, generateId, addMember } from '$lib/stores';
	import { goto } from '$app/navigation';

	let name      = '';
	let studentId = '';
	let error     = '';
	let submitting = false;

	function validate() {
		if (!name.trim())      { error = '名前を入力してください'; return false; }
		if (!studentId.trim()) { error = '学籍番号を入力してください'; return false; }
		if ($members.some((m) => m.studentId === studentId.trim())) {
			error = 'この学籍番号はすでに登録されています';
			return false;
		}
		return true;
	}

	async function submit() {
		error = '';
		if (!validate()) return;
		submitting = true;
		try {
			await addMember({
				id: generateId(),
				name: name.trim(),
				studentId: studentId.trim(),
				createdAt: new Date().toISOString()
			});
			goto('/members');
		} catch {
			error = '登録に失敗しました。もう一度お試しください。';
			submitting = false;
		}
	}
</script>

<div class="page">
	<div class="back-row">
		<button class="back-btn" on:click={() => goto('/members')}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
			メンバー
		</button>
	</div>

	<h1 class="page-title">メンバー登録</h1>

	<div class="card form-card">
		<div class="field">
			<label class="label" for="name">名前 <span class="req">*</span></label>
			<input id="name" type="text" bind:value={name} placeholder="例：田中 翔太" class="input" />
		</div>
		<div class="field">
			<label class="label" for="sid">学籍番号 <span class="req">*</span></label>
			<input id="sid" type="text" bind:value={studentId} placeholder="例：S2401001" class="input" style="font-family:monospace" />
		</div>

		{#if error}
			<div class="err-msg">{error}</div>
		{/if}

		<button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px"
			disabled={submitting} on:click={submit}>
			{submitting ? '登録中…' : '登録する'}
		</button>
	</div>
</div>

<style>
.page { display:flex; flex-direction:column; gap:16px; max-width:480px; }
.back-row { display:flex; }
.back-btn {
	display:flex; align-items:center; gap:4px; background:none; border:none;
	cursor:pointer; color:#2563eb; font-size:14px; font-weight:500; padding:0;
}
.page-title { font-size:22px; font-weight:700; color:#0f172a; margin:0; }
.form-card { display:flex; flex-direction:column; gap:16px; }
.field { display:flex; flex-direction:column; gap:6px; }
.req { color:#ef4444; }
.err-msg {
	background:#fee2e2; color:#b91c1c; border-radius:8px;
	padding:10px 14px; font-size:13px;
}
</style>
