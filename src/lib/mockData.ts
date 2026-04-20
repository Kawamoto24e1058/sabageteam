import type { Member, Session, CheckIn } from './types';

// ============================================================
// モックデータ（初回起動時のシードデータ）
// ============================================================

export const MOCK_MEMBERS: Member[] = [
	{ id: '1',  name: '田中 翔太',   studentId: 'S2401001', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '2',  name: '鈴木 美咲',   studentId: 'S2401002', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '3',  name: '佐藤 健一',   studentId: 'S2401003', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '4',  name: '高橋 ゆい',   studentId: 'S2302004', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '5',  name: '伊藤 大輝',   studentId: 'S2401005', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '6',  name: '渡辺 さくら', studentId: 'S2302006', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '7',  name: '山本 龍之介', studentId: 'S2201007', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '8',  name: '中村 あかり', studentId: 'S2401008', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '9',  name: '小林 拓也',   studentId: 'S2302009', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '10', name: '加藤 ひなた', studentId: 'S2401010', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '11', name: '吉田 悠真',   studentId: 'S2401011', createdAt: '2024-04-01T00:00:00Z' },
	{ id: '12', name: '山田 莉子',   studentId: 'S2201012', createdAt: '2024-04-01T00:00:00Z' },
];

// 過去セッションのモックデータ（参加回数の初期値として使用）
export const MOCK_SESSIONS: Session[] = [
	{ id: 's_mock_1', title: '春季定例戦 #1', date: '2024-04-07', location: 'フィールドA', createdAt: '2024-04-07T08:00:00Z' },
	{ id: 's_mock_2', title: '春季定例戦 #2', date: '2024-05-12', location: 'フィールドA', createdAt: '2024-05-12T08:00:00Z' },
	{ id: 's_mock_3', title: '夏季特別戦',   date: '2024-07-21', location: 'フィールドB', createdAt: '2024-07-21T08:00:00Z' },
];

// 過去チェックインのモックデータ（累計参加回数のシード）
export const MOCK_CHECKINS: CheckIn[] = [
	// セッション1: 全員参加
	...MOCK_MEMBERS.map((m, i) => ({
		id: `ci_mock_1_${m.id}`,
		memberId: m.id,
		sessionId: 's_mock_1',
		gearType: (i % 3 === 0 ? 'rental' : 'own') as 'own' | 'rental',
		checkedInAt: '2024-04-07T09:00:00Z',
	})),
	// セッション2: 一部参加
	...['1','2','4','6','7','9','10','12'].map((id, i) => ({
		id: `ci_mock_2_${id}`,
		memberId: id,
		sessionId: 's_mock_2',
		gearType: (i % 3 === 0 ? 'rental' : 'own') as 'own' | 'rental',
		checkedInAt: '2024-05-12T09:00:00Z',
	})),
	// セッション3: 一部参加
	...['1','3','4','5','7','8','10','11','12'].map((id, i) => ({
		id: `ci_mock_3_${id}`,
		memberId: id,
		sessionId: 's_mock_3',
		gearType: (i % 2 === 0 ? 'rental' : 'own') as 'own' | 'rental',
		checkedInAt: '2024-07-21T09:00:00Z',
	})),
];
