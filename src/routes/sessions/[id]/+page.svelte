<script lang="ts">
	import { page } from '$app/stores';
	import { sessions, allCheckIns, members, currentSessionId } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	$: sid      = $page.params.id;
	$: session  = $sessions.find((s) => s.id === sid);
	$: checkIns = $allCheckIns.filter((ci) => ci.sessionId === sid);

	$: checkinUrl = browser ? `${window.location.origin}/checkin/${sid}` : `/checkin/${sid}`;
	$: qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=1a1a1a&bgcolor=ffffff&data=${encodeURIComponent(checkinUrl)}`;

	let copied = false;

	function copyUrl() {
		navigator.clipboard.writeText(checkinUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function shareUrl() {
		if (navigator.share) await navigator.share({ title: session?.title, url: checkinUrl });
		else copyUrl();
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
	}
</script>

{#if !session}
	<div class="card text-center py-12">
		<p class="text-gray-500">セッションが見つかりません</p>
		<button class="btn-primary mt-4" on:click={() => goto('/sessions')}>一覧へ</button>
	</div>
{:else}
	<div class="space-y-4 max-w-md mx-auto">
		<div class="flex items-center gap-3">
			<button class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors" on:click={() => goto('/sessions')}>←</button>
			<h1 class="text-xl font-bold text-gray-900 truncate">{session.title}</h1>
		</div>

		<div class="card space-y-1.5">
			<div class="flex items-center gap-2 text-sm text-gray-600"><span>📅</span><span>{formatDate(session.date)}</span></div>
			{#if session.location}<div class="flex items-center gap-2 text-sm text-gray-600"><span>📍</span><span>{session.location}</span></div>{/if}
			<div class="flex items-center gap-2 text-sm text-gray-600"><span>✅</span><span>{checkIns.length} 名チェックイン済み</span></div>
		</div>

		<!-- QRコード -->
		<div class="card text-center space-y-4">
			<div>
				<h2 class="font-bold text-gray-800">チェックインQR</h2>
				<p class="text-xs text-gray-400 mt-0.5">メンバーにスキャンしてもらいます</p>
			</div>
			<div class="flex justify-center">
				<div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 inline-block">
					<img src={qrUrl} alt="QRコード" class="w-[200px] h-[200px] rounded-lg" loading="lazy" />
				</div>
			</div>
			<div class="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 font-mono break-all text-left">{checkinUrl}</div>
			<div class="flex gap-2">
				<button class="btn-primary flex-1" on:click={shareUrl}>📤 共有</button>
				<button class="btn-secondary flex-1 {copied ? '!bg-green-100 !text-green-700' : ''}" on:click={copyUrl}>{copied ? '✓ コピー済み' : '📋 コピー'}</button>
			</div>
		</div>

		{#if checkIns.length > 0}
			<div class="card">
				<h2 class="text-sm font-semibold text-gray-700 mb-3">参加メンバー</h2>
				<div class="flex flex-wrap gap-1.5">
					{#each checkIns as ci}
						{@const member = $members.find((m) => m.id === ci.memberId)}
						{#if member}
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium {ci.gearType === 'own' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}">
								{member.name}
							</span>
						{/if}
					{/each}
				</div>
			</div>
		{/if}

		<button class="btn-primary w-full py-3" on:click={() => { currentSessionId.set(sid); goto('/'); }}>
			このセッションでチーム分けする →
		</button>
	</div>
{/if}
