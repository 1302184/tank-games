class Game {
    constructor() {
        this.state = 'MENU'; this.board = document.getElementById('game-board'); 
        this.pool = new DOMPool(this.board); this.keys = {};
        
        this.highScoreClassic = parseInt(localStorage.getItem('tank_highscore')) || 0;
        this.highScoreRogue = parseInt(localStorage.getItem('rogue_tank_score')) || 0;
        
        this.initUI(); this.bindEvents();
    }

    initUI() {
        const langSelect = document.getElementById('lang-select');
        if(langSelect) {
            langSelect.value = currentLang; applyLanguage();
            langSelect.addEventListener('change', (e) => { currentLang = e.target.value; try { localStorage.setItem('tank_lang', currentLang); } catch(err){} applyLanguage(); });
        }
        document.getElementById('btn-audio').onclick = (e) => {
            const state = audioAPI.toggle(); const dict = i18nConfig[currentLang] || i18nConfig['zh'];
            e.target.innerText = state ? dict.audioOn : dict.audioOff;
            e.target.style.background = state ? '#009944' : 'var(--tank-p1)';
            if (state && this.state === 'PLAYING') { audioAPI.startEngine(); audioAPI.startBGM(); }
        };
    }
    
    bindEvents() {
        window.addEventListener('keydown', e => {
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
            this.keys[e.code] = true;
            if (e.code === 'KeyP') { this.togglePause(); }
        }, { passive: false });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        document.getElementById('game-container').addEventListener('mousedown', e => {
            if (e.button !== 0) return; 
            if (e.target.closest('#screen-overlay') || e.target.closest('#level-up-modal') || e.target.closest('#ui-panel')) return;
            this.togglePause();
        });

        // 【移动端适配】虚拟摇杆触摸监听
        const touchBtns = document.querySelectorAll('#mobile-controls button');
        touchBtns.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); 
                const key = btn.getAttribute('data-key');
                if (key) { this.keys[key] = true; if (key === 'KeyP') this.togglePause(); }
            }, { passive: false });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                const key = btn.getAttribute('data-key');
                if (key) this.keys[key] = false;
            }, { passive: false });
        });
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            const dict = i18nConfig[currentLang] || i18nConfig['zh'];
            audioAPI.stopEngine(); audioAPI.stopBGM();
            this.showOverlay(dict.pauseTitle, dict.pauseSub, true);
        } else if (this.state === 'PAUSED') {
            this.resumeGame();
        }
    }

    resumeGame() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.showOverlay(null); 
            audioAPI.startEngine(); audioAPI.startBGM();
        }
    }
    
    showOverlay(title, subtitle = '', isPause = false) {
        const overlay = document.getElementById('screen-overlay');
        if (title) {
            overlay.classList.remove('hidden'); 
            document.getElementById('overlay-title').innerText = title; 
            document.getElementById('overlay-subtitle').innerText = subtitle;
            const dict = i18nConfig[currentLang] || i18nConfig['zh'];
            
            const isEnd = title === dict.gameOver || title === dict.youWin || title === dict.title || title === dict.pauseTitle;
            document.getElementById('menu-buttons').style.display = (isEnd || isPause) ? 'flex' : 'none';
            document.getElementById('btn-resume').style.display = isPause ? 'block' : 'none';
        } else { 
            overlay.classList.add('hidden'); 
        }
    }

    startMode(mode) {
        try { if(!audioAPI.enabled) { audioAPI.enabled = true; audioAPI.init(); const btnAudio = document.getElementById('btn-audio'); btnAudio.innerText = (i18nConfig[currentLang] || i18nConfig['zh']).audioOn; btnAudio.style.background = '#009944'; } } catch(e){}
        
        this.gameMode = mode;
        this.isRogue = (mode === 'ROGUE');
        
        document.getElementById('ui-highscore').innerText = this.isRogue ? this.highScoreRogue : this.highScoreClassic;
        document.getElementById('main-title').innerText = this.isRogue ? "ROGUE TANK" : (i18nConfig[currentLang] || i18nConfig['zh']).title;
        document.getElementById('box-score').classList.toggle('hidden', this.isRogue);
        document.getElementById('box-level').classList.toggle('hidden', this.isRogue || mode === 'ENDLESS');
        document.getElementById('box-time').classList.toggle('hidden', mode !== 'TIME');
        document.getElementById('box-p2-lives').classList.toggle('hidden', mode !== '2P');
        document.getElementById('box-lives').classList.toggle('hidden', this.isRogue);
        document.getElementById('box-enemies').classList.toggle('hidden', this.isRogue);
        
        document.getElementById('box-rogue-kills').classList.toggle('hidden', !this.isRogue);
        document.getElementById('box-rogue-lv').classList.toggle('hidden', !this.isRogue);
        document.getElementById('minimap-container').style.display = this.isRogue ? 'block' : 'none';
        document.getElementById('exp-container').style.display = this.isRogue ? 'block' : 'none';
        
        if (this.isRogue) { this.mapW = 2400; this.mapH = 1800; }
        else { this.mapW = 680; this.mapH = 440; this.board.style.transform = `translate(0px, 0px)`; }
        
        this.board.style.width = `${this.mapW}px`;
        this.board.style.height = `${this.mapH}px`;
        
        this.level = 1; this.score = 0; this.p1Lives = 3; this.p2Lives = mode === '2P' ? 3 : 0;
        this.kills = 0; this.rogueLevel = 1; this.exp = 0; this.maxExp = 100;
        this.timeLeft = mode === 'TIME' ? 90 : 0;

        this.enemySpawnTimer = 9999; 
        this.isFrozen = false; 
        this.freezeTimer = 0;
        this.enemiesToSpawn = this.isRogue ? 9999 : 20; 
        this.spawnInterval = this.isRogue ? 4500 : 3500; 
        
        this.loadLevel(); 
    }
    
    loadLevel() {
        this.board.innerHTML = ''; this.pool.clearAll();
        this.entities = { walls: [], bullets: [], enemies: [], items: [], particles: [] };
        this.isFrozen = false; this.state = 'LEVEL_TRANSITION';
        
        audioAPI.stopEngine(); audioAPI.stopBGM(); audioAPI.playStartJingle();
        const dict = i18nConfig[currentLang] || i18nConfig['zh'];
        
        if (this.isRogue) {
            this.showOverlay("开启开放世界", "SURVIVE & EVOLVE");
            this.buildMapRogue();
            this.initMinimap();
            this.spawnPlayer(1);
            this.updateUI();
        } else {
            if(this.gameMode === 'ENDLESS') { this.enemiesToSpawn = 9999; this.spawnInterval = 3500; } 
            else if(this.gameMode === 'TIME') { this.enemiesToSpawn = 10 + this.level * 5; this.spawnInterval = 3000; } 
            else { this.enemiesToSpawn = 15 + this.level * 5; this.spawnInterval = 3500; }
            this.showOverlay(this.gameMode === 'ENDLESS' ? dict.modeEndless : `${dict.level} ${this.level}`);
            this.buildMapClassic(); 
            this.spawnPlayer(1);
            if(this.gameMode === '2P') this.spawnPlayer(2);
            this.updateUI();
        }
        
        setTimeout(() => {
            this.state = 'PLAYING'; this.showOverlay(null);
            audioAPI.startEngine(); audioAPI.startBGM();
            this.lastTime = performance.now(); 
            requestAnimationFrame((t) => this.gameLoop(t));
        }, 2200);
    }

    updateUI() {
        if (this.isRogue) {
            document.getElementById('ui-rogue-kills').innerText = this.kills;
            document.getElementById('ui-rogue-lv').innerText = this.rogueLevel;
            const percent = Math.min(100, (this.exp / this.maxExp) * 100);
            document.getElementById('exp-fill').style.width = `${percent}%`;
            document.getElementById('exp-text').innerText = `EXP: ${this.exp} / ${this.maxExp}`;
        } else {
            document.getElementById('ui-score').innerText = this.score; 
            document.getElementById('ui-level').innerText = this.level;
            document.getElementById('ui-lives').innerText = '❤️'.repeat(Math.max(0, this.p1Lives));
            document.getElementById('ui-p2-lives').innerText = '❤️'.repeat(Math.max(0, this.p2Lives));
            document.getElementById('ui-enemies').innerText = this.gameMode === 'ENDLESS' ? '∞' : this.enemiesToSpawn + this.entities.enemies.filter(e=>!e.dead).length;
            document.getElementById('ui-time').innerText = Math.ceil(this.timeLeft) + 's';
        }
    }

    buildMapClassic() {
        const mapData = MAP_LEVELS[0]; 
        this.base = { x: 16 * CONST.TILE_SIZE, y: 20 * CONST.TILE_SIZE, w: CONST.BASE_SIZE, h: CONST.BASE_SIZE, el: createDOM('base'), destroyed: false, dead: false };
        this.base.el.style.transform = `translate(${this.base.x}px, ${this.base.y}px)`; this.base.el.style.width = `${this.base.w}px`; this.base.el.style.height = `${this.base.h}px`;
        this.board.appendChild(this.base.el);
        for (let r = 0; r < 22; r++) {
            for (let c = 0; c < 34; c++) {
                if (r >= 19 && c >= 15 && c <= 18) continue;
                let type = parseInt(mapData[r][c]);
                if (type === CONST.MAP_TYPE.BRICK || type === CONST.MAP_TYPE.STEEL) this.createWall(c * CONST.TILE_SIZE, r * CONST.TILE_SIZE, type);
            }
        }
        const bc = 16, br = 20; const wallCoords = [ [bc-1, br+1], [bc-1, br], [bc-1, br-1], [bc, br-1], [bc+1, br-1], [bc+2, br-1], [bc+2, br], [bc+2, br+1] ];
        wallCoords.forEach(pos => { const w = this.createWall(pos[0]*CONST.TILE_SIZE, pos[1]*CONST.TILE_SIZE, CONST.MAP_TYPE.BRICK); w.isBaseWall = true; });
    }

    buildMapRogue() {
        this.gridCols = Math.ceil(this.mapW / CONST.TILE_SIZE);
        this.gridRows = Math.ceil(this.mapH / CONST.TILE_SIZE);
        this.spatialGrid = Array(this.gridRows).fill(0).map(() => Array(this.gridCols).fill(null));

        for(let i=0; i < 80; i++) {
            let cx = Math.floor(Math.random() * (this.gridCols - 5)) + 2; let cy = Math.floor(Math.random() * (this.gridRows - 5)) + 2;
            if (Math.abs(cx - this.gridCols/2) < 15 && Math.abs(cy - this.gridRows/2) < 15) continue;
            let rand = Math.random(); let type = CONST.MAP_TYPE.BRICK;
            if(rand > 0.6) type = CONST.MAP_TYPE.STEEL; if(rand > 0.8) type = CONST.MAP_TYPE.WATER; if(rand > 0.9) type = CONST.MAP_TYPE.GRASS;
            
            let w = Math.floor(Math.random() * 2) + 1; let h = Math.floor(Math.random() * 2) + 1;
            for(let r = 0; r < h; r++){
                for(let c = 0; c < w; c++){ this.createWall((cx+c)*CONST.TILE_SIZE, (cy+r)*CONST.TILE_SIZE, type); }
            }
        }
    }

    createWall(x, y, type) {
        let cssClass = 'brick'; if(type === CONST.MAP_TYPE.STEEL) cssClass = 'steel';
        if(type === CONST.MAP_TYPE.WATER) cssClass = 'water'; if(type === CONST.MAP_TYPE.GRASS) cssClass = 'grass';
        const el = createDOM(cssClass);
        el.style.width = `${CONST.TILE_SIZE}px`; el.style.height = `${CONST.TILE_SIZE}px`; el.style.transform = `translate(${x}px, ${y}px)`;
        this.board.appendChild(el); 
        const wall = { x, y, w: CONST.TILE_SIZE, h: CONST.TILE_SIZE, type, el, dead: false };
        this.entities.walls.push(wall);
        if (this.isRogue && this.spatialGrid) this.spatialGrid[y / CONST.TILE_SIZE][x / CONST.TILE_SIZE] = wall;
        return wall;
    }

    initMinimap() {
        this.minimapCanvas = document.getElementById('minimap-canvas'); this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.minimapScale = 120 / this.mapW; this.minimapCanvas.width = 120; this.minimapCanvas.height = this.mapH * this.minimapScale;
        this.staticMap = document.createElement('canvas'); this.staticMap.width = 120; this.staticMap.height = this.minimapCanvas.height;
        let ctx = this.staticMap.getContext('2d'); ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 120, this.staticMap.height);
        this.entities.walls.forEach(w => {
            if(w.type === CONST.MAP_TYPE.GRASS) ctx.fillStyle = '#27ae60'; else if(w.type === CONST.MAP_TYPE.WATER) ctx.fillStyle = '#2980b9';
            else if(w.type === CONST.MAP_TYPE.BRICK) ctx.fillStyle = '#d35400'; else ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(w.x * this.minimapScale, w.y * this.minimapScale, Math.max(1, w.w * this.minimapScale), Math.max(1, w.h * this.minimapScale));
        });
    }

    updateMinimap() {
        this.minimapCtx.clearRect(0,0,120,120); this.minimapCtx.drawImage(this.staticMap, 0, 0);
        this.minimapCtx.strokeStyle = 'rgba(255,255,255,0.4)'; this.minimapCtx.strokeRect(this.camX * this.minimapScale, this.camY * this.minimapScale, 680 * this.minimapScale, 440 * this.minimapScale);
        if(this.p1 && !this.p1.dead) { this.minimapCtx.fillStyle = '#00FF41'; this.minimapCtx.fillRect(this.p1.x * this.minimapScale, this.p1.y * this.minimapScale, 5, 5); }
        this.minimapCtx.fillStyle = '#FF3333';
        this.entities.enemies.forEach(e => { if(!e.dead) this.minimapCtx.fillRect(e.x * this.minimapScale, e.y * this.minimapScale, 4, 4); });
    }

    updateHPBar(tank) {
        if(!this.isRogue || !tank.el) return;
        const fill = tank.el.querySelector('.hp-fill'); const text = tank.el.querySelector('.hp-text');
        if(fill) fill.style.width = `${Math.max(0, tank.hp) / tank.maxHp * 100}%`;
        if(text) text.innerText = tank.isPlayer ? `${Math.ceil(tank.hp)} / ${tank.maxHp}` : '';
    }

    spawnPlayer(id) {
        const isP1 = id === 1;
        let cssClass = `player-${id} ${this.isRogue ? 'rogue-p1' : ''}`;
        const el = createDOM(`tank ${cssClass}`); 
        el.innerHTML = (this.isRogue ? `<div class="hp-wrap"><div class="hp-fill"></div><div class="hp-text"></div></div>` : '') + 
                       `<div class="body"></div><div class="turret"></div><div class="gun"></div><div class="invincible"></div>`;
        
        const p = {
            id: id, isPlayer: true, w: CONST.TANK_SIZE, h: CONST.TANK_SIZE, el, dir: CONST.DIR.UP, speed: CONST.PLAYER_SPEED, dead: false,
            lastFire: 0, isInvincible: !this.isRogue, invincibleTimer: 5000 
        };
        
        if (this.isRogue) {
            p.x = this.mapW / 2; p.y = this.mapH / 2; 
            p.hp = 500; p.maxHp = 500; p.bulletDmg = 20; 
            p.fireCooldown = 600; 
            p.pierce = false; p.multiShotLevel = 0;
            p.buffLevels = { atkSpeed: 0, damage: 0, speed: 0, heal: 0, pierce: 0, multiShot: 0 };
            el.querySelector('.invincible').style.display = 'none';
            this.updateHPBar(p);
        } else {
            p.x = (isP1 ? 12 : 20) * CONST.TILE_SIZE; p.y = 20 * CONST.TILE_SIZE; p.firePower = 1; p.maxBullets = 1; p.bulletsActive = 0;
            el.querySelector('.invincible').style.display = 'block'; 
        }
        
        this.updateTransform(p); this.board.appendChild(el); 
        if(isP1) this.p1 = p; else this.p2 = p;
    }

    getSafeSpawnPos() {
        let x, y, attempts = 0;
        while(attempts < 50) {
            let angle = Math.random() * Math.PI * 2;
            let radius = 380 + Math.random() * 80; 
            x = this.p1.x + Math.cos(angle) * radius;
            y = this.p1.y + Math.sin(angle) * radius;
            x = Math.max(0, Math.min(x, this.mapW - CONST.TANK_SIZE));
            y = Math.max(0, Math.min(y, this.mapH - CONST.TANK_SIZE));
            
            let testRect = {x, y, w: CONST.TANK_SIZE, h: CONST.TANK_SIZE};
            let hitWall = this.checkWallCollision(testRect, false);
            let hitEnemy = this.entities.enemies.some(e => !e.dead && isCollide(testRect, e));
            
            if (!hitWall && !hitEnemy) return {x, y};
            attempts++;
        }
        return null;
    }

    spawnEnemy() {
        let x, y, typeInfo, isRed = false;
        if (this.isRogue) {
            if (this.p1 && !this.p1.dead) {
                let pos = this.getSafeSpawnPos();
                if (pos) { x = pos.x; y = pos.y; }
                else {
                    let angle = Math.random() * Math.PI * 2;
                    x = this.p1.x + Math.cos(angle) * 400; y = this.p1.y + Math.sin(angle) * 400;
                }
            } else {
                x = Math.random() * (this.mapW - CONST.TANK_SIZE); y = Math.random() * (this.mapH - CONST.TANK_SIZE);
            }
            typeInfo = ENEMY_ROGUE[Math.floor(Math.random() * ENEMY_ROGUE.length)];
        } else {
            const pts = [{x: 0, y: 0}, {x: 16 * CONST.TILE_SIZE, y: 0}, {x: 32 * CONST.TILE_SIZE, y: 0}];
            const pt = pts[Math.floor(Math.random() * pts.length)]; x = pt.x; y = pt.y;
            let typeIdx = 0; const rand = Math.random(); if (rand < 0.1 * this.level) typeIdx = 2; else if (rand < 0.3 * this.level) typeIdx = 1; 
            typeInfo = ENEMY_CLASSIC[typeIdx]; isRed = Math.random() < 0.15; 
        }

        const el = createDOM(`tank enemy-${typeInfo.type} ${isRed ? 'enemy-red' : ''}`); 
        el.innerHTML = (this.isRogue ? `<div class="hp-wrap"><div class="hp-fill"></div></div>` : '') + `<div class="body"></div><div class="turret"></div><div class="gun"></div>`;
        
        const enemy = { isPlayer: false, x, y, w: CONST.TANK_SIZE, h: CONST.TANK_SIZE, el, dir: CONST.DIR.DOWN, speed: typeInfo.speed, lastFire: 0, moveTimer: 0, dead: false, isRed };
        
        if (this.isRogue) {
            const hpMulti = 1 + (this.kills * 0.05); const finalHp = Math.floor(typeInfo.hp * hpMulti);
            enemy.hp = finalHp; enemy.maxHp = finalHp; enemy.exp = typeInfo.exp; enemy.dmg = typeInfo.dmg;
            enemy.fireCooldown = 2000 + Math.random()*2500;
            this.updateHPBar(enemy);
        } else {
            enemy.hp = typeInfo.hp; enemy.score = typeInfo.score; enemy.fireCooldown = 800 + Math.random()*1500;
            this.enemiesToSpawn--; this.updateUI();
        }

        this.updateTransform(enemy); this.entities.enemies.push(enemy); this.board.appendChild(el);
    }

    gameLoop(timestamp) {
        if (this.state !== 'PLAYING') { 
            this.lastTime = timestamp; 
            if(this.state === 'LEVEL_UP' || this.state === 'PAUSED') {
                requestAnimationFrame((t) => this.gameLoop(t)); 
            }
            return; 
        }
        
        let dt = timestamp - this.lastTime; 
        if (dt > 100) dt = 16; 
        this.lastTime = timestamp;
        
        try {
            if(this.gameMode === 'TIME') { this.timeLeft -= dt / 1000; if(this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); } this.updateUI(); } 
            else if (this.gameMode === 'ENDLESS') { this.spawnInterval = Math.max(1000, this.spawnInterval - dt * 0.05); }

            let engineMoving = false;
            if(this.handlePlayerInput(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space')) engineMoving = true;
            if(this.gameMode === '2P' && this.handlePlayerInput(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter')) engineMoving = true;
            audioAPI.setEngineState(engineMoving);
            
            if (this.isRogue) { this.updateCamera(); this.updateMinimap(); }
            
            this.updateBullets(); this.updateEnemies(dt); 
            if(!this.isRogue) { this.updateItems(dt); this.updateGameLogic(dt, this.p1); this.updateGameLogic(dt, this.p2); }
            
            this.flushEntities(); 
        } catch(err) {}
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateCamera() {
        if(!this.p1 || this.p1.dead) return;
        this.camX = Math.max(0, Math.min(this.p1.x - 680 / 2 + CONST.TANK_SIZE / 2, this.mapW - 680));
        this.camY = Math.max(0, Math.min(this.p1.y - 440 / 2 + CONST.TANK_SIZE / 2, this.mapH - 440));
        this.board.style.transform = `translate(${-this.camX}px, ${-this.camY}px)`;
    }

    checkWallCollision(rect, isBullet) {
        if (this.isRogue) {
            let sC = Math.max(0, Math.floor(rect.x / CONST.TILE_SIZE)); let eC = Math.min(this.gridCols - 1, Math.floor((rect.x + rect.w - 1) / CONST.TILE_SIZE));
            let sR = Math.max(0, Math.floor(rect.y / CONST.TILE_SIZE)); let eR = Math.min(this.gridRows - 1, Math.floor((rect.y + rect.h - 1) / CONST.TILE_SIZE));
            for (let r = sR; r <= eR; r++) {
                for (let c = sC; c <= eC; c++) {
                    let w = this.spatialGrid[r][c];
                    if (w && !w.dead) {
                        if (w.type === CONST.MAP_TYPE.GRASS) continue; 
                        if (w.type === CONST.MAP_TYPE.WATER && isBullet) continue; 
                        if (isCollide(rect, w)) return w; 
                    }
                }
            }
        } else {
            for (let w of this.entities.walls) if (!w.dead && isCollide(rect, w)) return w;
            if (this.base && !this.base.destroyed && isCollide(rect, this.base)) return this.base; 
        }
        return null;
    }
    
    checkBounds(rect) { return rect.x >= 0 && rect.x + rect.w <= this.mapW && rect.y >= 0 && rect.y + rect.h <= this.mapH; }

    handlePlayerInput(p, upKey, downKey, leftKey, rightKey, shootKey) {
        if(!p || p.dead) return false; let dx = 0, dy = 0; let moving = false;
        if (this.keys[upKey]) { dy = -p.speed; p.dir = CONST.DIR.UP; moving = true; }
        else if (this.keys[downKey]) { dy = p.speed; p.dir = CONST.DIR.DOWN; moving = true; }
        else if (this.keys[leftKey]) { dx = -p.speed; p.dir = CONST.DIR.LEFT; moving = true; }
        else if (this.keys[rightKey]) { dx = p.speed; p.dir = CONST.DIR.RIGHT; moving = true; }
        
        if (moving) {
            let nextRect = { x: p.x + dx, y: p.y + dy, w: p.w, h: p.h };
            let hitOther = false; const otherP = p.id === 1 ? this.p2 : this.p1;
            if(otherP && !otherP.dead && isCollide(nextRect, otherP)) hitOther = true;
            if (!hitOther && !this.checkWallCollision(nextRect, false) && this.checkBounds(nextRect)) { p.x += dx; p.y += dy; }
            this.updateTransform(p);
        }
        
        const cd = this.isRogue ? p.fireCooldown : 400; 
        if (this.keys[shootKey] && performance.now() - p.lastFire > cd) {
            if (this.isRogue) this.fireBulletRogue(p, true);
            else if (p.bulletsActive < p.maxBullets) this.fireBulletClassic(p, true);
            p.lastFire = performance.now();
        }
        return moving;
    }

    fireBulletRogue(owner, isPlayer) {
        const spawn = (ox, oy) => {
            let bx = owner.x + owner.w / 2 - 3 + ox; let by = owner.y + owner.h / 2 - 3 + oy;
            if(owner.dir === CONST.DIR.UP) by -= owner.h/2; if(owner.dir === CONST.DIR.DOWN) by += owner.h/2;
            if(owner.dir === CONST.DIR.LEFT) bx -= owner.w/2; if(owner.dir === CONST.DIR.RIGHT) bx += owner.w/2;
            if(isPlayer) audioAPI.playShoot();
            const el = this.pool.get('bullet', `${isPlayer ? 'bullet-p1' : ''} ${owner.pierce ? 'bullet-pierce' : ''}`);
            const b = { x: bx, y: by, w: 6, h: 6, el, dir: owner.dir, speed: CONST.BULLET_SPEED, isPlayer, dmg: owner.bulletDmg, pierce: owner.pierce, dead: false };
            this.entities.bullets.push(b); b.el.style.transform = `translate(${bx}px, ${by}px)`;
        };

        let count = 1;
        if (owner.multiShotLevel === 1) count = 2;
        else if (owner.multiShotLevel === 2) count = 3;
        else if (owner.multiShotLevel >= 3) count = 4; 

        let offsets = [0];
        if(count === 2) offsets = [-6, 6];
        if(count === 3) offsets = [-10, 0, 10];
        if(count === 4) offsets = [-12, -4, 4, 12];

        offsets.forEach(off => {
            if (owner.dir === CONST.DIR.UP || owner.dir === CONST.DIR.DOWN) spawn(off, 0); else spawn(0, off);
        });
    }

    fireBulletClassic(owner, isPlayer) {
        let bx = owner.x + owner.w / 2 - 3; let by = owner.y + owner.h / 2 - 3;
        if(owner.dir === CONST.DIR.UP) by -= owner.h/2; if(owner.dir === CONST.DIR.DOWN) by += owner.h/2;
        if(owner.dir === CONST.DIR.LEFT) bx -= owner.w/2; if(owner.dir === CONST.DIR.RIGHT) bx += owner.w/2;
        let speed = CONST.BULLET_SPEED; let isStrong = false;
        if (isPlayer) { audioAPI.playShoot(); owner.bulletsActive++; if (owner.firePower >= 2) speed = CONST.FAST_BULLET_SPEED; if (owner.firePower >= 3) isStrong = true; }
        const el = this.pool.get('bullet', `${isPlayer ? 'bullet-p' + owner.id : ''} ${isStrong ? 'bullet-strong' : ''}`);
        const b = { x: bx, y: by, w: 6, h: 6, el, dir: owner.dir, speed, isPlayer, owner, isStrong, dead: false };
        this.entities.bullets.push(b); b.el.style.transform = `translate(${bx}px, ${by}px)`;
    }

    updateBullets() {
        for (let b of this.entities.bullets) {
            if(b.dead) continue;
            if (b.dir === CONST.DIR.UP) b.y -= b.speed; else if (b.dir === CONST.DIR.DOWN) b.y += b.speed;
            else if (b.dir === CONST.DIR.LEFT) b.x -= b.speed; else if (b.dir === CONST.DIR.RIGHT) b.x += b.speed;
            b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
            
            let hit = false; if (!this.checkBounds(b)) hit = true;
            
            if (!hit) {
                let w = this.checkWallCollision(b, true);
                if (w) {
                    if (this.isRogue) {
                        if (w.type === CONST.MAP_TYPE.BRICK) { 
                            w.dead = true; 
                            const gridY = Math.floor(w.y/CONST.TILE_SIZE);
                            const gridX = Math.floor(w.x/CONST.TILE_SIZE);
                            if (this.spatialGrid[gridY] && this.spatialGrid[gridY][gridX] !== undefined) {
                                this.spatialGrid[gridY][gridX] = null; 
                            }
                            hit = !b.pierce; 
                        } else hit = true;
                    } else {
                        hit = true; if (w === this.base) this.gameOver(); else if (w.type === CONST.MAP_TYPE.BRICK || (w.type === CONST.MAP_TYPE.STEEL && b.isStrong)) w.dead = true; 
                    }
                }
            }
            
            if (!hit) {
                if (b.isPlayer) {
                    for (let e of this.entities.enemies) {
                        if (!e.dead && isCollide(b, e)) {
                            hit = true; 
                            if (this.isRogue) { e.hp -= b.dmg; if(e.hp <= 0) { e.dead = true; this.onEnemyKillRogue(e); } else this.updateHPBar(e); }
                            else { e.hp--; if(e.hp <= 0) { e.dead = true; this.score += e.score; if(e.isRed) this.spawnItemClassic(); this.createExplosion(e.x, e.y); audioAPI.playExplosion(); this.updateUI(); this.checkLevelClearClassic(); } }
                            break;
                        }
                    }
                    if(!hit && !this.isRogue && this.gameMode === '2P') { const targetP = b.owner.id === 1 ? this.p2 : this.p1; if(targetP && !targetP.dead && isCollide(b, targetP) && !targetP.isInvincible) { hit = true; this.killPlayerClassic(targetP.id); } }
                } else {
                    if (this.isRogue) { if(this.p1 && !this.p1.dead && isCollide(b, this.p1)) { hit = true; this.p1.hp -= b.dmg; this.updateHPBar(this.p1); if(this.p1.hp <= 0) this.gameOver(); } }
                    else { if (this.p1 && !this.p1.dead && isCollide(b, this.p1) && !this.p1.isInvincible) { hit = true; this.killPlayerClassic(1); } if (!hit && this.p2 && !this.p2.dead && isCollide(b, this.p2) && !this.p2.isInvincible) { hit = true; this.killPlayerClassic(2); } }
                }
            }
            
            if (!hit) {
                for (let other of this.entities.bullets) { if (b !== other && !other.dead && b.isPlayer !== other.isPlayer && isCollide(b, other)) { hit = true; other.dead = true; if(!this.isRogue && other.isPlayer) other.owner.bulletsActive--; break; } }
            }
            if (hit) { b.dead = true; if (!this.isRogue && b.isPlayer) b.owner.bulletsActive--; }
        }
    }

    updateEnemies(dt) {
        if (this.isFrozen) { this.freezeTimer -= dt; if (this.freezeTimer <= 0) this.isFrozen = false; return; }
        this.enemySpawnTimer += dt;
        
        let interval = this.isRogue ? Math.max(1000, 2500 - this.kills * 15) : this.spawnInterval;
        if (this.enemySpawnTimer > interval && this.entities.enemies.length < (this.isRogue ? 45 : CONST.MAX_ENEMIES) && (this.isRogue || this.enemiesToSpawn > 0)) {
            this.spawnEnemy(); this.enemySpawnTimer = 0;
        }
        
        for (let e of this.entities.enemies) {
            if (e.dead) continue; 
            
            if (this.isRogue && this.p1 && !this.p1.dead) {
                let distToPlayer = Math.hypot(e.x - this.p1.x, e.y - this.p1.y);
                if (distToPlayer > 1200) { e.dead = true; continue; }
            }

            let dx = 0, dy = 0;
            if (e.dir === CONST.DIR.UP) dy = -e.speed; else if (e.dir === CONST.DIR.DOWN) dy = e.speed; else if (e.dir === CONST.DIR.LEFT) dx = -e.speed; else if (e.dir === CONST.DIR.RIGHT) dx = e.speed;
            let nextRect = { x: e.x + dx, y: e.y + dy, w: e.w, h: e.h }; 
            e.moveTimer -= dt;
            
            let hitOtherEnemy = this.entities.enemies.some(other => other !== e && !other.dead && isCollide(nextRect, other));

            if (e.moveTimer <= 0 || !this.checkBounds(nextRect) || this.checkWallCollision(nextRect, false) || hitOtherEnemy) { 
                if (this.isRogue && this.p1 && !this.p1.dead) {
                    if (Math.random() < 0.6) { 
                        let diffX = this.p1.x - e.x; let diffY = this.p1.y - e.y;
                        if (Math.abs(diffX) > Math.abs(diffY)) e.dir = diffX > 0 ? CONST.DIR.RIGHT : CONST.DIR.LEFT;
                        else e.dir = diffY > 0 ? CONST.DIR.DOWN : CONST.DIR.UP;
                    } else {
                        const dirs = [0, 90, 180, 270]; e.dir = dirs[Math.floor(Math.random() * 4)];
                    }
                    
                    let testDx = 0, testDy = 0;
                    if (e.dir === CONST.DIR.UP) testDy = -e.speed; else if (e.dir === CONST.DIR.DOWN) testDy = e.speed; else if (e.dir === CONST.DIR.LEFT) testDx = -e.speed; else if (e.dir === CONST.DIR.RIGHT) testDx = e.speed;
                    if (this.checkWallCollision({ x: e.x + testDx, y: e.y + testDy, w: e.w, h: e.h }, false) || hitOtherEnemy) {
                        const dirs = [0, 90, 180, 270]; e.dir = dirs[Math.floor(Math.random() * 4)];
                    }
                } else {
                    const dirs = [0, 90, 180, 270]; e.dir = dirs[Math.floor(Math.random() * 4)]; 
                }
                e.moveTimer = 400 + Math.random() * 1500; 
            } else { e.x += dx; e.y += dy; }
            this.updateTransform(e);
            
            if (performance.now() - e.lastFire > e.fireCooldown) { 
                if(this.isRogue) this.fireBulletRogue(e, false); 
                else this.fireBulletClassic(e, false); 
                e.lastFire = performance.now(); 
            }
        }
    }

    onEnemyKillRogue(e) {
        this.createExplosion(e.x, e.y); audioAPI.playExplosion();
        this.kills++; this.exp += e.exp; this.updateUI();
        if (this.exp >= this.maxExp) { this.exp -= this.maxExp; this.rogueLevel++; this.maxExp = Math.floor(this.maxExp * 1.5); this.updateUI(); this.triggerLevelUp(); }
    }

    triggerLevelUp() {
        this.state = 'LEVEL_UP'; audioAPI.setEngineState(false);
        const modal = document.getElementById('level-up-modal'); const container = document.getElementById('buff-cards-container'); container.innerHTML = '';
        let shuffled = [...BUFF_POOL].sort(() => 0.5 - Math.random()); let choices = shuffled.slice(0, 3);
        choices.forEach(buff => {
            let card = document.createElement('div'); card.className = 'buff-card';
            let lv = this.p1.buffLevels[buff.id] || 0;
            let lvText = lv > 0 ? ` <br><span style="color:#00FF41; font-size: 14px;">(Lv.${lv} ➜ Lv.${lv+1})</span>` : '';
            card.innerHTML = `<div class="icon-container"><div class="${buff.icon}"></div></div><div class="buff-title">${buff.title}${lvText}</div><div class="buff-desc">${buff.desc}</div>`;
            card.onclick = () => this.applyBuff(buff.id); container.appendChild(card);
        });
        modal.classList.add('active');
    }

    applyBuff(buffId) {
        const p = this.p1;
        p.buffLevels[buffId] = (p.buffLevels[buffId] || 0) + 1;
        let lv = p.buffLevels[buffId];

        switch(buffId) {
            case 'atkSpeed': p.fireCooldown = Math.max(80, p.fireCooldown * 0.8); break;
            case 'damage': p.bulletDmg += 20; break;
            case 'speed': p.speed = Math.min(2.5, p.speed + 0.2); break;
            case 'heal': p.maxHp += 100; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5); this.updateHPBar(p); break;
            case 'pierce': p.pierce = true; if(lv > 1) { p.bulletDmg += 10; } break; 
            case 'multiShot': p.multiShotLevel = lv; break;
        }
        document.getElementById('level-up-modal').classList.remove('active'); 
        this.state = 'PLAYING'; audioAPI.startEngine();
    }

    spawnItemClassic() {
        const type = CONST.ITEM_TYPES[Math.floor(Math.random() * CONST.ITEM_TYPES.length)];
        const x = Math.floor(Math.random() * ((this.mapW - 30) / CONST.TILE_SIZE)) * CONST.TILE_SIZE;
        const y = Math.floor(Math.random() * ((this.mapH - 30) / CONST.TILE_SIZE)) * CONST.TILE_SIZE;
        const el = createDOM(`item ${type}`); el.style.transform = `translate(${x}px, ${y}px)`; this.board.appendChild(el);
        this.entities.items.push({ type, x, y, w: 30, h: 30, el, timer: 10000, dead: false });
    }

    updateItems(dt) {
        for (let item of this.entities.items) {
            if (item.dead) continue; item.timer -= dt; let hitP = null;
            if (this.p1 && !this.p1.dead && isCollide(item, this.p1)) hitP = this.p1; else if (this.p2 && !this.p2.dead && isCollide(item, this.p2)) hitP = this.p2;
            if (hitP) { audioAPI.playItem(); this.applyItemEffectClassic(item.type, hitP); this.score += 500; item.dead = true; this.updateUI(); } else if (item.timer <= 0) item.dead = true;
        }
    }

    applyItemEffectClassic(type, player) {
        switch(type) {
            case 'star': if(player.firePower < 3) player.firePower++; player.maxBullets = player.firePower >= 2 ? 2 : 1; break;
            case 'helmet': player.isInvincible = true; player.invincibleTimer = 5000; player.el.querySelector('.invincible').style.display = 'block'; break;
            case 'bomb': this.entities.enemies.forEach(e => { if(!e.dead){ this.createExplosion(e.x, e.y); e.dead = true; this.score += e.score; }}); audioAPI.playExplosion(); this.checkLevelClearClassic(); break;
            case 'clock': this.isFrozen = true; this.freezeTimer = 8000; break;
            case 'tank': if(player.id === 1) this.p1Lives++; else this.p2Lives++; break;
            case 'shovel': const bW = this.entities.walls.filter(w=>w.isBaseWall); bW.forEach(w=>w.type=CONST.MAP_TYPE.STEEL); bW.forEach(w=>w.el.className='game-obj steel'); setTimeout(() => { bW.forEach(w=>w.type=CONST.MAP_TYPE.BRICK); bW.forEach(w=>w.el.className='game-obj brick'); }, 15000); break;
        }
    }
    
    updateGameLogic(dt, p) {
        if (p && !p.dead && p.isInvincible) { p.invincibleTimer -= dt; if (p.invincibleTimer <= 0) { p.isInvincible = false; p.el.querySelector('.invincible').style.display = 'none'; } }
    }

    checkLevelClearClassic() {
        if (this.gameMode === 'ENDLESS' || this.gameMode === 'TIME') return;
        if (this.enemiesToSpawn <= 0 && this.entities.enemies.filter(e=>!e.dead).length === 0) {
            this.state = 'LEVEL_TRANSITION'; this.level++; audioAPI.stopEngine(); audioAPI.stopBGM(); 
            const dict = i18nConfig[currentLang] || i18nConfig['zh']; setTimeout(() => { if (this.level > MAP_LEVELS.length) { this.showOverlay(dict.youWin, `${dict.finalScore}${this.score}`); this.state = 'GAMEOVER'; } else { this.loadLevel(); } }, 1000);
        }
    }

    killPlayerClassic(id) {
        const p = id === 1 ? this.p1 : this.p2; if(!p || p.dead) return; p.dead = true; p.el.remove();
        this.createExplosion(p.x, p.y); audioAPI.playExplosion(); 
        if(id === 1) { this.p1 = null; this.p1Lives--; } else { this.p2 = null; this.p2Lives--; } this.updateUI(); audioAPI.setEngineState(false);
        if (this.gameMode === '2P') { if (this.p1Lives < 0 && this.p2Lives < 0) setTimeout(() => this.gameOver(), 1000); else if ((id === 1 && this.p1Lives >= 0) || (id === 2 && this.p2Lives >= 0)) setTimeout(() => this.spawnPlayer(id), 1000);
        } else { if (this.p1Lives < 0) setTimeout(() => this.gameOver(), 1000); else setTimeout(() => this.spawnPlayer(1), 1000); }
    }

    updateTransform(obj) { 
        obj.el.style.transform = `translate(${obj.x}px, ${obj.y}px) rotate(${obj.dir}deg)`;
        const hpText = obj.el.querySelector('.hp-text');
        if(hpText) hpText.style.transform = `rotate(${-obj.dir}deg) scale(0.85)`;
    }
    
    flushEntities() {
        this.entities.bullets.filter(b => b.dead).forEach(b => this.pool.release('bullet', b.el)); this.entities.bullets = this.entities.bullets.filter(b => !b.dead);
        this.entities.enemies.filter(e => e.dead).forEach(e => e.el.remove()); this.entities.enemies = this.entities.enemies.filter(e => !e.dead);
        this.entities.walls.filter(w => w.dead).forEach(w => w.el.remove()); this.entities.walls = this.entities.walls.filter(w => !w.dead);
        if(!this.isRogue) { this.entities.items.filter(i => i.dead).forEach(i => i.el.remove()); this.entities.items = this.entities.items.filter(i => !i.dead); }
    }

    gameOver() {
        if (this.state === 'GAMEOVER') return; this.state = 'GAMEOVER'; 
        audioAPI.playExplosion(); audioAPI.stopEngine(); audioAPI.stopBGM();
        
        if (this.isRogue) {
            if (this.p1 && !this.p1.dead) { this.p1.dead = true; this.p1.el.remove(); this.createExplosion(this.p1.x, this.p1.y); }
            if (this.kills > this.highScoreRogue) { this.highScoreRogue = this.kills; try { localStorage.setItem('rogue_tank_score', this.highScoreRogue); } catch(e){} }
            setTimeout(() => this.showOverlay("GAME OVER", `SURVIVED: ${this.kills} KILLS`), 1500);
        } else {
            if(this.base && !this.base.destroyed) { this.base.destroyed = true; this.base.el.classList.add('destroyed'); }
            if (this.score > this.highScoreClassic) { this.highScoreClassic = this.score; try { localStorage.setItem('tank_highscore', this.highScoreClassic); } catch(e){} }
            const dict = i18nConfig[currentLang] || i18nConfig['zh']; setTimeout(() => this.showOverlay(dict.gameOver, `${dict.score}: ${this.score}`), 1500);
        }
    }

    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            const el = this.pool.get('particle'); el.style.left = `${x + 18}px`; el.style.top = `${y + 18}px`;
            const angle = (Math.PI * 2 / 8) * i; const dist = this.isRogue ? 40 : 35;
            if(el.animate) { 
                const animation = el.animate([ { transform: 'translate(0, 0) scale(1.5)', opacity: 1 }, { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0)`, opacity: 0 } ], { duration: 500, easing: 'ease-out' });
                animation.onfinish = () => this.pool.release('particle', el);
            } else { setTimeout(()=> this.pool.release('particle', el), 500); }
        }
    }
}

window.onload = () => { try { window.gameInstance = new Game(); } catch(e) {} };