<script lang="ts">
	import { members, participationCounts, deleteMember } from '$lib/stores';
	import { goto } from '$app/navigation';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let query = '';
	$: filtered = query.trim()
		? $members.filter((m) => m.name.includes(query) || m.studentId.toLowerCase().includes(query.toLowerCase()))
		: $members;

	function expBadge(n: number): string {
		if (n >= 10) return 'ベテラン';
		if (n >= 5)  return '経験者';
		return '';
	}

	let deleteTargetId: string | null = null;
	let deleteTargetName = '';
	let deleteConfirmOpen = false;

	function askRemove(id: string, name: string) {
		deleteTargetId   = id;
		deleteTargetName = name;
		deleteConfirmOpen = true;
	}
	async function doRemove() {
		if (!deleteTargetId) return;
		await deleteMember(deleteTargetId);
		deleteTargetId = null;
	}
</script>

<div class="page">
	<div class="page-head">
		<div>
			<h1 class="page-title">メンバー</h1>
			<p class="page-sub">全 {$members.length} 名登録中</p>
		</div>
		<button class="btn btn-primary" on:click={() => goto('/members/new')}>追加</button>
	</div>

	{#if $members.length > 0}
		<input type="search" bind:value={query} placeholder="名前・学籍番号で検索" class="input" />
	{/if}

	{#if $members.length === 0}
		<div class="card empty">
			<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
				<circle cx="9" cy="7" r="4"/>
				<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
			</svg>
			<p class="empty-title">メンバーがいません</p>
			<p class="empty-sub">最初のメンバーを登録しましょう</p>
			<button class="btn btn-primary" style="margin-top:12px" on:click={() => goto('/members/new')}>メンバーを登録</button>
		</div>
	{:else if filtered.length === 0}
		<div class="card empty">
			<p class="empty-title">「{query}」に一致するメンバーが見つかりません</p>
		</div>
	{:else}
		<div class="member-list">
			{#each filtered as member (member.id)}
				{@const count = $participationCounts.get(member.id) ?? 0}
				<div class="member-row">
					<div class="avatar">{member.name[0]}</div>
					<div class="member-info">
						<div class="member-name-row">
							<span class="member-name">{member.name}</span>
							{#if expBadge(count)}
								<span class="badge badge-blue">{expBadge(count)}</span>
							{/if}
						</div>
						<div class="member-meta">
							<span>{member.studentId}</span>
							<span class="dot">·</span>
							<span>参加 {count} 回</span>
						</div>
					</div>
					<button class="del-btn" on:click={() => askRemove(member.id, member.name)} title="削除">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<ConfirmModal
	bind:open={deleteConfirmOpen}
	title="メンバーを削除"
	message="{deleteTargetName} を削除します。この操作は取り消せません。"
	confirmLabel="削除する"
	danger={true}
	on:confirm={doRemove}
/>

<style>
.page { display:flex; flex-direction:column; gap:12px; }
.page-head { display:flex; align-items:center; justify-content:space-between; }
.page-title { font-size:22px; font-weight:700; color:#0f172a; margin:0 0 2px; }
.page-sub   { font-size:13px; color:#94a3b8; margin:0; }

.member-list { display:flex; flex-direction:column; gap:2px; }
.member-row {
	display:flex; align-items:center; gap:12px;
	background:#fff; border:1px solid #e2e8f0; border-radius:10px;
	padding:12px 14px; transition:background .12s;
}

.avatar {
	width:40px; height:40px; border-radius:10px;
	background:#eff6ff; color:#2563eb;
	display:flex; align-items:center; justify-content:center;
	font-weight:700; font-size:15px; flex-shrink:0;
}

.member-info { flex:1; min-width:0; }
.member-name-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.member-name { font-size:14px; font-weight:600; color:#0f172a; }
.member-meta { font-size:11px; color:#94a3b8; margin-top:2px; display:flex; gap:4px; }
.dot { color:#cbd5e1; }

.del-btn {
	width:28px; height:28px; border-radius:7px; border:none; cursor:pointer;
	background:#f1f5f9; color:#94a3b8; display:flex; align-items:center; justify-content:center;
	flex-shrink:0; transition:background .12s, color .12s;
}
.del-btn:hover { background:#fee2e2; color:#ef4444; }
</style>
