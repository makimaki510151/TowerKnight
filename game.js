/**
 * ==========================================
 * GAME ENGINE
 * ==========================================
 */

class Game {
    constructor() {
        this.floor = 1;
        this.player = {
            name: 'Player',
            maxHp: 100,
            hp: 100,
            atk: 10,
            sup: 5, // 新ステータス：支援
            def: 5,
            skills: [ { ...SKILLS[0], level: 1, extraCd: 0, extraDelay: 0 } ],
            relics: [],
            cursedRelics: []
        };
        this.enemy = null;
        this.battleActive = false;
        this.lastTimestamp = 0;
        this.skillStates = { player: [], enemy: [] };
        this.pendingUpgrade = null;

        this.initTooltip();
    }

    initTooltip() {
        const tooltip = document.getElementById('tooltip');
        document.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'block') {
                tooltip.style.left = (e.clientX + 15) + 'px';
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
        
        const maxTime = 10000; // 10秒に拡大

        // Header markers
        for (let i = 0; i <= 10; i++) {
            const span = document.createElement('span');
            span.innerText = `${i}s`;
            header.appendChild(span);
        }

        this.player.skills.forEach((skill, index) => {
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

            const totalCd = (skill.cd || 0) + (skill.extraCd || 0);
            const totalDelay = (skill.initialDelay || 0) + (skill.extraDelay || 0);
            
            let currentTime = totalDelay;
            while (currentTime < maxTime) {
                const bar = document.createElement('div');
                bar.className = 'timeline-bar';
                // バーを細く、角ばらせる
                bar.style.width = `2px`; 
                const left = (currentTime / maxTime) * 100;
                bar.style.left = `${left}%`;
                track.appendChild(bar);
                currentTime += totalCd;
            }

            // 1秒ごとのマーカー
            for (let i = 1; i < 10; i++) {
                const marker = document.createElement('div');
                marker.className = 'timeline-marker';
                marker.style.left = `${(i * 1000 / maxTime) * 100}%`;
                track.appendChild(marker);
            }

            top.appendChild(label);
            top.appendChild(track);

            const controls = document.createElement('div');
            controls.className = 'timeline-controls';
            
            const ctGroup = document.createElement('div');
            ctGroup.className = 'control-group';
            ctGroup.innerHTML = `<span>CT追加:</span>`;
            const ctInput = document.createElement('input');
            ctInput.type = 'number';
            ctInput.value = skill.extraCd || 0;
            ctInput.onchange = (e) => {
                skill.extraCd = parseInt(e.target.value) || 0;
                this.drawTimeline();
            };
            ctGroup.appendChild(ctInput);

            const delayGroup = document.createElement('div');
            delayGroup.className = 'control-group';
            delayGroup.innerHTML = `<span>初動追加:</span>`;
            const delayInput = document.createElement('input');
            delayInput.type = 'number';
            delayInput.value = skill.extraDelay || 0;
            delayInput.onchange = (e) => {
                skill.extraDelay = parseInt(e.target.value) || 0;
                this.drawTimeline();
            };
            delayGroup.appendChild(delayInput);

            controls.appendChild(ctGroup);
            controls.appendChild(delayGroup);
            
            row.appendChild(top);
            row.appendChild(controls);
            container.appendChild(row);
        });
    }

    drawInventory() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        
        const allItems = [
            ...this.player.relics.map(r => ({ ...r, type: 'relic' })),
            ...this.player.cursedRelics.map(c => ({ ...c, type: 'curse' }))
        ];

        if (allItems.length === 0) {
            list.innerHTML = '<div style="color:#666; font-size:0.8em; text-align:center; margin-top:20px;">所持品なし</div>';
            return;
        }

