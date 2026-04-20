<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	type ScanState = 'scanning' | 'detected' | 'error';
	let state: ScanState = 'scanning'; // 最初からスキャン中として開始
	let errorMessage = '';
	let detectedData = '';
	let detectedSessionId = '';

	let videoEl: HTMLVideoElement;
	let canvasEl: HTMLCanvasElement;

	let stream: MediaStream | null = null;
	let rafId: number | null = null;
	let scanning = false;

	type JsQRFn = (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
	let jsQR: JsQRFn | null = null;

	onMount(async () => {
		if (!browser) return;
		// jsqr を正しくインポート（@vite-ignore を外してViteにバンドルさせる）
		try {
			const mod = await import('jsqr');
			jsQR = (mod.default ?? mod) as JsQRFn;
		} catch (e) {
			console.warn('jsqr load failed:', e);
			// jsqr がなくてもカメラは起動できるのでエラーにしない
		}
		// ページを開いたら即カメラ起動
		await startCamera();
	});

	onDestroy(() => {
		stopCamera();
	});

	async function startCamera() {
		state = 'scanning';
		errorMessage = '';

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
			});
			videoEl.srcObject = stream;
			videoEl.setAttribute('playsinline', 'true');
			await videoEl.play();
			scanning = true;
			scan();
		} catch (e: unknown) {
			state = 'error';
			if (e instanceof DOMException && e.name === 'NotAllowedError') {
				errorMessage = 'カメラへのアクセスが拒否されました。\nブラウザの設定からカメラを許可してください。';
			} else if (e instanceof DOMException && e.name === 'NotFoundError') {
				errorMessage = 'カメラが見つかりません。\nカメラ付きのデバイスでお試しください。';
			} else {
				errorMessage = 'カメラの起動に失敗しました。';
			}
		}
	}

	function stopCamera() {
		scanning = false;
		if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
		if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
	}

	function scan() {
		if (!scanning) return;
		rafId = requestAnimationFrame(scan);

		if (!jsQR || !videoEl || videoEl.readyState < videoEl.HAVE_ENOUGH_DATA) return;

		const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;

		canvasEl.width  = videoEl.videoWidth;
		canvasEl.height = videoEl.videoHeight;
		ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

		const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
		const code = jsQR(imageData.data, imageData.width, imageData.height);

		if (code) onDetected(code.data);
	}

	function onDetected(data: string) {
		stopCamera();
		detectedData = data;

		try {
			const url   = new URL(data);
			const match = url.pathname.match(/^\/checkin\/([a-z0-9]+)$/i);
			if (match) {
				detectedSessionId = match[1];
				state = 'detected';
				return;
			}
		} catch { /* URL でなければ無視 */ }

		detectedSessionId = '';
		state = 'detected';
	}

	function goCheckin() {
		if (detectedSessionId) goto(`/checkin/${detectedSessionId}`);
	}

	async function retry() {
		detectedData = '';
		detectedSessionId = '';
		await startCamera();
	}
</script>

<svelte:head>
	<title>QRスキャン | SabageManager</title>
</svelte:head>

<div class="min-h-screen flex flex-col" style="background: #0f172a">

	<!-- ヘッダー -->
	<div class="flex items-center gap-3 px-5 pt-10 pb-4 shrink-0">
		<button
			class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
			on:click={() => goto('/')}
		>←</button>
		<div>
			<h1 class="text-white text-xl font-bold">QRスキャン</h1>
			<p class="text-slate-400 text-xs mt-0.5">チェックインQRコードをスキャン</p>
		</div>
	</div>

	<div class="flex-1 flex flex-col items-center justify-start px-5 pb-8">

		<!-- ── スキャン中 ── -->
		{#if state === 'scanning'}
			<div class="w-full max-w-sm mt-4 space-y-4">
				<div class="relative aspect-square rounded-3xl overflow-hidden bg-black">
					<!-- svelte-ignore a11y-media-has-caption -->
					<video
						bind:this={videoEl}
						class="absolute inset-0 w-full h-full object-cover"
						playsinline autoplay muted
					></video>
					<canvas bind:this={canvasEl} class="hidden"></canvas>

					<!-- スキャン枠オーバーレイ -->
					<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div class="relative w-56 h-56">
							<div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
							<div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
							<div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
							<div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
							<div class="absolute left-2 right-2 h-0.5 bg-blue-400/80 animate-scan-line"></div>
						</div>
					</div>
					<div class="absolute inset-0 pointer-events-none"
						style="background: radial-gradient(ellipse 200px 200px at center, transparent 0%, rgba(0,0,0,0.55) 100%)">
					</div>
				</div>
				<p class="text-slate-400 text-sm text-center animate-pulse">QRコードを枠内に合わせてください</p>
			</div>

		<!-- ── 検出完了 ── -->
		{:else if state === 'detected'}
			<div class="w-full max-w-sm mt-4 space-y-4">
				{#if detectedSessionId}
					<div class="aspect-square rounded-3xl bg-emerald-900/30 border-2 border-emerald-500/50 flex flex-col items-center justify-center text-center p-8">
						<div class="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-4xl mb-4">✅</div>
						<p class="text-white font-bold text-lg">チェックインQRを検出！</p>
						<p class="text-emerald-300 text-sm mt-1">タップしてチェックインを開始</p>
					</div>
					<button
						class="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors"
						on:click={goCheckin}
					>チェックインへ進む →</button>
				{:else}
					<div class="aspect-square rounded-3xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-center p-8">
						<div class="text-4xl mb-4">🔍</div>
						<p class="text-white font-semibold">QRコードを検出</p>
						<p class="text-slate-400 text-xs mt-2 break-all leading-relaxed">{detectedData}</p>
					</div>
					<p class="text-slate-400 text-xs text-center">チェックイン用のQRコードではありませんでした</p>
				{/if}
				<button
					class="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
					on:click={retry}
				>もう一度スキャン</button>
			</div>

		<!-- ── エラー ── -->
		{:else if state === 'error'}
			<div class="w-full max-w-sm mt-4 space-y-4">
				<div class="aspect-square rounded-3xl bg-red-900/20 border border-red-500/30 flex flex-col items-center justify-center text-center p-8">
					<div class="text-5xl mb-4">📵</div>
					<p class="text-white font-semibold">カメラを使用できません</p>
					<p class="text-red-300 text-sm mt-2 whitespace-pre-line">{errorMessage}</p>
				</div>
				<button
					class="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
					on:click={retry}
				>再試行</button>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes scan-line {
		0%   { top: 8px; }
		50%  { top: calc(100% - 8px); }
		100% { top: 8px; }
	}
	.animate-scan-line { animation: scan-line 2s ease-in-out infinite; }
</style>
