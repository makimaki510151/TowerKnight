/**
 * ==========================================
 * GAME ENGINE (Enhanced Mechanics)
 * ==========================================
 */

class Game {
    constructor() {
        this.floor = 1;
        this.player = this.createUnit('Player', 100, 10, 5, 5, [SKILLS[0]]);
        this.enemy = null;
        this.battleActive = false;
        this.lastTimestamp = 0;
        this.skillStates = { player: [], enemy: [] };
        this.pendingUpgrade = null;
        this.statusTicker = 0; // 1秒ごとの処理用

        this.initTooltip();
    }

    createUnit(name, hp, atk, sup, def, skills) {
        return {
            name, maxHp: hp, hp: hp,
            atk, sup, def,
            baseAtk: atk, baseSup: sup, baseDef: def, // バフ計算用ベース値
            skills: skills.map(s => ({ ...s, level: 1, extraCd: 0, extraDelay: 0 })),
            relics: [], cursedRelics: [],
            shield: 0,
            statusEffects: [] // { type: 'buff'|'debuff'|'dot'|'regen', id, name, val, duration, ... }
        };
    }

    initTooltip() {
        const tooltip = document.getElementById('tooltip');
        document.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'block') {
                // 画面端の考慮（簡易）
                let left = e.clientX + 15;
                if (left + 280 > window.innerWidth) left = e.clientX - 295;
                tooltip.style.left = left + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });
    }

    showTooltip(text) {
        const tooltip = document.getElementById('tooltip');
        tooltip.innerHTML = text;
        tooltip.style.display = 'block';
    }

    hideTooltip() {
        document.getElementById('tooltip').style.display = 'none';
    }

    startGame() {
        document.getElementById('status-bar').style.display = 'flex';
        this.showWarehouse();
    }

    // --- Warehouse / Timeline / Inventory (前回と同じだがData反映) ---
    showWarehouse() {
        this.updateUI();
        this.drawTimeline();
        this.drawInventory();
        this.showScreen('strategy-screen');
    }

    drawTimeline() {
        const container = document.getElementById('skill-timeline');
        const header = document.getElementById('timeline-header');
        container.innerHTML = '';
        header.innerHTML = '';
        const maxTime = 12000;

        // Header construction
        const labelSpacer = document.createElement('div');
        labelSpacer.style.width = '100px'; labelSpacer.style.flexShrink = '0';
        header.appendChild(labelSpacer);
        const headerTrack = document.createElement('div');
        headerTrack.style.flex = '1'; headerTrack.style.position = 'relative'; headerTrack.style.height = '100%';
        header.appendChild(headerTrack);
        for (let i = 0; i <= 12; i++) {
            const span = document.createElement('span');
            span.innerText = `${i}s`;
            span.style.position = 'absolute';
            span.style.left = `${(i * 1000 / maxTime) * 100}%`;
            span.style.transform = 'translateX(-50%)';
            headerTrack.appendChild(span);
        }

        this.player.skills.forEach((skill) => {
            const row = document.createElement('div');
            row.className = 'timeline-row';

            const top = document.createElement('div');
            top.className = 'timeline-row-top';
            const label = document.createElement('div');
            label.className = 'timeline-label';
            label.innerText = skill.name;
            label.onmouseenter = () => this.showTooltip(this.getSkillDetail(skill));
            label.onmouseleave = () => this.hideTooltip();

            const track = document.createElement('div');
            track.className = 'timeline-track';

            const totalCd = this.getSkillCd(skill, this.player);
            const totalDelay = (skill.initialDelay || 0) + (skill.extraDelay || 0);

            let currentTime = totalDelay;
            while (currentTime < maxTime) {
                const bar = document.createElement('div');
                bar.className = 'timeline-bar';
                bar.style.width = `2px`;
                bar.style.left = `${(currentTime / maxTime) * 100}%`;
                // タイプ別に色を変える
                if (skill.type === 'shield') bar.style.backgroundColor = 'var(--shield-color)';
                if (skill.type === 'buff') bar.style.backgroundColor = 'var(--buff-color)';
                if (skill.type === 'debuff') bar.style.backgroundColor = 'var(--debuff-color)';
                track.appendChild(bar);
                currentTime += totalCd;
            }

            for (let i = 1; i < 12; i++) {
                const marker = document.createElement('div');
                marker.className = 'timeline-marker';
                marker.style.left = `${(i * 1000 / maxTime) * 100}%`;
                track.appendChild(marker);
            }

            top.appendChild(label);
            top.appendChild(track);

            // Controls
            const controls = document.createElement('div');
            controls.className = 'timeline-controls';
            const ctGroup = this.createControlGroup('CT追加', skill.extraCd, v => { skill.extraCd = v; this.drawTimeline(); });
            const delayGroup = this.createControlGroup('初動追加', skill.extraDelay, v => { skill.extraDelay = v; this.drawTimeline(); });
            controls.append(ctGroup, delayGroup);

            row.appendChild(top);
            row.appendChild(controls);
            container.appendChild(row);
        });
    }

    createControlGroup(label, val, callback) {
        const group = document.createElement('div');
        group.className = 'control-group';
        group.innerHTML = `<span>${label}:</span>`;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = val || 0;
        input.step = 100;
        input.onchange = (e) => callback(parseInt(e.target.value) || 0);
        group.appendChild(input);
        return group;
    }

    drawInventory() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        const allRelics = [...this.player.relics, ...this.player.cursedRelics];

        allRelics.forEach(item => {
            const div = document.createElement('div');
            div.className = `inventory-item ${item.special ? 'curse-item' : 'relic-item'}`;
            div.innerText = item.name[0]; // 頭文字を表示

            div.onmouseover = (e) => {
                // ここを item.desc から this.getRelicDetail(item) に変更
                this.showTooltip(e, this.getRelicDetail(item));
            };
            div.onmouseout = () => this.hideTooltip();
            list.appendChild(div);
        });
    }

    getSkillDetail(skill) {
        const totalCd = this.getSkillCd(skill, this.player);
        const totalDelay = (skill.initialDelay || 0) + (skill.extraDelay || 0);

        let detail = `<b>${skill.name}</b> (Lv.${skill.level})<br>`;

        // 動的な定型文生成
        let desc = "";
        switch (skill.type) {
            case 'attack':
                desc = `${skill.power}倍の威力で攻撃します。`;
                if (skill.debuff) desc += `命中時、敵の${skill.debuff.stat.toUpperCase()}を${Math.abs(skill.debuff.amount)}${Math.isInteger(skill.debuff.amount) ? '' : '%'}${skill.debuff.amount > 0 ? '上昇' : '低下'}させます。`;
                break;
            case 'shield':
                desc = `${skill.power}の耐久値を持つシールドを展開します。`;
                break;
            case 'heal':
                desc = `HPを${skill.power}回復します（支援力で増加）。`;
                break;
            case 'buff':
                desc = `${skill.duration / 1000}秒間、${skill.stat.toUpperCase()}を${skill.amount * 100}%上昇させます。`;
                break;
            case 'debuff':
                desc = `${skill.duration / 1000}秒間、敵の${skill.stat.toUpperCase()}を${Math.abs(skill.amount * 100)}%低下させます。`;
                break;
            case 'dot':
                desc = `${skill.duration / 1000}秒間、毎秒${skill.effectVal}の継続ダメージを与えます。`;
                break;
        }

        if (skill.selfDmg) desc += `<br><span class="stat-down">【代償】最大HPの${skill.selfDmg * 100}%を消費します。</span>`;
        if (skill.selfDebuff) desc += `<br><span class="stat-down">【反動】自身の${skill.selfDebuff.stat.toUpperCase()}が低下します。</span>`;

        detail += `<span class="detail">${desc}</span><br>`;
        detail += `CT: ${(totalCd / 1000).toFixed(1)}s / 初動: ${(totalDelay / 1000).toFixed(1)}s<br>`;

        return detail;
    }

    getRelicDetail(item) {
        let detail = `<b>${item.name}</b><br>`;
        let effects = [];

        // ステータス補正の数値化
        if (item.stats) {
            if (item.stats.atk) effects.push(`攻撃力+${item.stats.atk}`);
            if (item.stats.def) effects.push(`防御力+${item.stats.def}`);
            if (item.stats.sup) effects.push(`支援力+${item.stats.sup}`);
            if (item.stats.maxHp) effects.push(`最大HP+${item.stats.maxHp}`);
        }

        // 特殊効果の数値化
        if (item.special) {
            if (item.special.selfDmgTick) effects.push(`毎秒${item.special.selfDmgTick}ダメージ`);
            if (item.special.cdReduc) effects.push(`全CT-${(item.special.cdReduc / 1000).toFixed(1)}s`);
            if (item.special.cdIncrease) effects.push(`全CT+${(item.special.cdIncrease / 1000).toFixed(1)}s`);
            if (item.special.lifesteal) effects.push(`吸血${item.special.lifesteal * 100}%`);
            if (item.special.healingBan) effects.push(`回復無効`);
        }

        detail += `<span class="detail">${effects.join(' / ')}</span>`;
        return detail;
    }

    getSkillCd(skill, unit) {
        let baseCd = skill.cd + (skill.extraCd || 0);
        // 遺物によるCD補正
        unit.relics.concat(unit.cursedRelics).forEach(r => {
            if (r.special && r.special.cdReduc) baseCd -= r.special.cdReduc;
            if (r.special && r.special.cdIncrease) baseCd += r.special.cdIncrease;
        });
        return Math.max(500, baseCd); // 最低0.5秒
    }

    // --- Battle Logic ---

    startFloor() {
        this.battleActive = true;
        // 敵の生成
        const enemyData = ENEMIES[Math.min(ENEMIES.length - 1, Math.floor((this.floor - 1) / 2))]; // 2階ごとに種類変化
        const scale = 1 + (this.floor - 1) * 0.08;

        // 敵スキルデータを参照解決
        const enemySkills = enemyData.skills.map(id => {
            const base = SKILLS.find(s => s.id === id);
            return base ? { ...base, level: 1 } : SKILLS[0];
        });

        this.enemy = this.createUnit(enemyData.name,
            Math.floor(enemyData.hp * scale),
            Math.floor(enemyData.atk * scale),
            Math.floor((enemyData.sup || 5) * scale),
            Math.floor(enemyData.def * scale),
            enemySkills
        );

        // プレイヤー状態リセット（HPは引き継ぎ、シールド・状態異常はリセット）
        this.player.shield = 0;
        this.player.statusEffects = [];
        this.player.relics.concat(this.player.cursedRelics).forEach(r => {
            if (r.special && r.special.randomDelay) {/*戦闘開始時処理あれば*/ }
        });

        this.initSkillStates();
        this.log(`Floor ${this.floor}: ${this.enemy.name} が現れた！`);
        this.showScreen('battle-screen');

        this.lastTimestamp = 0;
        requestAnimationFrame(this.battleLoop.bind(this));
    }

    initSkillStates() {
        const now = performance.now();
        const initUnitState = (unit) => unit.skills.map(s => {
            const totalCd = this.getSkillCd(s, unit);
            const totalDelay = (s.initialDelay || 0) + (s.extraDelay || 0);
            return { lastUsed: now + totalDelay - totalCd, progress: 0 };
        });
        this.skillStates.player = initUnitState(this.player);
        this.skillStates.enemy = initUnitState(this.enemy);
    }

    battleLoop(timestamp) {
        if (!this.battleActive) return;
        if (!this.lastTimestamp) this.lastTimestamp = timestamp;

        const delta = timestamp - this.lastTimestamp;

        // 状態異常の更新（1秒ごとにTick処理）
        this.statusTicker += delta;
        if (this.statusTicker >= 1000) {
            this.tickStatusEffects(this.player, 1000);
            this.tickStatusEffects(this.enemy, 1000);
            this.statusTicker = 0;
        }

        // 有効期限切れのエフェクト削除
        this.updateStatusDurations(this.player, delta);
        this.updateStatusDurations(this.enemy, delta);

        this.updateSkills('player', timestamp);
        this.updateSkills('enemy', timestamp);

        this.updateUI();

        this.lastTimestamp = timestamp;

        if (this.player.hp <= 0) {
            this.battleActive = false;
            this.gameOver();
        } else if (this.enemy.hp <= 0) {
            this.battleActive = false;
            this.victory();
        } else {
            requestAnimationFrame(this.battleLoop.bind(this));
        }
    }

    tickStatusEffects(unit, time) {
        // DoT / Regen の処理
        unit.statusEffects.forEach(ef => {
            if (ef.type === 'dot') {
                const dmg = Math.max(1, ef.value); // 固定値 or 計算値
                this.applyDirectDamage(unit, dmg, 'dot');
            } else if (ef.type === 'regen') {
                // 呪物「血の契約」などの回復禁止チェック
                if (this.checkSpecial(unit, 'healingBan')) return;
                unit.hp = Math.min(unit.maxHp, unit.hp + ef.value);
                this.showFloatingText(unit === this.player ? 'player-unit' : 'enemy-unit', ef.value, 'heal');
            } else if (ef.special === 'selfDmgTick') {
                this.applyDirectDamage(unit, ef.value, 'curse');
            }
        });
    }

    updateStatusDurations(unit, delta) {
        unit.statusEffects.forEach(ef => ef.duration -= delta);
        unit.statusEffects = unit.statusEffects.filter(ef => ef.duration > 0 || ef.permanent);

        // シールド自然減衰（オプション：今回は時間経過で消滅するスキル仕様に任せるため、特別な減衰はなし。ただしduration管理はここ）
        if (unit.shield > 0 && unit.shieldDuration && unit.shieldDuration > 0) {
            unit.shieldDuration -= delta;
            if (unit.shieldDuration <= 0) unit.shield = 0;
        }
    }

    updateSkills(side, now) {
        const unit = side === 'player' ? this.player : this.enemy;
        const target = side === 'player' ? this.enemy : this.player;
        const states = this.skillStates[side];

        unit.skills.forEach((skill, i) => {
            const state = states[i];
            const totalCd = this.getSkillCd(skill, unit);
            const elapsed = now - state.lastUsed;
            state.progress = Math.min(1, elapsed / totalCd);

            if (elapsed >= totalCd) {
                // 呪物ランダム遅延
                const randomDelay = this.checkSpecial(unit, 'randomDelay');
                if (randomDelay && Math.random() < 0.3) {
                    // 30%で遅延発生
                    state.lastUsed += Math.random() * randomDelay;
                    return;
                }

                this.useSkill(side, unit, target, skill);
                state.lastUsed = now;
            }
        });
    }

    // --- Core Action Logic ---

    useSkill(side, actor, target, skill) {
        let msg = `${actor.name}の${skill.name}！`;

        // 1. 自傷ダメージ等のコスト処理
        if (skill.selfDmg) {
            const selfDmg = Math.floor(actor.maxHp * skill.selfDmg);
            actor.hp -= selfDmg;
            this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', selfDmg, 'damage');
            msg += ` 代償に${selfDmg}dmg！`;
        }
        if (skill.selfDebuff) {
            this.applyStatus(actor, 'debuff', skill.selfDebuff.stat, skill.selfDebuff.amount, skill.duration, '反動');
        }

        // 2. スキルタイプ別処理
        const stats = this.calcCurrentStats(actor); // バフ込みステータス
        const targetStats = this.calcCurrentStats(target);

        switch (skill.type) {
            case 'attack':
                const powerMult = skill.power + ((skill.level - 1) * 0.1);
                // 攻撃力計算: (Atk * SkillPower) - (TargetDef)
                let rawDmg = (stats.atk * powerMult);
                let damage = Math.max(1, Math.floor(rawDmg - targetStats.def));

                // ライフスティール
                const lifesteal = this.checkSpecial(actor, 'lifesteal');
                if (lifesteal) {
                    const heal = Math.floor(damage * lifesteal);
                    if (!this.checkSpecial(actor, 'healingBan')) {
                        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
                        this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', heal, 'heal');
                    }
                }

                // 攻撃付随デバフ
                if (skill.debuff) {
                    this.applyStatus(target, 'debuff', skill.debuff.stat, skill.debuff.amount, skill.debuff.duration, skill.name);
                }

                this.applyDamage(target, damage);
                msg += ` ${damage}ダメージ！`;
                break;

            case 'shield':
                const shieldAmt = skill.power + (stats.sup * 2); // 支援力も影響
                actor.shield = (actor.shield || 0) + shieldAmt;
                actor.shieldDuration = skill.duration; // シールド効果時間更新
                msg += ` シールド${shieldAmt}を展開！`;
                break;

            case 'heal':
                if (this.checkSpecial(actor, 'healingBan')) {
                    msg += ` しかし呪いで回復できない！`;
                } else {
                    const healAmt = Math.floor((skill.power + stats.sup) * (1 + (skill.level * 0.2)));
                    actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
                    msg += ` ${healAmt}回復！`;
                    this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', healAmt, 'heal');
                }
                break;

            case 'buff':
                this.applyStatus(actor, 'buff', skill.stat, skill.amount, skill.duration, skill.name);
                msg += ` ${skill.stat.toUpperCase()}上昇！`;
                break;

            case 'debuff':
                this.applyStatus(target, 'debuff', skill.stat, skill.amount, skill.duration, skill.name);
                msg += ` 敵の${skill.stat.toUpperCase()}低下！`;
                break;

            case 'dot':
                // 初撃ダメージ
                if (skill.power > 0) {
                    let d = Math.max(1, Math.floor((stats.atk * skill.power) - targetStats.def));
                    this.applyDamage(target, d);
                }
                // 状態異常付与
                this.applyStatus(target, 'dot', null, skill.effectVal + Math.floor(stats.sup * 0.2), skill.duration, skill.name, skill.effectType);
                msg += ` ${skill.effectType === 'poison' ? '毒' : '燃焼'}を与えた！`;
                break;
        }

        this.log(msg);
    }

    // ステータス適用の汎用関数
    applyStatus(target, type, stat, value, duration, name, subType = null) {
        // 重複チェック（同名スキル効果は更新）
        const existing = target.statusEffects.find(e => e.name === name && e.type === type);
        if (existing) {
            existing.duration = duration;
            existing.value = value;
        } else {
            target.statusEffects.push({
                type, stat, value, duration, name, subType
            });
        }
    }

    applyDamage(target, amount) {
        // シールドで肩代わり
        let remaining = amount;
        if (target.shield > 0) {
            if (target.shield >= remaining) {
                target.shield -= remaining;
                remaining = 0;
                this.showFloatingText(target === this.player ? 'player-unit' : 'enemy-unit', 'Block', 'heal'); // 青文字代用
            } else {
                remaining -= target.shield;
                target.shield = 0;
            }
        }

        if (remaining > 0) {
            target.hp -= remaining;
            this.showFloatingText(target === this.player ? 'player-unit' : 'enemy-unit', remaining, 'damage');
            const el = document.getElementById(target === this.player ? 'player-unit' : 'enemy-unit');
            if (el) {
                el.classList.add('shake');
                setTimeout(() => el.classList.remove('shake'), 200);
            }
        }
    }

    applyDirectDamage(target, amount, type) {
        // シールド無視などの特殊ダメージ用
        target.hp -= amount;
        this.showFloatingText(target === this.player ? 'player-unit' : 'enemy-unit', amount, 'damage');
    }

    // 現在のバフ・デバフ込みステータスを計算
    calcCurrentStats(unit) {
        let atk = unit.atk;
        let def = unit.def;
        let sup = unit.sup;

        unit.statusEffects.forEach(ef => {
            if (ef.type === 'buff') {
                if (ef.stat === 'atk') atk = this.applyStatMod(atk, ef.value);
                if (ef.stat === 'def') def = this.applyStatMod(def, ef.value);
                if (ef.stat === 'sup') sup = this.applyStatMod(sup, ef.value);
            } else if (ef.type === 'debuff') {
                if (ef.stat === 'atk') atk = this.applyStatMod(atk, ef.value); // 負の値が入ってくる想定、またはここで引く
                if (ef.stat === 'def') def = this.applyStatMod(def, ef.value);
                if (ef.stat === 'sup') sup = this.applyStatMod(sup, ef.value);
            }
        });
        return { atk: Math.max(0, Math.floor(atk)), def: Math.max(0, Math.floor(def)), sup: Math.max(0, Math.floor(sup)) };
    }

    applyStatMod(base, val) {
        // valが小数の場合は倍率(0.5 = +50%, -0.3 = -30%)、整数の場合は固定値加算とみなす簡易ロジック
        if (Math.abs(val) < 5 && !Number.isInteger(val)) {
            return base * (1 + val);
        }
        return base + val;
    }

    checkSpecial(unit, key) {
        // 遺物・呪物の特殊効果チェック
        let val = null;
        [...unit.relics, ...unit.cursedRelics].forEach(r => {
            if (r.special && r.special[key] !== undefined) val = r.special[key];
        });
        return val;
    }

    // --- UI Update & Utility ---

    updateUI() {
        const stats = this.calcCurrentStats(this.player);
        document.getElementById('floor-display').innerText = this.floor;
        document.getElementById('hp-display').innerText = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
        // ステータス表示（バフ込みの色変えたいが今回は数値のみ）
        document.getElementById('atk-display').innerText = stats.atk;
        document.getElementById('sup-display').innerText = stats.sup;
        document.getElementById('def-display').innerText = stats.def;

        this.updateUnitUI('player', this.player);
        if (this.enemy) {
            this.updateUnitUI('enemy', this.enemy);
            document.getElementById('enemy-name').innerText = this.enemy.name;
        }
    }

    updateUnitUI(side, unit) {
        const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
        const shieldPercent = Math.min(100, ((unit.shield || 0) / unit.maxHp) * 100);

        const hpFill = document.getElementById(`${side}-hp-fill`);
        const hpText = document.getElementById(`${side}-hp-text`);
        const shieldBar = document.querySelector(`#${side}-unit .shield-bar`);

        if (hpFill) hpFill.style.width = `${hpPercent}%`;
        if (hpText) hpText.innerText = `${Math.ceil(unit.hp)} / ${unit.maxHp}`;

        // シールドバーの制御（動的生成）
        let shieldEl = shieldBar;
        if (!shieldEl) {
            const container = document.querySelector(`#${side}-unit .bar-container`);
            shieldEl = document.createElement('div');
            shieldEl.className = 'bar-fill shield-bar';
            container.appendChild(shieldEl);
        }
        shieldEl.style.width = `${shieldPercent}%`;

        // バフ・デバフ表示
        const nameEl = document.querySelector(`#${side}-unit .unit-name`);
        let statusRow = document.querySelector(`#${side}-unit .status-effects-row`);
        if (!statusRow) {
            statusRow = document.createElement('div');
            statusRow.className = 'status-effects-row';
            nameEl.after(statusRow);
        }
        statusRow.innerHTML = '';
        unit.statusEffects.forEach(ef => {
            const badge = document.createElement('span');
            badge.className = `status-badge ${ef.type}`;
            badge.innerText = ef.subType || ef.stat || ef.name;
            statusRow.appendChild(badge);
        });

        // スキルCT表示
        const skillContainer = document.getElementById(`${side}-skills`);
        const states = this.skillStates[side];

        if (skillContainer.children.length !== unit.skills.length) {
            skillContainer.innerHTML = '';
            unit.skills.forEach((s, i) => {
                const div = document.createElement('div');
                div.className = 'skill-icon';
                div.innerHTML = `<span>${s.name}</span><div class="skill-cooldown-overlay"></div>`;
                div.onmouseenter = () => this.showTooltip(this.getSkillDetail(s));
                div.onmouseleave = () => this.hideTooltip();
                skillContainer.appendChild(div);
            });
        }

        unit.skills.forEach((s, i) => {
            const overlay = skillContainer.children[i].querySelector('.skill-cooldown-overlay');
            const totalCd = this.getSkillCd(s, unit);
            const progress = states[i] ? states[i].progress : 0;
            overlay.style.height = `${(1 - progress) * 100}%`;
        });
    }

    // --- Reward Logic (Revised for Trade-offs) ---

    victory() {
        this.log(`${this.enemy.name} を倒した！`);
        this.player.maxHp += 5;
        this.player.hp = this.player.maxHp;
        // 基礎ステータス微増
        this.player.atk += 1;
        this.player.sup += 1;
        this.player.def += 1;
        setTimeout(() => this.showRewards(), 1000);
    }

    generateRandomReward() {
        const r = Math.random();
        // スキル(60%), 遺物(25%), 呪物(15%)
        if (r < 0.6) {
            const skillTemplate = SKILLS[Math.floor(Math.random() * SKILLS.length)];
            const existing = this.player.skills.find(s => s.id === skillTemplate.id);
            const skillData = existing ? { ...existing } : { ...skillTemplate, level: 1 };
            return { type: 'skill', data: skillData, isUpgrade: !!existing };
        } else if (r < 0.85) {
            return { type: 'relic', data: RELICS[Math.floor(Math.random() * RELICS.length)] };
        } else {
            return { type: 'curse', data: CURSED_RELICS[Math.floor(Math.random() * CURSED_RELICS.length)] };
        }
    }

    claimReward(reward) {
        if (reward.type === 'skill') {
            const existing = this.player.skills.find(s => s.id === reward.data.id);
            if (existing) {
                this.showUpgradeModal(existing);
            } else {
                if (this.player.skills.length >= 6) {
                    alert("これ以上技を持てません（未実装：入れ替え機能）"); // 簡易措置
                    return;
                }
                this.player.skills.push({ ...reward.data, level: 1, extraCd: 0, extraDelay: 0 });
                this.log(`「${reward.data.name}」を習得！`);
                this.finishRewardStep();
            }
        } else {
            const list = reward.type === 'relic' ? this.player.relics : this.player.cursedRelics;
            // ユニーク所持制限なしだが、今回は重複OKとする
            const newItem = JSON.parse(JSON.stringify(reward.data));
            list.push(newItem);

            // 呪物等の即時ステータス反映
            this.applyRelicStats(newItem);
            this.log(`${newItem.name} を入手！`);
            this.finishRewardStep();
        }
    }

    applyRelicStats(item) {
        if (item.stats) {
            if (item.stats.atk) this.player.atk += item.stats.atk;
            if (item.stats.def) this.player.def += item.stats.def;
            if (item.stats.sup) this.player.sup += item.stats.sup;
            if (item.stats.maxHp) {
                this.player.maxHp += item.stats.maxHp;
                this.player.hp += item.stats.maxHp;
            }
        }

        // 呪いの特殊効果（毎秒ダメージなど）を状態異常として予約登録
        if (item.special && item.special.selfDmgTick) {
            this.player.statusEffects.push({
                type: 'curse',
                special: 'selfDmgTick',
                value: item.special.selfDmgTick,
                name: item.name,
                permanent: true // 戦闘中永続
            });
        }

        if (item.statsRaw && item.statsRaw.maxHp) {
            const newMax = Math.floor(this.player.maxHp * item.statsRaw.maxHp);
            this.player.maxHp = newMax;
            this.player.hp = Math.min(this.player.hp, newMax);
        }
    }

    showUpgradeModal(skill) {
        this.pendingUpgrade = skill;
        const modal = document.getElementById('upgrade-modal');
        const options = document.getElementById('upgrade-options');
        document.getElementById('upgrade-title').innerText = `${skill.name} の強化`;
        options.innerHTML = '';

        const upgrades = [
            { name: '威力強化', desc: '威力係数+20%', action: () => { skill.power += 0.2; skill.level++; } },
            { name: 'CT短縮', desc: 'CT-10%', action: () => { skill.cd = Math.max(500, skill.cd * 0.9); skill.level++; } },
        ];

        // シールドやバフなら効果量アップなども
        if (skill.effectVal) upgrades.push({ name: '効果量強化', desc: '効果量+5', action: () => { skill.effectVal += 5; skill.level++; } });
        if (skill.duration) upgrades.push({ name: '効果時間延長', desc: '時間+1秒', action: () => { skill.duration += 1000; skill.level++; } });

        upgrades.forEach(upg => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.innerHTML = `<b>${upg.name}</b><br><span style="font-size:0.8em">${upg.desc}</span>`;
            btn.onclick = () => {
                upg.action();
                modal.style.display = 'none';
                this.log(`${skill.name} を強化した！`);
                this.finishRewardStep();
            };
            options.appendChild(btn);
        });
        modal.style.display = 'flex';
    }

    finishRewardStep() {
        this.floor++;
        this.showWarehouse();
    }

    // showRewards, gameover, helper functions... (previous code remains same mostly)
    showRewards() {
        const rewardList = document.getElementById('reward-list');
        rewardList.innerHTML = '';
        const rewards = [];

        // 出現制限と重複管理用
        let relicCount = 0;
        let curseCount = 0;
        const selectedRewardIds = new Set();

        // 報酬スロットが6個埋まるまでループ
        while (rewards.length < 6) {
            const r = Math.random();
            let reward = null;

            if (r < 0.6) {
                // スキル：全SKILLSから抽選
                const skillTemplate = SKILLS[Math.floor(Math.random() * SKILLS.length)];
                if (selectedRewardIds.has(skillTemplate.id)) continue;

                const existing = this.player.skills.find(s => s.id === skillTemplate.id);
                reward = {
                    type: 'skill',
                    data: existing ? { ...existing } : { ...skillTemplate, level: 1 },
                    isUpgrade: !!existing
                };
                selectedRewardIds.add(skillTemplate.id);
            } else if (r < 0.85) {
                // 遺物：最大1つまで
                if (relicCount >= 1) continue;
                const relicData = RELICS[Math.floor(Math.random() * RELICS.length)];
                if (selectedRewardIds.has(relicData.id)) continue;

                reward = { type: 'relic', data: relicData };
                selectedRewardIds.add(relicData.id);
                relicCount++;
            } else {
                // 呪物：最大1つまで
                if (curseCount >= 1) continue;
                const curseData = CURSED_RELICS[Math.floor(Math.random() * CURSED_RELICS.length)];
                if (selectedRewardIds.has(curseData.id)) continue;

                reward = { type: 'curse', data: curseData };
                selectedRewardIds.add(curseData.id);
                curseCount++;
            }

            if (reward) rewards.push(reward);
        }

        rewards.forEach(reward => {
            const div = document.createElement('div');
            div.className = 'reward-item';

            let color = 'var(--skill-color)';
            if (reward.type === 'relic') color = 'var(--relic-color)';
            if (reward.type === 'curse') color = 'var(--curse-color)';

            const detail = reward.type === 'skill' ?
                this.getSkillDetail(reward.data) :
                this.getRelicDetail(reward.data);

            div.innerHTML = `
                <div class="reward-info">
                    <div class="reward-type" style="color: ${color}">${reward.type.toUpperCase()}</div>
                    <div class="reward-name">${reward.data.name} ${reward.isUpgrade ? '(強化)' : ''}</div>
                    <div class="reward-description">${detail}</div>
                </div>
            `;

            div.onclick = () => {
                this.hideTooltip();
                this.claimReward(reward);
            };

            // ツールチップ表示用（既存の仕組みを維持）
            div.onmouseenter = () => this.showTooltip(detail);
            div.onmouseleave = () => this.hideTooltip();

            rewardList.appendChild(div);
        });
        this.showScreen('reward-screen');
    }

    log(msg) {
        const log = document.getElementById('battle-log');
        const div = document.createElement('div');
        div.innerText = msg;
        log.prepend(div);
        if (log.children.length > 50) log.lastChild.remove();
    }

    showFloatingText(targetId, text, type) {
        const target = document.getElementById(targetId);
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const ft = document.createElement('div');
        ft.className = 'floating-text';
        ft.innerText = (type === 'heal' ? '+' : '') + text;

        let color = '#fff';
        if (type === 'heal') color = 'var(--skill-color)';
        if (type === 'damage') color = 'var(--hp-color)';
        if (type === 'curse') color = 'var(--curse-color)';

        ft.style.color = color;
        ft.style.left = `${rect.left + rect.width / 2 + (Math.random() * 40 - 20)}px`;
        ft.style.top = `${rect.top + 20}px`;
        document.body.appendChild(ft);
        setTimeout(() => ft.remove(), 1000);
    }

    gameOver() {
        const screen = document.getElementById('gameover-screen');
        screen.innerHTML = `
            <h1 class="gameover-title">GAME OVER</h1>
            <div class="gameover-stats">
                <span>到達フロア: <b class="stat-value">${this.floor}</b></span>
            </div>
            <button onclick="location.reload()" class="main-btn">タイトルへ戻る</button>
        `;
        this.showScreen('gameover-screen');
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }
}

window.onload = () => {
    window.game = new Game();
};