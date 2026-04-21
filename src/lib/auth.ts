/**
 * Firebase Authentication ラッパー
 * Email/Password・Google サインインをサポート
 */

import { auth, db } from './firebase';
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signInWithPopup,
	GoogleAuthProvider,
	signOut as firebaseSignOut,
	type User
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

// ── Google サインイン ────────────────────────────────────
async function checkMemberExists(uid: string): Promise<boolean> {
	try {
		const snap = await getDoc(doc(db, 'members', uid));
		return snap.exists();
	} catch {
		return false;
	}
}

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
		if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return { ok: false, error: '' };
		if (code === 'auth/unauthorized-domain') return { ok: false, error: 'このドメインはFirebase Authの承認済みドメインに登録されていません。' };
		if (code === 'auth/popup-blocked')        return { ok: false, error: 'ポップアップがブロックされました。ブラウザの設定で許可してください。' };
		return { ok: false, error: 'Googleログインに失敗しました。もう一度お試しください。' };
	}
}

// ── サインアウト ────────────────────────────────────────
export async function authSignOut(): Promise<void> {
	await firebaseSignOut(auth);
}
