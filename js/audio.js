class AudioEngine {
    constructor() { this.ctx = null; this.enabled = false; this.engineOsc = null; this.bgmInterval = null; }
    init() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch(e) { } }
    toggle() { this.enabled = !this.enabled; if (this.enabled) this.init(); else { this.stopEngine(); this.stopBGM(); } return this.enabled; }
    playStartJingle() {
        if (!this.enabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const notes = [ {f: 261.63, t: 0.0}, {f: 329.63, t: 0.15}, {f: 392.00, t: 0.3}, {f: 523.25, t: 0.45}, {f: 392.00, t: 0.6}, {f: 523.25, t: 0.75}, {f: 659.25, t: 0.9}, {f: 783.99, t: 1.05}, {f: 1046.50, t: 1.25, d: 0.4} ];
            notes.forEach(n => {
                const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.type = 'square'; osc.frequency.value = n.f;
                gain.gain.setValueAtTime(0.2, t + n.t); gain.gain.linearRampToValueAtTime(0, t + n.t + (n.d||0.12));
                osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t + n.t); osc.stop(t + n.t + (n.d||0.12));
            });
        } catch(e) {}
    }
    startBGM() {
        if (!this.enabled || !this.ctx || this.bgmInterval) return;
        const bass = [164.81, 0, 196.00, 0, 220.00, 0, 233.08, 246.94]; let step = 0;
        this.bgmInterval = setInterval(() => {
            try {
                if (this.ctx.state === 'suspended') return; const t = this.ctx.currentTime;
                if (bass[step % 8]) {
                    const oscB = this.ctx.createOscillator(); const gainB = this.ctx.createGain(); oscB.type = 'square'; oscB.frequency.value = bass[step % 8];
                    gainB.gain.setValueAtTime(0.12, t); gainB.gain.exponentialRampToValueAtTime(0.02, t + 0.2);
                    const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
                    oscB.connect(filter); filter.connect(gainB); gainB.connect(this.ctx.destination); oscB.start(t); oscB.stop(t + 0.2);
                } step++;
            } catch(e) {}
        }, 220); 
    }
    stopBGM() { if (this.bgmInterval) { clearInterval(this.bgmInterval); this.bgmInterval = null; } }
    startEngine() {
        if (!this.enabled || !this.ctx || this.engineOsc) return;
        try {
            this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 35;
            this.engineFilter = this.ctx.createBiquadFilter(); this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 80; 
            this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0.05; 
            this.engineOsc.connect(this.engineFilter); this.engineFilter.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start(); this.isEngineRunning = true;
        } catch(e) {}
    }
    stopEngine() { try { if(this.engineOsc) { this.engineOsc.stop(); this.engineOsc.disconnect(); this.engineOsc = null; this.isEngineRunning = false;} } catch(e){} }
    setEngineState(isMoving) {
        if(!this.enabled || !this.ctx || !this.isEngineRunning) return;
        try {
            this.engineOsc.frequency.setTargetAtTime(isMoving ? 55 : 35, this.ctx.currentTime, 0.1);
            this.engineFilter.frequency.setTargetAtTime(isMoving ? 150 : 80, this.ctx.currentTime, 0.1);
        } catch(e) {}
    }
    playShoot() {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'square'; osc.frequency.setValueAtTime(600, this.ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + 0.1);
        } catch(e) {}
    }
    playExplosion() {
        if (!this.enabled || !this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * 0.4; const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); 
            const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, this.ctx.currentTime); filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);
            const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.4, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
            noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination); noise.start();
        } catch(e) {}
    }
    playItem() {
        if (!this.enabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime; const notes = [440, 554, 659, 880]; 
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.type = 'square'; osc.frequency.value = freq;
                const startTime = t + i * 0.08; gain.gain.setValueAtTime(0, startTime); gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02); gain.gain.linearRampToValueAtTime(0, startTime + 0.08);
                osc.connect(gain); gain.connect(this.ctx.destination); osc.start(startTime); osc.stop(startTime + 0.08);
            });
        } catch(e) {}
    }
}
const audioAPI = new AudioEngine();