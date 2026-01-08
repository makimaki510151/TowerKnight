/**
 * ==========================================
 * DATA DEFINITIONS (Advanced Mechanics)
 * ==========================================
 * * 原則：
 * - 完全上位互換を作らない（威力が高ければCDが長い、自傷がある等）
 * - 呪物は遺物より強力だが、明確なデメリットを持つ
 */

const SKILLS = [
    // --- 攻撃系 (Basic Attack Types) ---
    { id: 'slash', name: '斬撃', type: 'attack', power: 1.0, cd: 2000, initialDelay: 500, desc: '標準的な攻撃。扱いやすい。' },
    { id: 'quick_stab', name: '速突', type: 'attack', power: 0.6, cd: 1000, initialDelay: 0, desc: '威力は低いが回転率が良い。' },
    { id: 'heavy_slam', name: '大振撃', type: 'attack', power: 2.5, cd: 4500, initialDelay: 1500, desc: '強力だが隙が大きい一撃。' },
    { id: 'execute', name: '処刑', type: 'attack', power: 4.0, cd: 8000, initialDelay: 3000, desc: '致命的な一撃を与えるが、準備に時間がかかる。' },
    { id: 'double_edge', name: '諸刃の剣', type: 'attack', power: 2.0, cd: 2000, initialDelay: 200, selfDmg: 0.1, desc: '高威力・高速だが、自身のHPを10%消費する。' },

    // --- 防御・シールド系 (Shields) ---
    { id: 'parry', name: '受け流し', type: 'shield', power: 15, cd: 3000, initialDelay: 0, duration: 1500, desc: '短時間、少量のシールドを展開する。' },
    { id: 'iron_wall', name: '鉄壁', type: 'shield', power: 50, cd: 10000, initialDelay: 1000, duration: 5000, desc: '長時間、強力なシールドを展開する。' },

    // --- 継続ダメージ系 (DoT) ---
    { id: 'poison_blade', name: '毒刃', type: 'dot', effectType: 'poison', power: 0.5, effectVal: 5, duration: 5000, cd: 4000, initialDelay: 500, desc: '斬撃に加え、5秒間継続ダメージを与える。' },
    { id: 'ignite', name: '点火', type: 'dot', effectType: 'burn', power: 0.2, effectVal: 10, duration: 3000, cd: 6000, initialDelay: 1000, desc: '威力は低いが、短時間で激しい燃焼ダメージを与える。' },

    // --- バフ・デバフ系 (Buffs/Debuffs) ---
    { id: 'berserk', name: 'バーサーク', type: 'buff', stat: 'atk', amount: 0.5, duration: 5000, cd: 10000, initialDelay: 0, selfDebuff: { stat: 'def', amount: -0.5 }, desc: '5秒間攻撃力が50%上昇するが、防御力が半減する。' },
    { id: 'harden', name: '硬化', type: 'buff', stat: 'def', amount: 1, duration: 4000, cd: 8000, initialDelay: 500, desc: '一時的に防御力を％で上昇させる。' },
    { id: 'intimidate', name: '威圧', type: 'debuff', stat: 'atk', amount: -0.3, duration: 4000, cd: 9000, initialDelay: 1000, desc: '敵の攻撃力を30%下げる。' },
    { id: 'break_armor', name: '鎧砕き', type: 'attack', power: 0.8, debuff: { stat: 'def', amount: -5, duration: 5000 }, cd: 5000, initialDelay: 800, desc: '攻撃しつつ、敵の防御力を下げる。' },

    // --- 回復系 (Heal) ---
    { id: 'heal', name: '応急手当', type: 'heal', power: 20, cd: 5000, initialDelay: 1000, desc: 'HPを中程度回復する。' },
    { id: 'regen', name: '再生', type: 'buff', effectType: 'regen', effectVal: 5, duration: 8000, cd: 12000, initialDelay: 0, desc: '8秒間、徐々にHPを回復する。' },

    // --- 特殊攻撃系 ---
    { id: 'dragon_breath', name: '竜の息吹', type: 'dot', effectType: 'burn', power: 1.5, effectVal: 20, duration: 6000, cd: 12000, initialDelay: 2000, desc: '広範囲を焼き払い、強力な燃焼ダメージを与える。' },
    { id: 'void_compression', name: '虚無の圧縮', type: 'attack', power: 5.0, cd: 15000, initialDelay: 4000, desc: '極大ダメージを与えるが、発動までの隙が非常に大きい。' },
    { id: 'soul_drain', name: '魂の吸収', type: 'attack', power: 1.2, lifesteal: 0.5, cd: 10000, initialDelay: 1000, desc: '敵にダメージを与え、与えたダメージの50%を回復する。' },

    // --- 特殊補助系 ---
    { id: 'time_stop', name: '刻の停止', type: 'debuff', stat: 'cd', amount: 5000, duration: 1, cd: 20000, initialDelay: 500, desc: '敵の全スキルのクールダウンを一時的に5秒増加させる。' },
    { id: 'absolute_defense', name: '絶対防御', type: 'shield', power: 200, cd: 30000, initialDelay: 0, duration: 3000, desc: '極めて強力なシールドを展開するが、再使用に時間がかかる。' }
];

