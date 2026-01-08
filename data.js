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
    { id: 'harden', name: '硬化', type: 'buff', stat: 'def', amount: 10, duration: 4000, cd: 8000, initialDelay: 500, desc: '一時的に防御力を固定値で上昇させる。' },
    { id: 'intimidate', name: '威圧', type: 'debuff', stat: 'atk', amount: -0.3, duration: 4000, cd: 9000, initialDelay: 1000, desc: '敵の攻撃力を30%下げる。' },
    { id: 'break_armor', name: '鎧砕き', type: 'attack', power: 0.8, debuff: { stat: 'def', amount: -5, duration: 5000 }, cd: 5000, initialDelay: 800, desc: '攻撃しつつ、敵の防御力を下げる。' },

    // --- 回復系 (Heal) ---
    { id: 'heal', name: '応急手当', type: 'heal', power: 20, cd: 5000, initialDelay: 1000, desc: 'HPを中程度回復する。' },
    { id: 'regen', name: '再生', type: 'buff', effectType: 'regen', effectVal: 5, duration: 8000, cd: 12000, initialDelay: 0, desc: '8秒間、徐々にHPを回復する。' }
];

const RELICS = [
    { id: 'warrior_ring', name: '戦士の指輪', stats: { atk: 3, def: 1 }, desc: '攻撃と防御がわずかに上昇。デメリットなし。' },
    { id: 'light_feather', name: '軽い羽根', stats: { def: -2 }, special: { cdReduc: 100 }, desc: '防御が下がるが、全スキルのCTが0.1秒短縮。' },
    { id: 'heavy_gauntlet', name: '重い手甲', stats: { atk: 5, def: 5 }, special: { cdIncrease: 200 }, desc: '攻防が上昇するが、技が重くなる(CT+0.2秒)。' },
    { id: 'vampire_tooth', name: '吸血の牙', stats: { maxHp: -10 }, special: { lifesteal: 0.1 }, desc: '最大HPが減るが、与ダメージの10%を回復。' },
    { id: 'scholar_glasses', name: '学者の眼鏡', stats: { sup: 8, atk: -2 }, desc: '支援力が大きく上がるが、物理攻撃力は下がる。' },
    { id: 'turtle_shell', name: '亀の甲羅', stats: { def: 8, atk: -3 }, desc: '防御特化。攻撃性能は落ちる。' }
];

const CURSED_RELICS = [
    { id: 'demon_muscle', name: '鬼神の筋肉', stats: { atk: 20 }, special: { selfDmgTick: 2 }, desc: '攻撃力が劇的に上昇するが、毎秒2ダメージ受ける。' },
    { id: 'glass_cannon', name: '硝子の大砲', stats: { atk: 30 }, statsRaw: { maxHp: 0.5 }, desc: '攻撃力が極大化するが、最大HPが半分になる（適用時）。' },
    { id: 'cursed_clock', name: '狂った時計', special: { cdReduc: 500, randomDelay: 1000 }, desc: 'CTが0.5秒短縮されるが、発動時にランダムで最大1秒遅延する。' },
    { id: 'blood_pact', name: '血の契約', stats: { sup: 30 }, special: { healingBan: true }, desc: '支援力が圧倒的になるが、通常回復が無効化される(DoT等は受ける)。' },
    { id: 'sloth_statue', name: '怠惰の像', stats: { def: 20, maxHp: 50 }, special: { cdIncrease: 1000 }, desc: '耐久力が跳ね上がるが、行動速度が著しく低下する。' }
];

const ENEMIES = [
    // 序盤
    { name: 'スライム', hp: 60, atk: 8, def: 2, skills: ['slash'] },
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

    // ボス級
    { name: 'ドラゴン', hp: 600, atk: 40, def: 15, skills: ['ignite', 'heavy_slam', 'intimidate'] },
    { name: '魔王', hp: 800, atk: 35, def: 10, skills: ['execute', 'regen', 'shield_curse'] } // shield_curseは仮
];