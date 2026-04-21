<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let open    = false;
	export let title   = '確認';
	export let message = '';
	export let confirmLabel = '実行する';
	export let cancelLabel  = 'キャンセル';
	export let danger  = false;   // true → 確認ボタンを赤に

	const dispatch = createEventDispatcher<{ confirm: void; cancel: void }>();

	function onConfirm() { open = false; dispatch('confirm'); }
	function onCancel()  { open = false; dispatch('cancel');  }

	function onBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onCancel();
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onCancel();
		if (e.key === 'Enter')  onConfirm();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="backdrop" on:click={onBackdrop}>
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-icon" class:danger>
				{#if danger}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
						<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
					</svg>
				{:else}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<circle cx="12" cy="12" r="10"/>
						<line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
					</svg>
				{/if}
			</div>
			<h2 class="modal-title">{title}</h2>
			{#if message}
				<p class="modal-msg">{message}</p>
			{/if}
			<div class="modal-actions">
				<button class="btn-cancel" on:click={onCancel}>{cancelLabel}</button>
				<button
					class="btn-confirm"
					class:danger
					on:click={onConfirm}
					on:keydown={onKeydown}
				>{confirmLabel}</button>
			</div>
		</div>
	</div>
{/if}

<style>
.backdrop {
	position: fixed; inset: 0; z-index: 9999;
	background: rgba(15, 23, 42, 0.45);
	backdrop-filter: blur(4px);
	display: flex; align-items: center; justify-content: center;
	padding: 24px;
	animation: fade-in .15s ease;
}
@keyframes fade-in {
	from { opacity: 0; }
	to   { opacity: 1; }
}

.modal {
	background: #fff; border-radius: 20px;
	padding: 28px 24px 22px;
	width: 100%; max-width: 320px;
	display: flex; flex-direction: column; align-items: center;
	gap: 8px; text-align: center;
	box-shadow: 0 20px 60px rgba(0,0,0,.18);
	animation: slide-up .18s ease;
}
@keyframes slide-up {
	from { transform: translateY(10px); opacity: 0; }
	to   { transform: translateY(0);    opacity: 1; }
}

.modal-icon {
	width: 52px; height: 52px; border-radius: 14px;
	background: #f1f5f9; color: #475569;
	display: flex; align-items: center; justify-content: center;
	margin-bottom: 4px;
}
.modal-icon.danger { background: #fee2e2; color: #dc2626; }

.modal-title {
	font-size: 17px; font-weight: 700; color: #0f172a;
	margin: 0;
}
.modal-msg {
	font-size: 13px; color: #64748b; margin: 0;
	line-height: 1.55;
}

.modal-actions {
	display: flex; flex-direction: column; gap: 8px;
	width: 100%; margin-top: 10px;
}

.btn-confirm {
	width: 100%; padding: 13px;
	border-radius: 12px; border: none; cursor: pointer;
	font-size: 14px; font-weight: 700;
	background: #2563eb; color: #fff;
	transition: background .15s;
}
.btn-confirm.danger { background: #dc2626; }
.btn-confirm:hover  { background: #1d4ed8; }
.btn-confirm.danger:hover { background: #b91c1c; }

.btn-cancel {
	width: 100%; padding: 13px;
	border-radius: 12px; border: none; cursor: pointer;
	font-size: 14px; font-weight: 600;
	background: #f1f5f9; color: #475569;
	transition: background .15s;
}
.btn-cancel:hover { background: #e2e8f0; }
</style>
