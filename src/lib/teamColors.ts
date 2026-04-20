// ============================================================
// チームカラー設定（最大6チーム対応）
// ============================================================

export interface TeamConfig {
	name: string;
	emoji: string;
	headerBg: string;
	lightBg: string;
	borderColor: string;
	scoreText: string;
	headerText: string;
	accentText: string;
}

export const TEAM_CONFIGS: TeamConfig[] = [
	{
		name: '赤チーム',
		emoji: '🔴',
		headerBg: '#EF4444',
		lightBg: '#FEF2F2',
		borderColor: '#FCA5A5',
		scoreText: '#DC2626',
		headerText: '#ffffff',
		accentText: '#EF4444'
	},
	{
		name: '黄チーム',
		emoji: '🟡',
		headerBg: '#EAB308',
		lightBg: '#FEFCE8',
		borderColor: '#FDE047',
		scoreText: '#CA8A04',
		headerText: '#713f12',
		accentText: '#CA8A04'
	},
	{
		name: '青チーム',
		emoji: '🔵',
		headerBg: '#3B82F6',
		lightBg: '#EFF6FF',
		borderColor: '#93C5FD',
		scoreText: '#2563EB',
		headerText: '#ffffff',
		accentText: '#3B82F6'
	},
	{
		name: '緑チーム',
		emoji: '🟢',
		headerBg: '#22C55E',
		lightBg: '#F0FDF4',
		borderColor: '#86EFAC',
		scoreText: '#16A34A',
		headerText: '#ffffff',
		accentText: '#22C55E'
	},
	{
		name: '紫チーム',
		emoji: '🟣',
		headerBg: '#A855F7',
		lightBg: '#FAF5FF',
		borderColor: '#D8B4FE',
		scoreText: '#9333EA',
		headerText: '#ffffff',
		accentText: '#A855F7'
	},
	{
		name: 'オレンジ',
		emoji: '🟠',
		headerBg: '#F97316',
		lightBg: '#FFF7ED',
		borderColor: '#FDBA74',
		scoreText: '#EA580C',
		headerText: '#ffffff',
		accentText: '#F97316'
	}
];
