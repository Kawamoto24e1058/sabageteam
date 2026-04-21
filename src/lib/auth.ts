/**
 * Firebase Authentication ラッパー
 * Email/Password・Google・電話番号（SMS）サインインをサポート
 */

import { auth, db } from './firebase';
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signInWithPopup,
	signInWithPhoneNumber,
	RecaptchaVerifier,
	GoogleAuthProvider,
	signOut as firebaseSignOut,
	type User,
	type ConfirmationResult
} from 'firebase/auth';
import {
	doc, setDoc, getDoc, collection, query, where, getDocs
} from 'firebase/firestore';
import type { Member } from './types';

// ── Firestore にメンバードキュメントが存在するか確認・作成 ─────
export async function ensureMemberDoc(
	user: User,
	name?: string,
	studentId?: string
): Promise<Member | null> {
	const ref  = doc(db, 'members', user.uid);
	const snap = await getDoc(ref);
	if (snap.exists()) return snap.data() as Member;

	if (!name || !studentId) return null;

	const member: Member = {
		id: user.uid,
		name: name.trim(),
		studentId: studentId.trim(),
		createdAt: new Date().toISOString()
	};
	await setDoc(ref, member);
	return member;
}

// ── 学籍番号の重複チェック ──────────────────────────────────
async function isStudentIdTaken(studentId: string): Promise<boolean> {
	const q    = query(collection(db, 'members'), where('studentId', '==', studentId.trim()));
	const snap = await getDocs(q);
	return !snap.empty;
}

// ── メール/パスワード 新規登録 ─────────────────────────────
export async function authRegister(
	email: string,
	password: string,
	name: string,
	studentId: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
	let cred;
	try {
		cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
	} catch (e: unknown) {
		const code = (e as { code?: string }).code;
		if (code === 'auth/email-already-in-use') return { ok: false, error: 'このメールアドレスはすでに使用されています' };
		if (code === 'auth/weak-password')         return { ok: false, error: 'パスワードは6文字以上にしてください' };
		return { ok: false, error: '登録に失敗しました。もう一度お試しください。' };
	}

	try {
		if (await isStudentIdTaken(studentId)) {
			await cred.user.delete();
			return { ok: false, error: 'この学籍番号はすでに登録されています' };
		}
		await ensureMemberDoc(cred.user, name, studentId);
		return { ok: true, userId: cred.user.uid };
	} catch {
		await cred.user.delete().catch(() => {});
		return { ok: false, error: '登録に失敗しました。もう一度お試しください。' };
	}
}

// ── メール/パスワード ログイン ──────────────────────────────
export async function authLogin(
	email: string,
	password: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
	try {
		const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
		return { ok: true, userId: cred.user.uid };
	} catch {
		return { ok: false, error: 'メールアドレスまたはパスワードが正しくありません' };
	}
}

// ── ソーシャル共通：メンバードキュメントの存在確認 ──────────
async function checkMemberExists(uid: string): Promise<boolean> {
	try {
		const snap = await getDoc(doc(db, 'members', uid));
		return snap.exists();
	} catch {
		return false;
	}
}

function socialErrorMessage(code: string | undefined): string {
	if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
	if (code === 'auth/unauthorized-domain') return 'このドメインはFirebase Authの承認済みドメインに登録されていません。Firebase Console > Authentication > Settings > 承認済みドメインに追加してください。';
	if (code === 'auth/popup-blocked')       return 'ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。';
	return 'ログインに失敗しました。もう一度お試しください。';
}

// ── Google サインイン ────────────────────────────────────
export async function authSignInWithGoogle(): Promise<
	{ ok: true; userId: string; isNew: boolean; displayName: string | null } |
	{ ok: false; error: string }
> {
	try {
		const provider = new GoogleAuthProvider();
		const cred     = await signInWithPopup(auth, provider);
		const exists   = await checkMemberExists(cred.user.uid);
		return { ok: true, userId: cred.user.uid, isNew: !exists, displayName: cred.user.displayName };
	} catch (e: unknown) {
		const code = (e as { code?: string }).code;
		console.error('Google sign-in error:', code, e);
		return { ok: false, error: socialErrorMessage(code) };
	}
}

// ── 電話番号：SMS送信 ────────────────────────────────────
// 日本の番号を国際形式に変換（09012345678 → +819012345678）
export function toE164(input: string): string {
	const clean = input.replace(/[\s\-\(\)]/g, '');
	if (clean.startsWith('+')) return clean;
	if (clean.startsWith('0')) return '+81' + clean.slice(1);
	return '+81' + clean;
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

export async function authSendPhoneOTP(
	phoneNumber: string,
	containerId: string
): Promise<{ ok: true; confirmation: ConfirmationResult } | { ok: false; error: string }> {
	try {
		// 既存の verifier をクリアして新規作成
		if (recaptchaVerifier) {
			recaptchaVerifier.clear();
			recaptchaVerifier = null;
		}
		recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
		const e164         = toE164(phoneNumber);
		const confirmation = await signInWithPhoneNumber(auth, e164, recaptchaVerifier);
		return { ok: true, confirmation };
	} catch (e: unknown) {
		recaptchaVerifier = null;
		const code = (e as { code?: string }).code;
		console.error('Phone OTP send error:', code, e);
		if (code === 'auth/invalid-phone-number')  return { ok: false, error: '電話番号の形式が正しくありません' };
		if (code === 'auth/too-many-requests')      return { ok: false, error: '試行回数が多すぎます。しばらくしてからお試しください' };
		if (code === 'auth/captcha-check-failed')   return { ok: false, error: 'reCAPTCHAの確認に失敗しました。ページを再読み込みしてください' };
		return { ok: false, error: 'SMSの送信に失敗しました。もう一度お試しください' };
	}
}

// ── 電話番号：OTP確認 ────────────────────────────────────
export async function authVerifyPhoneOTP(
	confirmation: ConfirmationResult,
	code: string
): Promise<{ ok: true; userId: string; isNew: boolean } | { ok: false; error: string }> {
	try {
		const cred   = await confirmation.confirm(code);
		const exists = await checkMemberExists(cred.user.uid);
		return { ok: true, userId: cred.user.uid, isNew: !exists };
	} catch (e: unknown) {
		const errCode = (e as { code?: string }).code;
		console.error('Phone OTP verify error:', errCode, e);
		if (errCode === 'auth/invalid-verification-code') return { ok: false, error: '認証コードが正しくありません' };
		if (errCode === 'auth/code-expired')               return { ok: false, error: '認証コードの有効期限が切れました。再送信してください' };
		return { ok: false, error: '認証に失敗しました。もう一度お試しください' };
	}
}

// ── サインアウト ────────────────────────────────────────
export async function authSignOut(): Promise<void> {
	await firebaseSignOut(auth);
}
