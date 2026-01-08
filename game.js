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
        tooltip.innerHTML = text;
        tooltip.style.display = 'block';
        if (window.event) {
            const gap = 15;
            let x = window.event.clientX + gap;
            let y = window.event.clientY + gap;
            const rect = tooltip.getBoundingClientRect();
            if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - gap;
            if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - gap;
            tooltip.style.left = Math.max(gap, x) + 'px';
            tooltip.style.top = Math.max(gap, y) + 'px';
        }
    }

    hideTooltip() {
        document.getElementById('tooltip').style.display = 'none';
    }

    startGame() {
        document.getElementById('status-bar').style.display = 'flex';
        this.showWarehouse();
    }

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
        input.min = 0;
        input.onchange = (e) => {
            let newValue = parseInt(e.target.value) || 0;
            if (newValue < 0) newValue = 0;
            e.target.value = newValue;
            callback(newValue);
        };
        group.appendChild(input);
        return group;
    }

    drawInventory() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        this.player.relics.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inventory-item relic';
            div.innerText = item.name;
            div.onmouseover = () => this.showTooltip(this.getRelicDetail(item));
            div.onmouseout = () => this.hideTooltip();
            list.appendChild(div);
        });
        this.player.cursedRelics.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inventory-item curse';
            div.innerText = item.name;
            div.onmouseover = () => this.showTooltip(this.getRelicDetail(item));
            div.onmouseout = () => this.hideTooltip();
            list.appendChild(div);
        });
    }

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
                if (skill.lifesteal) desc += `<br>追加効果: 与えたダメージの${Math.round(skill.lifesteal * 100)}%を回復します。`;
                if (skill.debuff) {
                    const d = skill.debuff;
                    const dAmount = Math.abs(Number(d.amount) || 0);
                    const upDown = d.amount > 0 ? '上昇' : '低下';
                    desc += `<br>追加効果: 敵の${d.stat.toUpperCase()}を${dAmount}${upDown}させます(${(Number(d.duration) || 0) / 1000}秒)。`;
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
                if (power > 0) desc = `${power.toFixed(1)}倍の攻撃を行い、さらに` + desc;
                break;
        }
        if (skill.selfDmg) desc += `<br><span class="stat-down">【代償】最大HPの${Math.round(skill.selfDmg * 100)}%を消費します。</span>`;
        if (skill.selfDebuff) {
            const sd = skill.selfDebuff;
            desc += `<br><span class="stat-down">【反動】自身の${sd.stat.toUpperCase()}が${Math.abs(Math.round(sd.amount * 100))}%低下します。</span>`;
        }
        detail += `<span class="detail">${desc}</span><br>`;
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
            if (item.stats.hp) effects.push(`最大HP+${item.stats.hp}`);
        }
        if (item.statsRaw && item.statsRaw.maxHp) effects.push(`最大HP ${Math.round(item.statsRaw.maxHp * 100)}%`);
        if (item.special) {
            if (item.special.selfDmgTick) effects.push(`毎秒${item.special.selfDmgTick}ダメージ`);
            if (item.special.cdReduc) effects.push(`全CT-${(item.special.cdReduc / 1000).toFixed(1)}s`);
            if (item.special.cdIncrease) effects.push(`全CT+${(item.special.cdIncrease / 1000).toFixed(1)}s`);
            if (item.special.lifesteal) effects.push(`吸血${Math.round(item.special.lifesteal * 100)}%`);
            if (item.special.healingBan) effects.push(`回復無効`);
            if (item.special.randomDelay) effects.push(`発動遅延(最大${(item.special.randomDelay / 1000).toFixed(1)}s)`);
            if (item.special.defZero) effects.push(`防御力強制0`);
            if (item.special.maxHpReduc) effects.push(`開始時HP ${(1 - item.special.maxHpReduc) * 100}%`);
            if (item.special.cheatDeath) effects.push(`死亡回避(1回)`);
        }
        detail += `<span class="detail">${effects.join(' / ')}</span>`;
        return detail;
    }

    getSkillCd(skill, unit) {
        let baseCd = skill.cd + (skill.extraCd || 0);
        unit.relics.concat(unit.cursedRelics).forEach(r => {
            if (r.special && r.special.cdReduc) baseCd -= r.special.cdReduc;
            if (r.special && r.special.cdIncrease) baseCd += r.special.cdIncrease;
        });
        return Math.max(500, baseCd);
    }

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

        // 敵の遺物・呪物をdata.jsの定義から読み込む
        if (enemyData.relics) {
            enemyData.relics.forEach(id => {
                const relic = RELICS.find(r => r.id === id);
                if (relic) {
                    this.enemy.relics.push(JSON.parse(JSON.stringify(relic)));
                    this.applyRelicStats(relic, this.enemy);
                }
            });
        }
        if (enemyData.cursedRelics) {
            enemyData.cursedRelics.forEach(id => {
                const curse = CURSED_RELICS.find(c => c.id === id);
                if (curse) {
                    this.enemy.cursedRelics.push(JSON.parse(JSON.stringify(curse)));
                    this.applyRelicStats(curse, this.enemy);
                }
            });
        }

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
        if (this.enemy.relics.length > 0 || this.enemy.cursedRelics.length > 0) {
            const itemNames = [...this.enemy.relics, ...this.enemy.cursedRelics].map(i => i.name).join('、');
            this.log(`敵は ${itemNames} を装備している！`);
        }
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
        if (elapsedBattleTime > 180000) {
            this.log("時間切れ！ 集中力が底を尽きた...");
            this.player.hp = 0;
            this.battleActive = false;
            this.gameOver();
            return;
        }
        const delta = timestamp - this.lastTimestamp;
        this.statusTicker += delta;
        if (this.statusTicker >= 1000) {
            this.tickStatusEffects(this.player, 1000);
            this.tickStatusEffects(this.enemy, 1000);
            this.statusTicker = 0;
        }
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
                this.log(`${unit.name}は${ef.name}で${dmg}ダメージ！`);
                this.applyDirectDamage(unit, dmg, 'dot');
                const actor = unit === this.player ? this.enemy : this.player;
                const lifesteal = this.checkSpecial(actor, 'lifesteal');
                if (lifesteal && !this.checkSpecial(actor, 'healingBan')) {
                    const healAmt = Math.floor(dmg * lifesteal);
                    if (healAmt > 0) {
                        actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
                        this.showFloatingText(actor === this.player ? 'player-unit' : 'enemy-unit', healAmt, 'heal');
                        this.log(`${actor.name}はDoTの吸血により ${healAmt} 回復！`);
                    }
                }
            } else if (ef.type === 'regen') {
                if (this.checkSpecial(unit, 'healingBan')) return;
                const healAmt = ef.value;
                unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
                this.log(`${unit.name}は${ef.name}で${healAmt}回復！`);
                this.showFloatingText(unit === this.player ? 'player-unit' : 'enemy-unit', healAmt, 'heal');
            } else if (ef.special === 'selfDmgTick') {
                this.log(`${unit.name}は${ef.name}の呪いで${ef.value}ダメージ！`);
                this.applyDirectDamage(unit, ef.value, 'curse');
            }
        });
    }

    updateStatusDurations(unit, delta) {
        unit.statusEffects.forEach(ef => ef.duration -= delta);
        unit.statusEffects = unit.statusEffects.filter(ef => ef.duration > 0 || ef.permanent);
        if (unit.shieldDuration > 0) {
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
                const randomDelay = this.checkSpecial(unit, 'randomDelay');
                if (randomDelay && Math.random() < 0.3) {
                    state.lastUsed += Math.random() * randomDelay;
                    return;
                }
                this.useSkill(side, unit, target, skill);
                state.lastUsed = now;
            }
        });
    }

    useSkill(side, actor, target, skill) {
        let msg = `${actor.name}の${skill.name}！`;
        if (skill.selfDmg) {
            const selfDmg = Math.floor(actor.maxHp * skill.selfDmg);
            actor.hp -= selfDmg;
            this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', selfDmg, 'damage');
            msg += ` 代償に${selfDmg}ダメージ！`;
        }
        if (skill.selfDebuff) this.applyStatus(actor, 'debuff', skill.selfDebuff.stat, skill.selfDebuff.amount, skill.duration, '反動');
        const stats = this.calcCurrentStats(actor);
        const targetStats = this.calcCurrentStats(target);
        switch (skill.type) {
            case 'attack':
                const powerMult = (Number(skill.power) || 0) + (((Number(skill.level) || 1) - 1) * 0.1);
                let damage = Math.max(1, Math.floor((Number(stats.atk) || 0) * powerMult - (Number(targetStats.def) || 0)));
                const lifesteal = (this.checkSpecial(actor, 'lifesteal') || 0) + (skill.lifesteal || 0);
                if (lifesteal > 0) {
                    const heal = Math.floor(damage * lifesteal);
                    if (!this.checkSpecial(actor, 'healingBan') && heal > 0) {
                        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
                        this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', heal, 'heal');
                        this.log(`${actor.name}は攻撃で ${heal} 回復した！`);
                    }
                }
                if (skill.debuff) this.applyStatus(target, 'debuff', skill.debuff.stat, skill.debuff.amount, skill.debuff.duration, skill.name);
                this.applyDamage(target, damage);
                msg += ` ${damage}ダメージ！`;
                break;
            case 'shield':
                const shieldAmt = skill.power + (stats.sup * 2);
                actor.shield = Math.min(actor.maxHp, (actor.shield || 0) + shieldAmt);
                actor.shieldDuration = skill.duration;
                msg += ` シールド${shieldAmt}を展開！`;
                break;
            case 'heal':
                if (this.checkSpecial(actor, 'healingBan')) msg += ` しかし呪いで回復できない！`;
                else {
                    const healAmt = Math.floor(((Number(skill.power) || 0) + stats.sup) * (1 + (Number(skill.level) || 1) * 0.2));
                    actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
                    msg += ` ${healAmt}回復！`;
                    this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', healAmt, 'heal');
                }
                break;
            case 'buff':
                const isRegen = skill.effectType === 'regen';
                this.applyStatus(actor, isRegen ? 'regen' : 'buff', skill.stat, isRegen ? (Number(skill.effectVal) || 0) : (Number(skill.amount) || 0), skill.duration, skill.name, null, !isRegen);
                msg += ` ${skill.stat ? skill.stat.toUpperCase() : '継続回復'}付与！`;
                break;
            case 'debuff':
                if (skill.stat === 'cd') {
                    this.skillStates[side === 'player' ? 'enemy' : 'player'].forEach(state => state.lastUsed += skill.amount);
                    msg += ` 敵の全CTを増加！`;
                } else {
                    this.applyStatus(target, 'debuff', skill.stat, skill.amount, skill.duration, skill.name);
                    msg += ` 敵の${skill.stat.toUpperCase()}低下！`;
                }
                break;
            case 'dot':
                if (skill.power > 0) this.applyDamage(target, Math.max(1, Math.floor((stats.atk * Number(skill.power)) - targetStats.def)));
                this.applyStatus(target, 'dot', null, (Number(skill.effectVal) || 0) + Math.floor(stats.sup * 0.2), skill.duration, skill.name, skill.effectType);
                msg += ` ${skill.effectType === 'poison' ? '毒' : '燃焼'}を与えた！`;
                break;
        }
        this.log(msg);
    }

    applyStatus(target, type, stat, value, duration, name, subType = null, isPercent = false) {
        const existing = target.statusEffects.find(e => e.name === name && e.type === type);
        if (existing) {
            existing.duration = duration;
            existing.value = value;
            existing.isPercent = isPercent;
        } else {
            target.statusEffects.push({ type, stat, value, duration, name, subType, isPercent });
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
            if (el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 200); }
        }
    }

    applyDirectDamage(target, amount, type) {
        target.hp -= amount;
        this.checkDeathPrevention(target);
        this.showFloatingText(target === this.player ? 'player-unit' : 'enemy-unit', amount, 'damage');
        const el = document.getElementById(target === this.player ? 'player-unit' : 'enemy-unit');
        if (el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 200); }
    }

    checkDeathPrevention(unit) {
        if (unit.hp <= 0) {
            const cheatDeath = this.checkSpecial(unit, 'cheatDeath');
            if (cheatDeath) {
                unit.hp = 1;
                this.log(`【身代わりの駒】${unit.name}は踏みとどまった！`);
                if (this.checkSpecial(unit, 'breakOnUse')) {
                    this.log(`身代わりの駒が砕け散り、全ての遺物を失った...`);
                    unit.relics = [];
                    unit.cursedRelics = [];
                    unit.statusEffects = unit.statusEffects.filter(ef => !ef.permanent);
                }
            }
        }
    }

    calcCurrentStats(unit) {
        let atk = unit.atk, def = unit.def, sup = unit.sup;
        unit.relics.concat(unit.cursedRelics).forEach(item => {
            if (item.stats) {
                if (item.stats.atk) atk += item.stats.atk;
                if (item.stats.def) def += item.stats.def;
                if (item.stats.sup) sup += item.stats.sup;
            }
        });
        unit.statusEffects.forEach(ef => {
            if (ef.type === 'buff' || ef.type === 'debuff') {
                if (ef.isPercent) {
                    if (ef.stat === 'atk') atk *= (1 + ef.value);
                    if (ef.stat === 'def') def *= (1 + ef.value);
                    if (ef.stat === 'sup') sup *= (1 + ef.value);
                } else {
                    if (ef.stat === 'atk') atk += ef.value;
                    if (ef.stat === 'def') def += ef.value;
                    if (ef.stat === 'sup') sup += ef.value;
                }
            }
        });
        if (this.checkSpecial(unit, 'defZero')) def = 0;
        return { atk: Math.max(0, Math.floor(atk)), def: Math.max(0, Math.floor(def)), sup: Math.max(0, Math.floor(sup)) };
    }

    checkSpecial(unit, key) {
        let val = null;
        [...unit.relics, ...unit.cursedRelics].forEach(r => { if (r.special && r.special[key] !== undefined) val = r.special[key]; });
        return val;
    }

    updateUI() {
        const stats = this.calcCurrentStats(this.player);
        document.getElementById('floor-display').innerText = this.floor;
        document.getElementById('hp-display').innerText = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
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
        let shieldEl = document.querySelector(`#${side}-unit .shield-bar`);
        if (hpFill) hpFill.style.width = `${hpPercent}%`;
        if (hpText) hpText.innerText = `${Math.ceil(unit.hp)} / ${unit.maxHp}`;
        if (!shieldEl) {
            shieldEl = document.createElement('div');
            shieldEl.className = 'bar-fill shield-bar';
            document.querySelector(`#${side}-unit .bar-container`).appendChild(shieldEl);
        }
        shieldEl.style.width = `${shieldPercent}%`;
        const nameEl = document.querySelector(`#${side}-unit .unit-name`);
        let statusRow = document.querySelector(`#${side}-unit .status-effects-row`);
        if (!statusRow) { statusRow = document.createElement('div'); statusRow.className = 'status-effects-row'; nameEl.after(statusRow); }
        statusRow.innerHTML = '';
        unit.statusEffects.forEach(ef => {
            const badge = document.createElement('span');
            badge.className = `status-badge ${ef.type}`;
            badge.innerText = ef.subType || ef.stat || ef.name;
            statusRow.appendChild(badge);
        });
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
            overlay.style.height = `${(1 - (states[i] ? states[i].progress : 0)) * 100}%`;
        });
    }

    victory() {
        this.log(`${this.enemy.name} を倒した！`);
        const btn = document.getElementById('battle-confirm-btn');
        const controls = document.getElementById('battle-post-controls');
        controls.style.display = 'block';
        btn.innerText = "報酬を受け取る";
        btn.onclick = () => {
            this.player.maxHp += 5;
            this.player.hp = this.player.maxHp;
            this.player.atk += 1;
            this.player.sup += 1;
            this.player.def += 1;
            this.player.statusEffects = this.player.statusEffects.filter(ef => ef.permanent);
            this.player.shield = 0;
            this.player.shieldDuration = 0;
            this.updateUI();
            this.showRewards();
        };
    }

    claimReward(reward) {
        if (reward.type === 'skill') {
            const existing = this.player.skills.find(s => s.id === reward.data.id);
            if (existing) this.showUpgradeModal(existing);
            else {
                if (this.player.skills.length >= 6) { alert("これ以上技を持てません"); return; }
                this.player.skills.push({ ...reward.data, level: 1, extraCd: 0, extraDelay: 0 });
                this.log(`「${reward.data.name}」を習得！`);
                this.finishRewardStep();
            }
        } else {
            const list = reward.type === 'relic' ? this.player.relics : this.player.cursedRelics;
            const newItem = JSON.parse(JSON.stringify(reward.data));
            list.push(newItem);
            this.applyRelicStats(newItem, this.player);
            this.log(`${newItem.name} を入手！`);
            this.finishRewardStep();
        }
    }

    applyRelicStats(item, unit) {
        if (item.special && item.special.selfDmgTick) {
            unit.statusEffects.push({ type: 'curse', special: 'selfDmgTick', value: item.special.selfDmgTick, name: item.name, permanent: true });
        }
        if (item.stats && item.stats.hp) { unit.maxHp += item.stats.hp; unit.hp += item.stats.hp; }
        if (item.statsRaw && item.statsRaw.maxHp) { unit.maxHp = Math.floor(unit.maxHp * item.statsRaw.maxHp); unit.hp = Math.min(unit.hp, unit.maxHp); }
    }

    showUpgradeModal(skill) {
        this.pendingUpgrade = skill;
        const modal = document.getElementById('upgrade-modal');
        const options = document.getElementById('upgrade-options');
        document.getElementById('upgrade-title').innerText = `${skill.name} の強化`;
        options.innerHTML = '';
        const upgrades = [
            {
                name: skill.type === 'shield' ? '耐久強化' : (skill.type === 'heal' ? '回復強化' : '威力強化'),
                desc: (skill.type === 'shield' || skill.type === 'heal' || skill.type === 'dot' || skill.type === 'buff' || skill.type === 'debuff') ? '効果量+20%' : '威力係数+20%',
                action: () => {
                    if (skill.type === 'shield' || skill.type === 'heal') skill.power = Math.floor(Number(skill.power) * 1.2);
                    else if (skill.type === 'dot') { skill.power = Math.round((Number(skill.power) + 0.1) * 10) / 10; if (skill.effectVal) skill.effectVal = Math.floor(skill.effectVal * 1.2); }
                    else if (skill.type === 'buff' || skill.type === 'debuff') { if (skill.amount !== undefined) skill.amount = Math.round((skill.amount + 0.2) * 100) / 100; if (skill.effectVal !== undefined) skill.effectVal = Math.floor(skill.effectVal * 1.2); }
                    else skill.power = Math.round((Number(skill.power) + 0.2) * 10) / 10;
                    skill.level++;
                }
            },
            { name: 'CT短縮', desc: 'CT-10%', action: () => { skill.cd = Math.max(500, Math.floor(skill.cd * 0.9)); skill.level++; } },
        ];
        if (skill.initialDelay && skill.initialDelay > 0) upgrades.push({ name: '初動短縮', desc: '初動遅延-0.1秒', action: () => { skill.initialDelay = Math.max(0, skill.initialDelay - 100); skill.level++; } });
        if (skill.effectVal) upgrades.push({ name: '効果量強化', desc: '効果量+5', action: () => { skill.effectVal += 5; skill.level++; } });
        if (skill.duration) upgrades.push({ name: '効果時間延長', desc: '時間+1秒', action: () => { skill.duration += 1000; skill.level++; } });
        upgrades.forEach(upg => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.innerHTML = `<b>${upg.name}</b><br><span style="font-size:0.8em">${upg.desc}</span>`;
            btn.onclick = () => { upg.action(); modal.style.display = 'none'; this.log(`${skill.name} を強化した！`); this.finishRewardStep(); };
            options.appendChild(btn);
        });
        modal.style.display = 'flex';
    }

    finishRewardStep() { this.floor++; this.showWarehouse(); }

    showRewards() {
        const rewardScreen = document.getElementById('reward-screen');
        const rewardList = document.getElementById('reward-list');
        rewardList.innerHTML = '';

        // 現在の所持品セクション
        const currentAssets = document.createElement('div');
        currentAssets.className = 'current-assets-section';
        currentAssets.style.cssText = 'background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;';
        
        let assetsHTML = '<h4 style="margin:0 0 10px 0; color:var(--accent-color); font-size:0.9em;">現在の所持品</h4>';
        assetsHTML += '<div style="display:flex; flex-direction:column; gap:10px;">';
        assetsHTML += '<div><b style="color:var(--skill-color); font-size:0.8em;">技</b><div class="asset-tags-container" id="curr-skills"></div></div>';
        assetsHTML += '<div style="display:flex; gap:20px;">';
        assetsHTML += '<div style="flex:1;"><b style="color:var(--relic-color); font-size:0.8em;">遺物</b><div class="asset-tags-container" id="curr-relics"></div></div>';
        assetsHTML += '<div style="flex:1;"><b style="color:var(--curse-color); font-size:0.8em;">呪物</b><div class="asset-tags-container" id="curr-curses"></div></div>';
        assetsHTML += '</div></div>';
        currentAssets.innerHTML = assetsHTML;
        rewardList.appendChild(currentAssets);

        const createTag = (text, color, detail) => {
            const span = document.createElement('span');
            span.style.cssText = `font-size:0.75em; background:#222; padding:2px 6px; border-radius:3px; border-left:3px solid ${color}; cursor:help;`;
            span.innerText = text;
            span.onmouseenter = () => this.showTooltip(detail);
            span.onmouseleave = () => this.hideTooltip();
            return span;
        };

        this.player.skills.forEach(s => currentAssets.querySelector('#curr-skills').appendChild(createTag(`${s.name} Lv.${s.level}`, 'var(--skill-color)', this.getSkillDetail(s))));
        this.player.relics.forEach(r => currentAssets.querySelector('#curr-relics').appendChild(createTag(r.name, 'var(--relic-color)', this.getRelicDetail(r))));
        this.player.cursedRelics.forEach(c => currentAssets.querySelector('#curr-curses').appendChild(createTag(c.name, 'var(--curse-color)', this.getRelicDetail(c))));

        // 報酬グリッド
        const grid = document.createElement('div');
        grid.className = 'reward-grid';
        rewardList.appendChild(grid);

        const rewards = [];
        const selectedIds = new Set();
        while (rewards.length < 6) {
            const r = Math.random();
            let reward = null;
            if (r < 0.6) {
                const template = SKILLS[Math.floor(Math.random() * SKILLS.length)];
                if (selectedIds.has(template.id)) continue;
                const existing = this.player.skills.find(s => s.id === template.id);
                if (!existing && this.player.skills.length >= 6) continue;
                reward = { type: 'skill', data: existing ? { ...existing } : { ...template, level: 1 }, isUpgrade: !!existing };
                selectedIds.add(template.id);
            } else if (r < 0.85) {
                const relic = RELICS[Math.floor(Math.random() * RELICS.length)];
                if (selectedIds.has(relic.id)) continue;
                reward = { type: 'relic', data: relic };
                selectedIds.add(relic.id);
            } else {
                const curse = CURSED_RELICS[Math.floor(Math.random() * CURSED_RELICS.length)];
                if (selectedIds.has(curse.id)) continue;
                reward = { type: 'curse', data: curse };
                selectedIds.add(curse.id);
            }
            if (reward) rewards.push(reward);
        }

        rewards.forEach(reward => {
            const item = document.createElement('div');
            item.className = 'reward-item';
            let color = 'var(--skill-color)', label = '技', detail = '';
            if (reward.type === 'relic') { color = 'var(--relic-color)'; label = '遺物'; detail = this.getRelicDetail(reward.data); }
            else if (reward.type === 'curse') { color = 'var(--curse-color)'; label = '呪物'; detail = this.getRelicDetail(reward.data); }
            else { detail = this.getSkillDetail(reward.data); }

            item.innerHTML = `
                <div class="reward-type" style="color:${color}">${label}</div>
                <div class="reward-name">${reward.data.name}${reward.isUpgrade ? ' (+)' : ''}</div>
                <div class="reward-desc-short">${reward.type === 'skill' ? '技の習得・強化' : '能力上昇・特殊効果'}</div>
            `;
            item.onclick = () => { this.hideTooltip(); this.claimReward(reward); };
            item.onmouseenter = () => this.showTooltip(detail);
            item.onmouseleave = () => this.hideTooltip();
            grid.appendChild(item);
        });

        this.showScreen('reward-screen');
    }

    log(msg) {
        const log = document.getElementById('battle-log');
        const div = document.createElement('div');
        div.innerText = msg;
        log.appendChild(div);
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
        ft.style.cssText = `position:fixed; color:${color}; left:${rect.left + rect.width / 2}px; top:${rect.top}px; pointer-events:none; z-index:3000; font-weight:bold; animation: floatUp 1s forwards;`;
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
            screen.innerHTML = `<h1 class="gameover-title">GAME OVER</h1><div class="gameover-stats"><span>到達フロア: <b class="stat-value">${this.floor}</b></span></div><button onclick="location.reload()" class="main-btn">タイトルへ戻る</button>`;
            this.showScreen('gameover-screen');
        };
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }
}

window.onload = () => { window.game = new Game(); };
