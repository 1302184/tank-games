let currentLang = 'zh';
try { currentLang = localStorage.getItem('tank_lang') || 'zh'; } catch(e) {}

const i18nConfig = {
    zh: { title: "坦克大战", hiScore: "最高分", score: "分数", level: "关卡", p1Lives: "P1 生命", p2Lives: "P2 生命", enemies: "剩余敌人", time: "倒计时", modeClassic: "经典闯关", modeTime: "限时挑战", modeEndless: "经典无尽", mode2P: "双人对战", pauseTitle: "游戏暂停", pauseSub: "GAME PAUSED", audioOff: "音效/BGM: 关", audioOn: "音效/BGM: 开", arcadeEdition: "包含大地图与双人模式", gameOver: "游戏结束", youWin: "挑战成功！", finalScore: "最终得分: " },
    en: { title: "TANK BATTLE", hiScore: "HI-SCORE", score: "SCORE", level: "LEVEL", p1Lives: "P1 LIVES", p2Lives: "P2 LIVES", enemies: "ENEMIES", time: "TIME LEFT", modeClassic: "CLASSIC MODE", modeTime: "TIME ATTACK", modeEndless: "CLASSIC ENDLESS", mode2P: "2-PLAYER", pauseTitle: "PAUSED", pauseSub: "GAME PAUSED", audioOff: "AUDIO: OFF", audioOn: "AUDIO: ON", arcadeEdition: "INCLUDES ROGUE MAP", gameOver: "GAME OVER", youWin: "STAGE CLEAR!", finalScore: "FINAL SCORE: " }
};

const CONST = {
    TILE_SIZE: 20, TANK_SIZE: 36, BASE_SIZE: 40, MAX_ENEMIES: 3, 
    PLAYER_SPEED: 0.8,        
    BULLET_SPEED: 2.5,        
    FAST_BULLET_SPEED: 3.5,   
    DIR: { UP: 0, RIGHT: 90, DOWN: 180, LEFT: 270 },
    MAP_TYPE: { EMPTY: 0, BRICK: 1, STEEL: 2, BASE: 9, WATER: 3, GRASS: 4 },
    ITEM_TYPES: ['star', 'bomb', 'helmet', 'clock', 'shovel', 'tank']
};

const ENEMY_CLASSIC = [
    { type: 'normal', speed: 0.4, hp: 1, score: 100 },
    { type: 'fast', speed: 0.8, hp: 1, score: 200 },
    { type: 'heavy', speed: 0.25, hp: 3, score: 400 }
];

const ENEMY_ROGUE = [
    { type: 'normal', speed: 0.4, hp: 40, exp: 20, dmg: 10 },
    { type: 'fast', speed: 0.7, hp: 20, exp: 15, dmg: 5 },
    { type: 'heavy', speed: 0.2, hp: 120, exp: 50, dmg: 20 }
];

const BUFF_POOL = [
    { id: 'atkSpeed', title: "火力全开", desc: "射击冷却时间缩短 20% (可叠加)", icon: "icon-firerate" },
    { id: 'damage', title: "穿甲高爆", desc: "炮弹基础伤害增加 20 (可叠加)", icon: "icon-damage" },
    { id: 'speed', title: "引擎过载", desc: "坦克移动速度提升 (可叠加)", icon: "icon-speed" },
    { id: 'heal', title: "装甲强化", desc: "最大生命+100并回复50% (可叠加)", icon: "icon-heal" },
    { id: 'pierce', title: "贫铀穿甲弹", desc: "子弹可穿墙，重复选加伤害", icon: "icon-pierce" },
    { id: 'multiShot', title: "多管火炮", desc: "增加同时发射的炮弹数量", icon: "icon-multishot" }
];

const MAP_LEVELS = [
    [   "0000000000000000000000000000000000", "0000000000000000000000000000000000",
        "0011001100110011000011001100110011", "0011001100110011000011001100110011",
        "0011001100110011000011001100110011", "0011001100110011000011001100110011",
        "0011001100112211000011221100110011", "0011001100112211000011221100110011",
        
        // --- 【加分项2】SJH 姓名缩写地图墙体核心区 ---
        "0000001111110000001100110011000000", "0000001111110000001100110011000000", 
        "0000001100000000001100110011000000", "0000001100000000001100110011000000", 
        "0000001111110000001100111111000000", "0000001111110000001100111111000000", 
        "0000000000110011001100110011000000", "0000000000110011001100110011000000", 
        "0000001111110011111100110011000000", "0000001111110011111100110011000000", 
        // ---------------------------------------------
        
        "0000000000000000000000000000000000", "0000000000000000000000000000000000",
        "0011001100000000000000000000110011", "0011001100000000000000000000110011" ]
];