const RELICS = [
    { id: 'warrior_ring', name: '戦士の指輪', stats: { atk: 5, def: 2 }, desc: '攻撃と防御が上昇。' },
    { id: 'light_feather', name: '軽い羽根', stats: { def: 20 }, special: { cdReduc: 50 }, desc: '防御が上がり、全スキルのCTが0.2秒短縮。' },
    { id: 'heavy_gauntlet', name: '重い手甲', stats: { atk: 8, def: 8 }, desc: '攻防が大きく上昇する。' },
    { id: 'vampire_tooth', name: '吸血の牙', stats: { atk: 3 }, special: { lifesteal: 0.15 }, desc: '攻撃力が上がり、与ダメージの15%を回復。' },
    { id: 'scholar_glasses', name: '学者の眼鏡', stats: { sup: 12, atk: 2 }, desc: '支援力と攻撃力が上がる。' },
    { id: 'turtle_shell', name: '亀の甲羅', stats: { def: 12, hp: 20 }, desc: '防御力とHPが上昇する。' },
    { id: 'hero_cloak', name: '勇者のマント', stats: { atk: 15, def: 15, hp: 80 }, desc: '伝説の勇者が纏ったとされるマント。全体的な能力が向上する。' },
    { id: 'wisdom_orb', name: '知恵の宝珠', stats: { sup: 20 }, special: { cdReduc: 100 }, desc: 'スキルの回転率を上げ、支援力を大幅に高める。' }
];

const CURSED_RELICS = [
    { id: 'demon_muscle', name: '鬼神の筋肉', stats: { atk: 35 }, special: { selfDmgTick: 4 }, desc: '攻撃力が劇的に上昇するが、毎秒4ダメージ受ける。' },
    { id: 'glass_cannon', name: '硝子の大砲', stats: { atk: 50 }, statsRaw: { maxHp: 0.4 }, desc: '攻撃力が極大化するが、最大HPが40%になる。' },
    { id: 'cursed_clock', name: '狂った時計', special: { cdReduc: 800, randomDelay: 1200 }, desc: 'CTが0.8秒短縮されるが、発動時にランダムで最大1.2秒遅延する。' },
    { id: 'blood_pact', name: '血の契約', stats: { sup: 45 }, special: { healingBan: true }, desc: '支援力が圧倒的になるが、通常回復が無効化される。' },
    { id: 'sloth_statue', name: '怠惰の像', stats: { def: 35, maxHp: 100 }, special: { cdIncrease: 1500 }, desc: '耐久力が跳ね上がるが、行動速度が著しく低下する。' },
    { id: 'berserker_soul', name: '狂戦士の魂', stats: { atk: 80 }, special: { defZero: true }, desc: '攻撃力が爆発的に上昇するが、防御力が強制的に0になる。' },
    { id: 'eternal_famine', name: '永劫の飢餓', special: { lifesteal: 0.4, maxHpReduc: 0.8 }, desc: '高い吸血能力を得るが、最大HPが20%の状態からスタートする。' },
    { id: 'sacrifice_pawn', name: '身代わりの駒', special: { cheatDeath: 1, breakOnUse: true }, desc: '一度だけ死亡を回避できるが、発動時に全ての装備中の遺物が消滅する。' }
];

const ENEMIES = [
    // 序盤
    { name: 'スライム', hp: 15, atk: 8, def: 2, skills: ['slash'] },
    { name: '毒バチ', hp: 45, atk: 12, def: 0, skills: ['poison_blade', 'quick_stab'] }, // DoT持ち
    { name: '甲羅虫', hp: 80, atk: 6, def: 8, skills: ['harden', 'slash'] }, // バフ持ち

    // 中盤
    { name: 'オーク', hp: 150, atk: 15, def: 5, skills: ['heavy_slam', 'intimidate'] }, // デバフ持ち
    { name: 'アサシン', hp: 100, atk: 20, def: 2, skills: ['quick_stab', 'double_edge', 'poison_blade'] },
    { name: 'パラディン', hp: 180, atk: 12, def: 12, skills: ['slash', 'iron_wall', 'heal'] }, // シールド・回復

    // 終盤
    { name: 'バーサーカー', hp: 250, atk: 25, def: 5, skills: ['berserk', 'double_edge'] }, // 自己バフ高火力
    { name: 'カースメイジ', hp: 200, atk: 18, def: 8, skills: ['ignite', 'intimidate', 'break_armor'] }, // DoT & デバフ
    { name: 'ゴーレム', hp: 400, atk: 30, def: 20, skills: ['heavy_slam', 'iron_wall'] },

    { name: 'キマイラ', hp: 600, atk: 35, def: 15, skills: ['slash', 'poison_blade', 'ignite'] }, // 複合属性アタッカー
    { name: 'デスナイト', hp: 800, atk: 42, def: 25, skills: ['heavy_slam', 'break_armor', 'soul_drain'] }, // 高耐久・吸収持ち
    { name: '古代の機械竜', hp: 1000, atk: 48, def: 35, skills: ['iron_wall', 'quick_stab', 'heavy_slam'] }, // ドラゴンへの前哨戦

    // ボス級
    { name: 'ドラゴン', hp: 1200, atk: 55, def: 25, skills: ['ignite', 'heavy_slam', 'intimidate', 'dragon_breath'] },
    { name: '魔王', hp: 2000, atk: 60, def: 30, skills: ['execute', 'regen', 'void_compression', 'soul_drain'] },

    // --- 超高難易度 / エンドコンテンツ ---
    { name: '時を喰らうもの', hp: 1500, atk: 45, def: 20, skills: ['time_stop', 'quick_stab', 'heavy_slam'] },
    { name: '境界の守護者', hp: 3000, atk: 50, def: 100, skills: ['iron_wall', 'harden', 'time_stop','heal','execute'] }
];
