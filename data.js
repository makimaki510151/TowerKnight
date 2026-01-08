/**
 * ==========================================
 * DATA DEFINITIONS (拡張用データ)
 * ==========================================
 */

const SKILLS = [
    { id: 'slash', name: '斬撃', type: 'attack', power: 1.2, cd: 2000, initialDelay: 500, desc: '標準的な攻撃' },
    { id: 'heavy_slash', name: '重撃', type: 'attack', power: 2.5, cd: 5000, initialDelay: 1000, desc: '強力な一撃' },
    { id: 'quick_stab', name: '速突', type: 'attack', power: 0.7, cd: 1000, initialDelay: 0, desc: '素早い攻撃' },
    { id: 'heal', name: '回復', type: 'heal', power: 15, cd: 4000, initialDelay: 2000, desc: 'HPを回復する' },
    { id: 'shield', name: '防御', type: 'buff', stat: 'def', power: 5, duration: 3000, cd: 6000, initialDelay: 1000, desc: '一時的に防御UP' }
];

const RELICS = [
    { id: 'sword_pendant', name: '剣のペンダント', stats: { atk: 5 }, desc: '攻撃力+5' },
    { id: 'armor_plate', name: '防護プレート', stats: { def: 3 }, desc: '防御力+3' },
    { id: 'vitality_ring', name: '生命の指輪', stats: { maxHp: 20 }, desc: '最大HP+20' }
];

const CURSED_RELICS = [
    { id: 'blood_blade', name: '血塗られた刃', stats: { atk: 15, maxHp: -20 }, desc: '攻撃力+15 / 最大HP-20' },
    { id: 'heavy_armor', name: '呪いの重鎧', stats: { def: 10, atk: -5 }, desc: '防御力+10 / 攻撃力-5' }
];

const ENEMIES = [
    { name: 'スライム', hp: 50, atk: 8, def: 2, skills: ['slash'] },
    { name: 'ゴブリン', hp: 80, atk: 12, def: 4, skills: ['slash', 'quick_stab'] },
    { name: 'オーク', hp: 150, atk: 15, def: 8, skills: ['heavy_slash', 'slash'] },
    { name: 'ヒーラー', hp: 100, atk: 10, def: 5, skills: ['slash', 'heal'] },
    { name: 'ダークナイト', hp: 250, atk: 20, def: 15, skills: ['heavy_slash', 'shield'] }
];
