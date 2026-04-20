<script lang="ts">
	import { sessions, currentSessionId, generateId } from '$lib/stores';
	import { goto } from '$app/navigation';

	// 今日の日付をデフォルトに
	const today = new Date().toISOString().split('T')[0];

	let title = '';
	let date = today;
	let location = '';
	let error = '';
	let submitting = false;

	async function submit() {
		error = '';
		if (!title.trim()) { error = 'タイトルを入力してください'; return; }
		if (!date) { error = '日付を選択してください'; return; }
		submitting = true;

		const id = generateId();
		sessions.update((list) => [
			...list,
			{
				id,
				title: title.trim(),
				date,
				location: location.trim() || undefined,
				createdAt: new Date().toISOString()
			}
		]);
		// 作成したセッションをアクティブに
		currentSessionId.set(id);

		await new Promise((r) => setTimeout(r, 200));
		goto(`/sessions/${id}`);
	}
</script>

<div class="space-y-6 max-w-md mx-auto">
	<div class="flex items-center gap-3">
		<button
			class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
			on:click={() => goto('/sessions')}
		>
			←
		</button>
		<h1 class="text-xl font-bold text-gray-900">セッション作成</h1>
	</div>

	<div class="card space-y-5">
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1.5" for="title">
				タイトル <span class="text-red-500">*</span>
			</label>
			<input
				id="title"
				type="text"
				bind:value={title}
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
				id="date"
				type="date"
				bind:value={date}
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
				id="location"
				type="text"
				bind:value={location}
				placeholder="例: フィールドA"
				class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50
				       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
				       text-gray-900 placeholder-gray-400 text-sm transition"
			/>
		</div>

		{#if error}
			<div class="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
				<span>⚠️</span>
				<span>{error}</span>
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
