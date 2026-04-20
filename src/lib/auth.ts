/**
 * シンプルなメール/パスワード認証（localStorage ベース）
 *
 * ※ MVP 用のローカル実装です。
 *   本番環境では Firebase Authentication への移行を推奨します。
 */

import { browser } from '$app/environment';
import type { Member } from './types';

export interface UserAccount {
	id: string;     // Member.id と同一
	email: string;
	password: string;
	createdAt: string;
}

function getAccounts(): UserAccount[] {
	if (!browser) return [];
	try { return JSON.parse(localStorage.getItem('sm_accounts') ?? '[]'); }
	catch { return []; }
}

function saveAccounts(accounts: UserAccount[]) {
	if (browser) localStorage.setItem('sm_accounts', JSON.stringify(accounts));
}

// ── 新規登録 ─────────────────────────────────────────────────
export function authRegister(
	email: string,
	password: string,
	name: string,
	studentId: string,
	existingMembers: Member[]
): { ok: true; userId: string; member: Member } | { ok: false; error: string } {
	const accounts = getAccounts();

	if (accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())) {
		return { ok: false, error: 'このメールアドレスはすでに使用されています' };
	}
	if (existingMembers.find((m) => m.studentId === studentId.trim())) {
		return { ok: false, error: 'この学籍番号はすでに登録されています' };
	}

	const id = Math.random().toString(36).slice(2, 10);
	const account: UserAccount = {
		id,
		email: email.trim().toLowerCase(),
		password,
		createdAt: new Date().toISOString()
	};
	const member: Member = {
		id,
		name: name.trim(),
		studentId: studentId.trim(),
		createdAt: new Date().toISOString()
	};

	saveAccounts([...accounts, account]);
	return { ok: true, userId: id, member };
}

// ── ログイン ─────────────────────────────────────────────────
export function authLogin(
	email: string,
	password: string
): { ok: true; userId: string } | { ok: false; error: string } {
	const accounts = getAccounts();
	const account = accounts.find((a) => a.email === email.trim().toLowerCase());

	if (!account || account.password !== password) {
		return { ok: false, error: 'メールアドレスまたはパスワードが正しくありません' };
	}
	return { ok: true, userId: account.id };
}
