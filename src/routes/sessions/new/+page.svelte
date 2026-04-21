<script lang="ts">
	import { currentSessionId, generateId, addSession, checkInMember, currentUserId } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import type { GearType } from '$lib/types';

	const today = new Date().toISOString().split('T')[0];

	let title      = '';
	let date       = today;
	let location   = '';
	let gearType: GearType = 'own';
	let error      = '';
	let submitting = false;

	async function submit() {
		error = '';
		if (!title.trim()) { error = 'タイトルを入力してください'; return; }
		if (!date)         { error = '日付を選択してください'; return; }
		submitting = true;

		try {
			const id  = generateId();
			const uid = get(currentUserId);
			await addSession({
				id,
				title: title.trim(),
				date,
				location: location.trim() || undefined,
				createdAt: new Date().toISOString(),
				...(uid ? { createdBy: uid } : {})
			});
			// 作成者を自動でチェックイン
			if (uid) {
				await checkInMember(id, uid, gearType);
			}
			currentSessionId.set(id);
			goto(`/sessions/${id}`);
		} catch {
			error = '作成に失敗しました。もう一度お試しください。';
			submitting = false;
		}
	}
</script>

<div class="space-y-6 max-w-md mx-auto">
	<div class="flex items-center gap-3">
		<button
			class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
			on:click={() => goto('/sessions')}
		>←</button>
		<h1 class="text-xl font-bold text-gray-900">セッション作成</h1>
	</div>

	<div class="card space-y-5">
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1.5" for="title">
				タイトル <span class="text-red-500">*</span>
			</label>
			<input
				id="title" type="text" bind:value={title}
				placeholder="例: 春季定例戦 #4"
				class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50
				       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
				       text-gray-900 placeholder-gray-400 text-sm transition"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1.5" for="date">
				日付 <span class="text-red-500">*</span>
			</label>
			<input
				id="date" type="date" bind:value={date}
				class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50
				       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
				       text-gray-900 text-sm transition"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1.5" for="location">
				場所 <span class="text-gray-400 text-xs font-normal">任意</span>
			</label>
			<input
				id="location" type="text" bind:value={location}
				placeholder="例: フィールドA"
				class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50
				       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
				       text-gray-900 placeholder-gray-400 text-sm transition"
			/>
		</div>

		<!-- 自分の装備 -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1.5">
				自分の装備
			</label>
			<div class="gear-selector">
				<button
					type="button"
					class="gear-btn"
					class:selected={gearType === 'own'}
					on:click={() => (gearType = 'own')}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
					</svg>
					自前装備
				</button>
				<button
					type="button"
					class="gear-btn"
					class:selected={gearType === 'rental'}
					on:click={() => (gearType = 'rental')}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
					</svg>
					レンタル
				</button>
			</div>
		</div>

		{#if error}
			<div class="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
				<span>⚠️</span><span>{error}</span>
			</div>
		{/if}

		<button
			class="btn-primary w-full py-3 text-base"
			disabled={submitting}
			on:click={submit}
		>
			{submitting ? '作成中…' : 'セッションを作成'}
		</button>
	</div>
</div>

<style>
.gear-selector {
	display: flex;
	gap: 8px;
}
.gear-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	padding: 11px;
	border-radius: 12px;
	border: 2px solid #e2e8f0;
	background: #f8fafc;
	color: #64748b;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all .15s;
}
.gear-btn.selected {
	border-color: #2563eb;
	background: #eff6ff;
	color: #2563eb;
}
</style>
