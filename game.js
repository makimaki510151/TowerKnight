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
        this.battleStartTime = 0;

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
        if (!tooltip || !text) return;

        // テキストの内容を更新
        tooltip.innerHTML = text;
        tooltip.style.display = 'block';

        // マウスまたはタップの最新座標を取得するイベントリスナーから位置を特定
        const updatePos = (e) => {
            const gap = 15;
            let x = e.clientX + gap;
            let y = e.clientY + gap;

            // ツールチップ自体のサイズを取得
            const rect = tooltip.getBoundingClientRect();

            // 右端からはみ出す場合の補正
            if (x + rect.width > window.innerWidth) {
                x = window.innerWidth - rect.width - gap;
            }

            // 下端からはみ出す場合の補正
            if (y + rect.height > window.innerHeight) {
                y = window.innerHeight - rect.height - gap;
            }

            // 負の値（左端・上端）にならないようガード
            x = Math.max(gap, x);
            y = Math.max(gap, y);

            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        };

        // 呼び出し時の現在のマウス位置に合わせるため、一度だけイベントを模倣するか、
        // mousemove 等のグローバルな位置情報に依存させる必要があります。
        // 最も確実なのは、イベントが発生した瞬間の座標を使うことですが、
        // 既存の呼び出し元を変えない場合は window.event を参照します。
        if (window.event) {
            updatePos(window.event);
        }
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
        input.min = 0; // 属性でマイナス入力を制限
        input.onchange = (e) => {
            // 入力値を数値化し、0未満なら0に固定
            let newValue = parseInt(e.target.value) || 0;
            if (newValue < 0) newValue = 0;
            e.target.value = newValue; // 表示側も0に戻す
            callback(newValue);
        };
        group.appendChild(input);
        return group;
    }

    drawInventory() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';

        // 1. 通常の遺物を描画（紫色）
        this.player.relics.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inventory-item relic'; // 固定で relic
            div.innerText = item.name;
            div.onmouseover = () => this.showTooltip(this.getRelicDetail(item));
            div.onmouseout = () => this.hideTooltip();
            list.appendChild(div);
        });

        // 2. 呪物を描画（赤色）
        this.player.cursedRelics.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inventory-item curse'; // 固定で curse
            div.innerText = item.name;
            div.onmouseover = () => this.showTooltip(this.getRelicDetail(item));
            div.onmouseout = () => this.hideTooltip();
            list.appendChild(div);
        });
    }

    // game.js 内の getSkillDetail メソッドの修正

    getSkillDetail(skill) {
        const totalCd = this.getSkillCd(skill, this.player);
        const totalDelay = (skill.initialDelay || 0) + (skill.extraDelay || 0);

        let detail = `<b>${skill.name}</b> (Lv.${skill.level})<br>`;

        let desc = "";
        const power = Number(skill.power) || 0;
        const effectVal = Number(skill.effectVal) || 0;
        const duration = Number(skill.duration) || 0;
        const amount = Number(skill.amount) || 0;

        switch (skill.type) {
            case 'attack':
                desc = `${power.toFixed(1)}倍の威力で攻撃します。`;
                if (skill.lifesteal) {
                    desc += `<br>追加効果: 与えたダメージの${Math.round(skill.lifesteal * 100)}%を回復します。`;
                }
                if (skill.debuff) {
                    const d = skill.debuff;
                    const dAmount = Math.abs(Number(d.amount) || 0);
                    const amountText = dAmount + (Number.isInteger(dAmount) ? '' : '');
                    const upDown = d.amount > 0 ? '上昇' : '低下';
                    desc += `<br>追加効果: 敵の${d.stat.toUpperCase()}を${amountText}${upDown}させます(${(Number(d.duration) || 0) / 1000}秒)。`;
                }
                break;
            case 'shield':
                desc = `耐久値 ${power} (+支援力×2) のシールドを${duration / 1000}秒間展開します。`;
                break;
            case 'heal':
                desc = `HPを基本値 ${power} 回復します（支援力とLvで増加）。`;
                break;
            case 'buff':
                if (skill.effectType === 'regen') {
                    desc = `${duration / 1000}秒間、一定時間ごとにHPを ${effectVal} (+支援力×0.2) 回復します。`;
                } else {
                    const upDown = amount > 0 ? '上昇' : '低下';
                    desc = `${duration / 1000}秒間、${skill.stat ? skill.stat.toUpperCase() : 'ステータス'}を${Math.abs(Math.round(amount * 100))}%${upDown}させます。`;
                }
                break;
            case 'debuff':
                if (skill.stat === 'cd') {
                    desc = `敵の全スキルのクールダウンを一時的に${amount / 1000}秒増加させます。`;
                } else {
                    desc = `${duration / 1000}秒間、敵の${skill.stat ? skill.stat.toUpperCase() : 'ステータス'}を${Math.abs(Math.round(amount * 100))}%低下させます。`;
                }
                break;
            case 'dot':
                desc = `${duration / 1000}秒間、毎秒 ${effectVal} (+支援力×0.2) の継続ダメージを与えます。`;
                if (power > 0) {
                    desc = `${power.toFixed(1)}倍の攻撃を行い、さらに` + desc;
                }
                break;
        }

        if (skill.selfDmg) desc += `<br><span class="stat-down">【代償】最大HPの${Math.round(skill.selfDmg * 100)}%を消費します。</span>`;
        if (skill.selfDebuff) {
            const sd = skill.selfDebuff;
            const sdAmount = Math.abs(Math.round(sd.amount * 100));
            desc += `<br><span class="stat-down">【反動】自身の${sd.stat.toUpperCase()}が${sdAmount}%低下します。</span>`;
        }

        let specialNotes = "";
        this.player.relics.concat(this.player.cursedRelics).forEach(relic => {
            if (relic.special && relic.special.randomDelay) {
                specialNotes += `<br><span style="color:var(--curse-color)">【${relic.name}】発動時に最大 ${relic.special.randomDelay / 1000}s のランダム遅延が発生。</span>`;
            }
        });

        detail += `<span class="detail">${desc}${specialNotes}</span><br>`;
        detail += `CT: ${(totalCd / 1000).toFixed(1)}s / 初動: ${(totalDelay / 1000).toFixed(1)}s<br>`;

        return detail;
    }

    getRelicDetail(item) {
        let detail = `<b>${item.name}</b><br>`;
        let effects = [];

        if (item.stats) {
            if (item.stats.atk) effects.push(`攻撃力+${item.stats.atk}`);
            if (item.stats.def) effects.push(`防御力+${item.stats.def}`);
            if (item.stats.sup) effects.push(`支援力+${item.stats.sup}`);
            if (item.stats.maxHp) effects.push(`最大HP+${item.stats.maxHp}`);
        }

        if (item.statsRaw) {
            if (item.statsRaw.maxHp) {
                const percent = Math.round(item.statsRaw.maxHp * 100);
                effects.push(`最大HP ${percent}%`);
            }
        }

        if (item.special) {
            if (item.special.selfDmgTick) effects.push(`毎秒${item.special.selfDmgTick}ダメージ`);
            if (item.special.cdReduc) effects.push(`全CT-${(item.special.cdReduc / 1000).toFixed(1)}s`);
            if (item.special.cdIncrease) effects.push(`全CT+${(item.special.cdIncrease / 1000).toFixed(1)}s`);
            if (item.special.lifesteal) effects.push(`吸血${Math.round(item.special.lifesteal * 100)}%`);
            if (item.special.healingBan) effects.push(`回復無効`);
            if (item.special.randomDelay) effects.push(`発動遅延(最大${(item.special.randomDelay / 1000).toFixed(1)}s)`);
            if (item.special.defZero) effects.push(`防御力強制0`);
            if (item.special.maxHpReduc) effects.push(`開始時HP-${Math.round(item.special.maxHpReduc * 100)}%`);
            if (item.special.cheatDeath) effects.push(`死亡回避(1回)`);
            if (item.special.breakOnUse) effects.push(`発動時全遺物消滅`);
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
        this.battleStartTime = performance.now();

        document.getElementById('battle-log').innerHTML = '';
        document.getElementById('battle-post-controls').style.display = 'none';

        const enemyData = ENEMIES[Math.min(ENEMIES.length - 1, Math.floor((this.floor - 1) / 2))];
        const scale = 1 + (this.floor - 1) * 0.08;

        const enemySkills = enemyData.skills.map(id => {
            const base = SKILLS.find(s => s.id === id);
            return base ? { ...base, level: 1, extraCd: 0, extraDelay: 0 } : { id: id, name: id, type: 'attack', power: 1.0, cd: 3000, level: 1 };
        });

        this.enemy = this.createUnit(enemyData.name,
            Math.floor(enemyData.hp * scale),
            Math.floor(enemyData.atk * scale),
            Math.floor((enemyData.sup || 5) * scale),
            Math.floor(enemyData.def * scale),
            enemySkills
        );

        // 特殊効果：永劫の飢餓 (maxHpReduc)
        const maxHpReduc = this.checkSpecial(this.player, 'maxHpReduc');
        if (maxHpReduc) {
            this.player.hp = Math.floor(this.player.maxHp * (1 - maxHpReduc));
            this.log(`【永劫の飢餓】空腹状態で戦闘開始...`);
        } else {
            this.player.hp = this.player.maxHp;
        }

        this.player.shield = 0;
        this.player.statusEffects = this.player.statusEffects.filter(ef => ef.permanent);
        this.initSkillStates();

        const enemySkillContainer = document.getElementById('enemy-skills');
        if (enemySkillContainer) enemySkillContainer.innerHTML = '';

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

        const elapsedBattleTime = timestamp - this.battleStartTime;
        if (elapsedBattleTime > 180000) { // 3分 = 180,000ms
            this.log("時間切れ！ 集中力が底を尽きた...");
            this.player.hp = 0; // プレイヤーのHPを0にして敗北へ
            this.battleActive = false;
            this.gameOver();
            return;
        }

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
        unit.statusEffects.forEach(ef => {
            if (ef.type === 'dot') {
                const dmg = Math.max(1, ef.value);
                // ログ出力を追加
                this.log(`${unit.name}は${ef.name}で${dmg}ダメージ！`);
                this.applyDirectDamage(unit, dmg, 'dot');
            } else if (ef.type === 'regen') {
                if (this.checkSpecial(unit, 'healingBan')) return;

                const healAmt = ef.value;
                unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
                // ログ出力を追加
                this.log(`${unit.name}は${ef.name}で${healAmt}回復！`);
                this.showFloatingText(unit === this.player ? 'player-unit' : 'enemy-unit', healAmt, 'heal');
            } else if (ef.special === 'selfDmgTick') {
                // 呪物による自傷ダメージのログ
                this.log(`${unit.name}は${ef.name}の呪いで${ef.value}ダメージ！`);
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

    // game.js の useSkill メソッドを以下のように修正します

    useSkill(side, actor, target, skill) {
        let msg = `${actor.name}の${skill.name}！`;

        // 1. 自傷ダメージ等のコスト処理
        if (skill.selfDmg) {
            const selfDmg = Math.floor(actor.maxHp * skill.selfDmg);
            actor.hp -= selfDmg;
            this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', selfDmg, 'damage');
            msg += ` 代償に${selfDmg}ダメージ！`;
        }
        if (skill.selfDebuff) {
            this.applyStatus(actor, 'debuff', skill.selfDebuff.stat, skill.selfDebuff.amount, skill.duration, '反動');
        }

        // 2. 遺物・バフ・デバフ込みの現在ステータスを算出
        const stats = this.calcCurrentStats(actor);
        const targetStats = this.calcCurrentStats(target);

        switch (skill.type) {
            case 'attack':
                const basePower = Number(skill.power) || 0;
                const currentLevel = Number(skill.level) || 1;
                const powerMult = basePower + ((currentLevel - 1) * 0.1);

                // ステータスが正常に取得できているか確認しつつ計算
                let rawDmg = (Number(stats.atk) || 0) * powerMult;
                let targetDef = Number(targetStats.def) || 0;
                let damage = Math.max(1, Math.floor(rawDmg - targetDef));

                // もし damage が NaN になった場合の最終ガード
                if (isNaN(damage)) damage = 1;

                const lifesteal = this.checkSpecial(actor, 'lifesteal');
                if (lifesteal) {
                    const heal = Math.floor(damage * lifesteal);
                    if (!this.checkSpecial(actor, 'healingBan')) {
                        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
                        this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', heal, 'heal');
                    }
                }

                if (skill.debuff) {
                    this.applyStatus(target, 'debuff', skill.debuff.stat, skill.debuff.amount, skill.debuff.duration, skill.name);
                }

                this.applyDamage(target, damage);
                msg += ` ${damage}ダメージ！`;
                break;

            case 'shield':
                // 修正：actor.sup ではなく stats.sup (遺物補正込) を使用
                const shieldAmt = skill.power + (stats.sup * 2);
                actor.shield = (actor.shield || 0) + shieldAmt;
                actor.shieldDuration = skill.duration;
                msg += ` シールド${shieldAmt}を展開！`;
                break;

            case 'heal':
                if (this.checkSpecial(actor, 'healingBan')) {
                    msg += ` しかし呪いで回復できない！`;
                } else {
                    // 修正：powerとlevelを確実に数値として計算
                    const basePower = Number(skill.power) || 0;
                    const levelBonus = (Number(skill.level) || 1) * 0.2;
                    const healAmt = Math.floor((basePower + stats.sup) * (1 + levelBonus));

                    actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
                    msg += ` ${healAmt}回復！`;
                    this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', healAmt, 'heal');
                }
                break;

            case 'buff':
                const isRegen = skill.effectType === 'regen';
                const statName = skill.stat ? skill.stat.toUpperCase() : '継続回復';
                const effectValue = isRegen ? (Number(skill.effectVal) || 0) : (Number(skill.amount) || 0);

                this.applyStatus(
                    actor,
                    isRegen ? 'regen' : 'buff',
                    skill.stat,
                    effectValue,
                    skill.duration,
                    skill.name,
                    null, // subType
                    !isRegen // buffかつregenでないなら倍率として扱うフラグ
                );
                msg += ` ${statName}付与！`;
                break;

            case 'debuff':
                if (skill.stat === 'cd') {
                    // 敵の全スキルのlastUsedを減らすことで、実質的にCTを増加させる
                    const targetStates = this.skillStates[side === 'player' ? 'enemy' : 'player'];
                    targetStates.forEach(state => {
                        state.lastUsed -= skill.amount;
                    });
                    msg += ` 敵の全CTを増加！`;
                } else {
                    this.applyStatus(target, 'debuff', skill.stat, skill.amount, skill.duration, skill.name);
                    msg += ` 敵の${skill.stat.toUpperCase()}低下！`;
                }
                break;

            case 'dot':
                if (skill.power > 0) {
                    let d = Math.max(1, Math.floor((stats.atk * Number(skill.power)) - targetStats.def));
                    this.applyDamage(target, d);
                }
                // 修正：effectValを数値にキャスト
                const dotBase = Number(skill.effectVal) || 0;
                this.applyStatus(target, 'dot', null, dotBase + Math.floor(stats.sup * 0.2), skill.duration, skill.name, skill.effectType);
                msg += ` ${skill.effectType === 'poison' ? '毒' : '燃焼'}を与えた！`;
                break;
        }

        this.log(msg);
    }

    // ステータス適用の汎用関数
    applyStatus(target, type, stat, value, duration, name, subType = null, isPercent = false) {
        const existing = target.statusEffects.find(e => e.name === name && e.type === type);
        if (existing) {
            existing.duration = duration;
            existing.value = value;
            existing.isPercent = isPercent; // 追加
        } else {
            target.statusEffects.push({
                type, stat, value, duration, name, subType, isPercent // 追加
            });
        }
    }

    applyDamage(target, amount) {
        let remaining = amount;
        if (target.shield > 0) {
            if (target.shield >= remaining) {
                target.shield -= remaining;
                remaining = 0;
                this.showFloatingText(target === this.player ? 'player-unit' : 'enemy-unit', 'Block', 'heal');
            } else {
                remaining -= target.shield;
                target.shield = 0;
            }
        }

        if (remaining > 0) {
            target.hp -= remaining;
            this.checkDeathPrevention(target);
            this.showFloatingText(target === this.player ? 'player-unit' : 'enemy-unit', remaining, 'damage');
            const el = document.getElementById(target === this.player ? 'player-unit' : 'enemy-unit');
            if (el) {
                el.classList.add('shake');
                setTimeout(() => el.classList.remove('shake'), 200);
            }
        }
    }

    applyDirectDamage(target, amount, type) {
        target.hp -= amount;
        this.checkDeathPrevention(target);
        this.showFloatingText(target === this.player ? 'player-unit' : 'enemy-unit', amount, 'damage');
        const el = document.getElementById(target === this.player ? 'player-unit' : 'enemy-unit');
        if (el) {
            el.classList.add('shake');
            setTimeout(() => el.classList.remove('shake'), 200);
        }
    }

    checkDeathPrevention(unit) {
        if (unit.hp <= 0) {
            const cheatDeath = this.checkSpecial(unit, 'cheatDeath');
            if (cheatDeath) {
                unit.hp = 1;
                this.log(`【身代わりの駒】${unit.name}は踏みとどまった！`);

                // 遺物消滅処理
                if (this.checkSpecial(unit, 'breakOnUse')) {
                    this.log(`身代わりの駒が砕け散り、全ての遺物を失った...`);
                    unit.relics = [];
                    unit.cursedRelics = [];
                    // 永続ステータス効果（自傷ダメージ等）もクリア
                    unit.statusEffects = unit.statusEffects.filter(ef => !ef.permanent);
                }
            }
        }
    }

    // 現在のバフ・デバフ込みステータスを計算
    calcCurrentStats(unit) {
        let atk = unit.atk;
        let def = unit.def;
        let sup = unit.sup;

        unit.relics.concat(unit.cursedRelics).forEach(item => {
            if (item.stats) {
                if (item.stats.atk) atk += item.stats.atk;
                if (item.stats.def) def += item.stats.def;
                if (item.stats.sup) sup += item.stats.sup;
            }
        });

        unit.statusEffects.forEach(ef => {
            if (ef.type === 'buff' || ef.type === 'debuff') {
                let mod = ef.value;
                if (ef.isPercent) {
                    if (ef.stat === 'atk') atk *= (1 + mod);
                    if (ef.stat === 'def') def *= (1 + mod);
                    if (ef.stat === 'sup') sup *= (1 + mod);
                } else {
                    if (ef.stat === 'atk') atk += mod;
                    if (ef.stat === 'def') def += mod;
                    if (ef.stat === 'sup') sup += mod;
                }
            }
        });

        // 特殊効果：狂戦士の魂 (defZero)
        if (this.checkSpecial(unit, 'defZero')) {
            def = 0;
        }

        return {
            atk: Math.max(0, Math.floor(atk)),
            def: Math.max(0, Math.floor(def)),
            sup: Math.max(0, Math.floor(sup))
        };
    }

    applyStatMod(base, val) {
        const numericBase = Number(base) || 0;
        const numericVal = Number(val) || 0;

        // 小数の場合は倍率、整数の場合は固定値加算
        if (Math.abs(numericVal) < 2 && numericVal !== 0) {
            return numericBase * (1 + numericVal);
        }
        return numericBase + numericVal;
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

        const btn = document.getElementById('battle-confirm-btn');
        const controls = document.getElementById('battle-post-controls');

        controls.style.display = 'block';
        btn.innerText = "報酬を受け取る";
        btn.onclick = () => {
            // ステータスのリセット
            this.player.maxHp += 5;
            this.player.hp = this.player.maxHp;
            this.player.atk += 1;
            this.player.sup += 1;
            this.player.def += 1;

            // 一時的な状態異常とシールドのリセット
            this.player.statusEffects = this.player.statusEffects.filter(ef => ef.permanent);
            this.player.shield = 0;
            this.player.shieldDuration = 0;

            // 表示を即座に更新する
            this.updateUI();

            this.showRewards();
        };
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
        // 呪いの特殊効果（毎秒ダメージなど）の予約登録のみ残す
        if (item.special && item.special.selfDmgTick) {
            this.player.statusEffects.push({
                type: 'curse',
                special: 'selfDmgTick',
                value: item.special.selfDmgTick,
                name: item.name,
                permanent: true
            });
        }

        // 最大HPの割合変化（硝子の大砲など）がある場合は、基礎最大HPを調整
        if (item.statsRaw && item.statsRaw.maxHp) {
            this.player.maxHp = Math.floor(this.player.maxHp * item.statsRaw.maxHp);
            this.player.hp = Math.min(this.player.hp, this.player.maxHp);
        }
    }

    showUpgradeModal(skill) {
        this.pendingUpgrade = skill;
        const modal = document.getElementById('upgrade-modal');
        const options = document.getElementById('upgrade-options');
        document.getElementById('upgrade-title').innerText = `${skill.name} の強化`;
        options.innerHTML = '';

        const upgrades = [
            {
                name: '威力強化',
                desc: '威力係数+20%',
                action: () => {
                    skill.power = Math.round((Number(skill.power) + 0.2) * 10) / 10;
                    skill.level++;
                }
            },
            {
                name: 'CT短縮',
                desc: 'CT-10%',
                action: () => {
                    skill.cd = Math.max(500, Math.floor(skill.cd * 0.9));
                    skill.level++;
                }
            },
        ];

        // 初動遅延短縮（0より大きい場合のみ追加）
        if (skill.initialDelay && skill.initialDelay > 0) {
            upgrades.push({
                name: '初動短縮',
                desc: '初動遅延-0.1秒',
                action: () => {
                    skill.initialDelay = Math.max(0, skill.initialDelay - 100);
                    skill.level++;
                }
            });
        }

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

        // 追加：現在のプレイヤーの技の数を確認
        const currentSkillCount = this.player.skills.length;
        const isSkillLimit = currentSkillCount >= 6;

        // 報酬スロットが6個埋まるまでループ
        while (rewards.length < 6) {
            const r = Math.random();
            let reward = null;

            if (r < 0.6) {
                // スキル：全SKILLSから抽選
                const skillTemplate = SKILLS[Math.floor(Math.random() * SKILLS.length)];
                if (selectedRewardIds.has(skillTemplate.id)) continue;

                const existing = this.player.skills.find(s => s.id === skillTemplate.id);

                // 修正：既に持っているスキルの「強化」は出現させるが、
                // 上限に達している場合は「未習得のスキル」をスキップする
                if (!existing && isSkillLimit) continue;

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
            let typeLabel = '技';
            if (reward.type === 'relic') {
                color = 'var(--relic-color)';
                typeLabel = '遺物';
            }
            if (reward.type === 'curse') {
                color = 'var(--curse-color)';
                typeLabel = '呪物';
            }

            // 詳細テキストの取得
            let detail = '';
            if (reward.type === 'skill') {
                // スキルデータには必ずtypeが含まれるため、toUpperCaseのエラーを防げる
                detail = this.getSkillDetail(reward.data);
            } else {
                // 遺物・呪物の場合（data.jsのdescを表示し、statsがあれば付記する）
                detail = reward.data.desc || '';
                if (reward.data.stats) {
                    const statsInfo = Object.entries(reward.data.stats)
                        .map(([k, v]) => `${k.toUpperCase()}+${v}`)
                        .join(', ');
                    detail += ` (${statsInfo})`;
                }
            }

            div.innerHTML = `
                <div class="reward-info">
                    <div class="reward-type" style="color: ${color}">${typeLabel}</div>
                    <div class="reward-name">${reward.data.name} ${reward.isUpgrade ? '(強化)' : ''}</div>
                    <div class="reward-description">${detail}</div>
                </div>
            `;

            div.onclick = () => {
                this.hideTooltip();
                this.claimReward(reward);
            };

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
        log.appendChild(div); // appendに変更

        // 最新のログが見えるように末尾へスクロール
        log.scrollTop = log.scrollHeight;

        if (log.children.length > 100) log.firstChild.remove();
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
        this.log(`あなたは力尽きた...`);

        const btn = document.getElementById('battle-confirm-btn');
        const controls = document.getElementById('battle-post-controls');

        controls.style.display = 'block';
        btn.innerText = "リザルトを確認";
        btn.onclick = () => {
            const screen = document.getElementById('gameover-screen');
            screen.innerHTML = `
                <h1 class="gameover-title">GAME OVER</h1>
                <div class="gameover-stats">
                    <span>到達フロア: <b class="stat-value">${this.floor}</b></span>
                </div>
                <button onclick="location.reload()" class="main-btn">タイトルへ戻る</button>
            `;
            this.showScreen('gameover-screen');
        };
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }
}

window.onload = () => {
    window.game = new Game();
};