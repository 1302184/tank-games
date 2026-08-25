function createDOM(className) {
    const el = document.createElement('div');
    el.className = className ? 'game-obj ' + className : 'game-obj';
    return el;
}

function isCollide(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y;
}

class DOMPool {
    constructor(parent) { this.parent = parent; this.pools = { bullet: [], particle: [] }; }
    get(type, extraClass = '') {
        let el;
        if (this.pools[type].length > 0) { el = this.pools[type].pop(); el.style.display = 'block'; el.style.opacity = 1; } 
        else { el = document.createElement('div'); this.parent.appendChild(el); }
        el.className = `game-obj ${type} ${extraClass}`; return el;
    }
    release(type, el) { el.style.display = 'none'; el.style.transform = ''; this.pools[type].push(el); }
    clearAll() { Object.keys(this.pools).forEach(key => { this.pools[key].forEach(el => el.remove()); this.pools[key] = []; }); }
}