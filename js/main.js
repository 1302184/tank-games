function applyLanguage() {
    try {
        const dict = i18nConfig[currentLang] || i18nConfig['zh'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n'); if (dict[key]) el.innerText = dict[key];
        });
        if(window.gameInstance) {
            const btnAudio = document.getElementById('btn-audio');
            if(btnAudio) btnAudio.innerText = audioAPI.enabled ? dict.audioOn : dict.audioOff;
        }
    } catch(e) {}
}

function resizeLayout() {
    const wrapper = document.getElementById('app-wrapper');
    const scale = Math.min(window.innerWidth / 920, window.innerHeight / 550) * 0.95;
    const leftOffset = (window.innerWidth - (920 * scale)) / 2;
    const topOffset = (window.innerHeight - (550 * scale)) / 2;
    wrapper.style.transform = `translate(${leftOffset}px, ${topOffset}px) scale(${scale})`; 
}

window.addEventListener('resize', resizeLayout); 
setTimeout(resizeLayout, 50);

window.onload = () => { 
    try { window.gameInstance = new Game(); } catch(e) {} 
};