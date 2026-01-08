/**
 * ==========================================
 * DATA DEFINITIONS (拡張版)
 * ==========================================
 */

const SKILLS = [
    // 攻撃スキル
    { id: 'slash', name: '斬撃', type: 'attack', power: 1.2, cd: 2000, initialDelay: 500, desc: '標準的な攻撃' },
    { id: 'quick_stab', name: '速突', type: 'attack', power: 0.7, cd: 1000, initialDelay: 0, desc: '隙の少ない素早い攻撃' },
    { id: 'heavy_slash', name: '重撃', type: 'attack', power: 2.5, cd: 5000, initialDelay: 1000, desc: '遅いが強力な一撃' },
    { id: 'double_cut', name: '二連斬り', type: 'attack', power: 0.9, cd: 2500, initialDelay: 200, desc: '手数の多い連撃' },
    { id: 'execute', name: '処刑', type: 'attack', power: 3.5, cd: 8000, initialDelay: 2000, desc: '非常に重い必殺の一撃' },
    { id: 'venom_strike', name: '毒牙', type: 'attack', power: 0.8, cd: 3000, initialDelay: 300, desc: '弱毒を含む攻撃' },
    { id: 'sonic_wave', name: '衝撃波', type: 'attack', power: 1.0, cd: 1500, initialDelay: 0, desc: '発生の早い遠隔攻撃' },

    // 回復・支援スキル
    { id: 'heal', name: '小回復', type: 'heal', power: 15, cd: 4000, initialDelay: 1000, desc: 'HPを少し回復する' },
    { id: 'high_heal', name: '大回復', type: 'heal', power: 35, cd: 9000, initialDelay: 2500, desc: 'HPを大きく回復する' },
    { id: 'regen_prayer', name: '再生の祈り', type: 'heal', power: 10, cd: 2500, initialDelay: 500, desc: 'こまめに回復を行う' },
    
    // バフスキル
    { id: 'shield', name: '防御', type: 'buff', stat: 'def', power: 5, duration: 3000, cd: 6000, initialDelay: 500, desc: '一時的に防御UP' },
    { id: 'rage', name: '激昂', type: 'buff', stat: 'atk', power: 8, duration: 4000, cd: 8000, initialDelay: 0, desc: '一時的に攻撃UP' },
    { id: 'focus', name: '集中', type: 'buff', stat: 'sup', power: 5, duration: 5000, cd: 7000, initialDelay: 1000, desc: '一時的に支援力UP' }
];

const RELICS = [
    { id: 'sword_pendant', name: '剣のペンダント', stats: { atk: 5 }, desc: '攻撃力+5' },
    { id: 'armor_plate', name: '防護プレート', stats: { def: 3 }, desc: '防御力+3' },
    { id: 'vitality_ring', name: '生命の指輪', stats: { maxHp: 20 }, desc: '最大HP+20' },
    { id: 'healing_herb', name: '薬草ポーチ', stats: { sup: 4 }, desc: '支援力+4' },
    { id: 'knights_crest', name: '騎士の紋章', stats: { atk: 3, def: 3 }, desc: '攻撃と防御が少し上昇' },
    { id: 'giants_belt', name: '巨人のベルト', stats: { maxHp: 50 }, desc: '最大HPが大幅に上昇' },
    { id: 'assassins_gloves', name: '暗殺者の手袋', stats: { atk: 8, def: -2 }, desc: '攻撃上昇、防御微減' },
    { id: 'blessed_amulet', name: '祝福のお守り', stats: { sup: 8, maxHp: 10 }, desc: '支援力とHPが上昇' }
];

const CURSED_RELICS = [
    { id: 'blood_blade', name: '血塗られた刃', stats: { atk: 15, maxHp: -20 }, desc: '攻撃力+15 / 最大HP-20' },
    { id: 'heavy_armor', name: '呪いの重鎧', stats: { def: 10, atk: -5 }, desc: '防御力+10 / 攻撃力-5' },
    { id: 'glass_heart', name: '硝子の心臓', stats: { sup: 15, maxHp: -30 }, desc: '支援力+15 / 最大HP-30' },
    { id: 'berserkers_shackles', name: '狂戦士の枷', stats: { atk: 25, def: -10 }, desc: '攻撃力+25 / 防御力-10' },
    { id: 'withered_branch', name: '枯れた枝', stats: { maxHp: 50, atk: -5, sup: -5 }, desc: 'HP+50 / 攻・支-5' }
];

const ENEMIES = [
    { name: 'スライム', hp: 50, atk: 8, def: 2, skills: ['slash'] },
    { name: 'ラット', hp: 45, atk: 10, def: 1, skills: ['quick_stab'] },
    { name: 'バット', hp: 40, atk: 9, def: 1, skills: ['sonic_wave'] },
    
    { name: 'ゴブリン', hp: 80, atk: 12, def: 4, skills: ['slash', 'quick_stab'] },
    { name: 'ウルフ', hp: 70, atk: 14, def: 3, skills: ['double_cut'] },
    { name: 'スケルトン', hp: 90, atk: 11, def: 6, skills: ['slash', 'shield'] },
    
    { name: 'オーク', hp: 150, atk: 15, def: 8, skills: ['heavy_slash', 'slash'] },
    { name: 'ヒーラー', hp: 100, atk: 10, def: 5, skills: ['slash', 'heal'] },
    { name: 'ローグ', hp: 110, atk: 18, def: 3, skills: ['venom_strike', 'quick_stab'] },
    
    { name: 'リザードマン', hp: 180, atk: 16, def: 10, skills: ['double_cut', 'shield'] },
    { name: 'ゴースト', hp: 130, atk: 15, sup: 10, def: 2, skills: ['sonic_wave', 'regen_prayer'] },
    { name: '魔術師見習い', hp: 120, atk: 20, def: 4, skills: ['sonic_wave', 'rage'] },

    { name: 'ダークナイト', hp: 250, atk: 20, def: 15, skills: ['heavy_slash', 'shield'] },
    { name: 'ハイオーク', hp: 300, atk: 22, def: 10, skills: ['execute', 'rage'] },
    { name: 'アークビショップ', hp: 220, atk: 15, sup: 25, def: 12, skills: ['high_heal', 'sonic_wave'] },

    { name: 'ドラゴン', hp: 500, atk: 30, def: 20, skills: ['execute', 'sonic_wave', 'rage'] }
];