        allItems.forEach(item => {
            const div = document.createElement('div');
            div.className = `inventory-item ${item.type}`;
            div.innerHTML = `
                <div style="font-weight:bold">${item.name}</div>
                <div style="font-size:0.9em; color:#aaa">${item.desc}</div>
            `;
            list.appendChild(div);
        });
    }

    getSkillDetail(skill) {
        const powerMult = (skill.power || 0) + ((skill.level || 1) - 1) * 0.2;
        const totalCd = (skill.cd || 0) + (skill.extraCd || 0);
        const totalDelay = (skill.initialDelay || 0) + (skill.extraDelay || 0);
        
        let statRef = "攻撃";
        if (skill.type === 'heal') statRef = "支援";
        if (skill.type === 'buff') statRef = "支援";

        return `
            <b>${skill.name}</b> (Lv.${skill.level})<br>
            タイプ: ${skill.type === 'attack' ? '攻撃' : skill.type === 'heal' ? '回復' : '支援'}<br>
            参照ステータス: <span class="stat-ref">${statRef}</span><br>
            威力係数: ${powerMult.toFixed(1)}x<br>
            CT: ${totalCd}ms<br>
            初動: ${totalDelay}ms<br>
            <i>${skill.desc}</i>
        `;
    }

    startFloor() {
        this.battleActive = true;
        const enemyData = ENEMIES[Math.min(ENEMIES.length - 1, Math.floor((this.floor - 1) / 2))];
        const scale = 1 + (this.floor - 1) * 0.2;
        
        this.enemy = {
            name: enemyData.name,
            maxHp: Math.floor(enemyData.hp * scale),
            hp: Math.floor(enemyData.hp * scale),
            atk: Math.floor(enemyData.atk * scale),
            sup: Math.floor((enemyData.sup || 5) * scale),
            def: Math.floor(enemyData.def * scale),
            skills: enemyData.skills.map(id => ({ ...SKILLS.find(s => s.id === id), level: 1, extraCd: 0, extraDelay: 0 }))
        };

        this.player.hp = this.player.maxHp;
        this.initSkillStates();
        this.log(`Floor ${this.floor}: ${this.enemy.name} が現れた！`);
        this.showScreen('battle-screen');
        
        this.lastTimestamp = 0;
        requestAnimationFrame(this.battleLoop.bind(this));
    }

    initSkillStates() {
        const now = performance.now();
        this.skillStates.player = this.player.skills.map(s => {
            const totalCd = (s.cd || 0) + (s.extraCd || 0);
            const totalDelay = (s.initialDelay || 0) + (s.extraDelay || 0);
            return { lastUsed: now + totalDelay - totalCd, progress: 0 };
        });
        this.skillStates.enemy = this.enemy.skills.map(s => ({
            lastUsed: now + (s.initialDelay || 0) - s.cd,
            progress: 0
        }));
    }

    battleLoop(timestamp) {
        if (!this.battleActive) return;
        if (!this.lastTimestamp) this.lastTimestamp = timestamp;

        this.updateSkills('player', timestamp);
        this.updateSkills('enemy', timestamp);

        this.updateUI();

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

    updateSkills(side, now) {
        const unit = side === 'player' ? this.player : this.enemy;
        const target = side === 'player' ? this.enemy : this.player;
        const states = this.skillStates[side];

        unit.skills.forEach((skill, i) => {
            const state = states[i];
            const totalCd = (skill.cd || 0) + (skill.extraCd || 0);
            const elapsed = now - state.lastUsed;
            state.progress = Math.min(1, elapsed / totalCd);

            if (elapsed >= totalCd) {
                this.useSkill(side, unit, target, skill);
                state.lastUsed = now;
            }
        });
    }

    useSkill(side, actor, target, skill) {
        let msg = `${actor.name === 'Player' ? 'プレイヤー' : actor.name}の「${skill.name}」！ `;
        
        if (skill.type === 'attack') {
            const powerMult = (skill.power || 0) + ((skill.level || 1) - 1) * 0.2;
            let damage = Math.max(1, Math.floor(actor.atk * powerMult - target.def));
            target.hp -= damage;
            msg += `${target.name === 'Player' ? 'プレイヤー' : target.name}に ${damage} のダメージ！`;
            this.showFloatingText(side === 'player' ? 'enemy-unit' : 'player-unit', damage, 'damage');
            const targetEl = document.getElementById(side === 'player' ? 'enemy-unit' : 'player-unit');
            if (targetEl) {
                targetEl.classList.add('shake');
                setTimeout(() => targetEl.classList.remove('shake'), 200);
            }
        } else if (skill.type === 'heal') {
            const powerMult = (skill.power || 0) * (1 + ((skill.level || 1) - 1) * 0.5);
            const healAmt = Math.floor(actor.sup * (powerMult / 10)); // 支援ステータスを参照
            actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
            msg += `${healAmt} 回復した！`;
            this.showFloatingText(side === 'player' ? 'player-unit' : 'enemy-unit', healAmt, 'heal');
        } else if (skill.type === 'buff') {
            msg += `${skill.stat}が上昇した！`;
        }

        this.log(msg);
    }

    victory() {
        this.log(`${this.enemy.name} を倒した！`);
        this.player.maxHp += 5;
        this.player.atk += 2;
        this.player.sup += 1; // 支援も上昇
        this.player.def += 1;
        setTimeout(() => this.showRewards(), 1000);
    }

    showRewards() {
        const rewardList = document.getElementById('reward-list');
        rewardList.innerHTML = '';
        const rewards = [];
        const usedIds = new Set();

        while (rewards.length < 5) {
            const reward = this.generateRandomReward();
            const uniqueId = `${reward.type}_${reward.data.id}`;
            if (!usedIds.has(uniqueId)) {
                usedIds.add(uniqueId);
                rewards.push(reward);
            }
        }
        
        rewards.forEach(reward => {
            const div = document.createElement('div');
            div.className = 'reward-item';
            let typeLabel = reward.type.toUpperCase();
            let color = 'var(--skill-color)';
            if (reward.type === 'relic') color = 'var(--relic-color)';
            if (reward.type === 'curse') color = 'var(--curse-color)';

            div.innerHTML = `
                <div class="reward-info">
                    <div class="reward-type" style="color: ${color}">${typeLabel}</div>
                    <div style="font-weight: bold">${reward.data.name} ${reward.isUpgrade ? '(強化)' : ''}</div>
                    <div style="font-size: 0.8em; color: #aaa">${reward.data.desc || ''}</div>
                </div>
            `;
            div.onmouseenter = () => { if (reward.type === 'skill') this.showTooltip(this.getSkillDetail(reward.data)); };
            div.onmouseleave = () => this.hideTooltip();
            div.onclick = () => { this.hideTooltip(); this.claimReward(reward); };
            rewardList.appendChild(div);
        });
        this.showScreen('reward-screen');
    }

    generateRandomReward() {
        const r = Math.random();
        if (r < 0.75) {
            const skillTemplate = SKILLS[Math.floor(Math.random() * SKILLS.length)];
            const existing = this.player.skills.find(s => s.id === skillTemplate.id);
            const skillData = existing ? { ...existing } : { ...skillTemplate, level: 1 };
            return { type: 'skill', data: skillData, isUpgrade: !!existing };
        } else if (r < 0.9) {
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
                this.player.skills.push({ ...reward.data, level: 1, extraCd: 0, extraDelay: 0 });
                this.log(`新しい技「${reward.data.name}」を習得した！`);
                this.finishRewardStep();
            }
        } else {
            const list = reward.type === 'relic' ? this.player.relics : this.player.cursedRelics;
            const existing = list.find(r => r.id === reward.data.id);
            if (existing) {
                for (let key in existing.stats) existing.stats[key] = Math.floor(existing.stats[key] * 1.5);
                this.log(`${existing.name} を強化した！`);
            } else {
                const newRelic = JSON.parse(JSON.stringify(reward.data));
                list.push(newRelic);
                this.log(`${newRelic.name} を手に入れた！`);
            }
            this.applyRelicStats();
            this.finishRewardStep();
        }
    }

    showUpgradeModal(skill) {
        this.pendingUpgrade = skill;
        const modal = document.getElementById('upgrade-modal');
        const options = document.getElementById('upgrade-options');
        document.getElementById('upgrade-title').innerText = `${skill.name} の強化`;
        options.innerHTML = '';

        const upgrades = [
            { name: '威力アップ', action: () => { skill.power = (skill.power || SKILLS.find(s=>s.id===skill.id).power) * 1.2; skill.level++; } },
            { name: 'CT短縮', action: () => { skill.cd = Math.max(500, skill.cd * 0.8); skill.level++; } },
            { name: '初動短縮', action: () => { skill.initialDelay = Math.max(0, skill.initialDelay - 200); skill.level++; } }
        ];

        upgrades.forEach(upg => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.innerText = upg.name;
            btn.onclick = () => {
                upg.action();
                modal.style.display = 'none';
                this.log(`${skill.name} の ${upg.name} を選択した！`);
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

    applyRelicStats() {
        const lastRelic = [...this.player.relics, ...this.player.cursedRelics].slice(-1)[0];
        if (lastRelic && lastRelic.stats) {
            if (lastRelic.stats.atk) this.player.atk += lastRelic.stats.atk;
            if (lastRelic.stats.sup) this.player.sup += lastRelic.stats.sup;
            if (lastRelic.stats.def) this.player.def += lastRelic.stats.def;
            if (lastRelic.stats.maxHp) {
                this.player.maxHp += lastRelic.stats.maxHp;
                this.player.hp = Math.max(1, this.player.hp + lastRelic.stats.maxHp);
            }
        }
    }

    gameOver() {
        const screen = document.getElementById('gameover-screen');
        screen.innerHTML = `
            <h1 class="gameover-title">GAME OVER</h1>
            <div class="gameover-stats">
                <span>到達フロア: <b class="stat-value">${this.floor}</b></span>
                <span>習得した技: <b class="stat-value">${this.player.skills.length}</b></span>
                <span>獲得した遺物: <b class="stat-value">${this.player.relics.length + this.player.cursedRelics.length}</b></span>
            </div>
            <button onclick="location.reload()" class="main-btn">タイトルへ戻る</button>
        `;
        this.showScreen('gameover-screen');
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    updateUI() {
        document.getElementById('floor-display').innerText = this.floor;
        document.getElementById('hp-display').innerText = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
        document.getElementById('atk-display').innerText = this.player.atk;
        document.getElementById('sup-display').innerText = this.player.sup;
        document.getElementById('def-display').innerText = this.player.def;

        this.updateUnitUI('player', this.player);
        if (this.enemy) {
            this.updateUnitUI('enemy', this.enemy);
            document.getElementById('enemy-name').innerText = this.enemy.name;
        }
    }

    updateUnitUI(side, unit) {
        const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
        const hpFill = document.getElementById(`${side}-hp-fill`);
        const hpText = document.getElementById(`${side}-hp-text`);
        if (hpFill) hpFill.style.width = `${hpPercent}%`;
        if (hpText) hpText.innerText = `${Math.ceil(unit.hp)} / ${unit.maxHp}`;

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
            const totalCd = (s.cd || 0) + (s.extraCd || 0);
            const progress = states[i] ? states[i].progress : 0;
            overlay.style.height = `${(1 - progress) * 100}%`;
        });
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
        ft.innerText = (type === 'heal' ? '+' : '-') + text;
        ft.style.color = type === 'heal' ? 'var(--skill-color)' : 'var(--hp-color)';
        ft.style.left = `${rect.left + rect.width / 2 + (Math.random() * 40 - 20)}px`;
        ft.style.top = `${rect.top + 20}px`;
        document.body.appendChild(ft);
        setTimeout(() => ft.remove(), 1000);
    }
}

// Start Game
window.onload = () => {
    window.game = new Game();
};
