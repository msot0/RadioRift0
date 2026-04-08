// ============================================================
//  RADIO RIFT — Full Game
//  Intro + Home + Library + 3 Levels + Audio + Deezer API
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W      = canvas.width;   // 800
const H      = canvas.height;  // 500

// ══════════════════════════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════════════════════════
let keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ══════════════════════════════════════════════════════════════
//  AUDIO — Web Audio oscillator engine
// ══════════════════════════════════════════════════════════════
let audioCtx = null;
let bgMusicNodes = [];
let deezerAudio  = null;   // HTML Audio element for Deezer previews

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, vol = 0.25, delay = 0) {
  const ac   = getAudio();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  gain.gain.setValueAtTime(vol, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration);
}

// ── SFX ──────────────────────────────────────────────────────
function sfxShoot() {
  if (levelIndex === 0) {
    playTone(440, 'triangle', 0.15, 0.2);
    playTone(660, 'triangle', 0.08, 0.1, 0.05);
  } else if (levelIndex === 1) {
    playTone(900, 'sawtooth', 0.08, 0.18);
    playTone(200, 'sine',     0.06, 0.12, 0.04);
  } else {
    playTone(110, 'sawtooth', 0.18, 0.25);
    playTone(165, 'square',   0.08, 0.12, 0.05);
  }
}

function sfxDeflect() {
  playTone(800, 'sine', 0.1, 0.3);
  playTone(1200, 'sine', 0.08, 0.2, 0.06);
}

function sfxHit()        { playTone(180, 'square', 0.12, 0.18); }
function sfxPlayerHit()  { playTone(140, 'square', 0.22, 0.28); }

function sfxBattleWin() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'triangle', 0.28, 0.22, i * 0.11));
}

function sfxDeath() {
  [440, 330, 220, 110].forEach((f, i) => playTone(f, 'sawtooth', 0.22, 0.18, i * 0.14));
}

function sfxBeat() { playTone(55, 'sine', 0.055, 0.035); }

// ── Background music generator ────────────────────────────────
const genreChords = [
  // Country — major, warm
  [[196,247,294],[220,277,330],[246,311,370]],
  // EDM — minor, synth
  [[130,155,195],[146,174,220],[116,138,174]],
  // Rock — power chords
  [[110,165,220],[98,147,196],[123,185,246]],
];

let bgBeat = 0;
function tickBGMusic() {
  if (gameState !== 'playing') return;
  const chords = genreChords[levelIndex];
  const chord  = chords[bgBeat % chords.length];
  chord.forEach(f => playTone(f, levelIndex === 1 ? 'sawtooth' : 'triangle', 0.18, 0.06));
  bgBeat++;
}

// ── Deezer preview player ─────────────────────────────────────
function playDeezerSong(searchQuery, onReady) {
  stopDeezerSong();
  const url = `[corsproxy.io](https://corsproxy.io/?https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}&limit=5)`;
  fetch(url)
    .then(r => r.json())
    .then(data => {
      const track = (data.data || []).find(t => t.preview);
      if (!track) return;
      deezerAudio = new Audio(track.preview);
      deezerAudio.volume = 0.55;
      deezerAudio.play().catch(() => {});
      if (onReady) onReady(track);
    })
    .catch(() => {});
}

function stopDeezerSong() {
  if (deezerAudio) {
    deezerAudio.pause();
    deezerAudio = null;
  }
}

// ══════════════════════════════════════════════════════════════
//  SONG POOLS
// ══════════════════════════════════════════════════════════════
// Each level has 3 battle slots. Each slot has a rotating pool.
const songPools = [
  // Country Circuits
  [
    [{ artist:'Woody Guthrie',  title:'This Land Is Your Land', query:'Woody Guthrie This Land Is Your Land', year:'1940' },
     { artist:'Woody Guthrie',  title:'Dust Bowl Refugee',      query:'Woody Guthrie Dust Bowl Refugee',      year:'1940' }],
    [{ artist:'Hank Williams',  title:"Your Cheatin' Heart",    query:"Hank Williams Your Cheatin Heart",      year:'1952' },
     { artist:'Hank Williams',  title:'Hey Good Lookin',        query:'Hank Williams Hey Good Lookin',         year:'1951' }],
    [{ artist:'Waylon Jennings',title:"Mammas Don't Let Your Babies", query:'Waylon Jennings Mammas Dont Let Your Babies', year:'1978' },
     { artist:'Waylon Jennings',title:'Good Hearted Woman',     query:'Waylon Jennings Good Hearted Woman',    year:'1972' }],
  ],
  // Neon Nexus
  [
    [{ artist:'Avicii',      title:'Wake Me Up',       query:'Avicii Wake Me Up',            year:'2013' },
     { artist:'Avicii',      title:'Levels',           query:'Avicii Levels',                year:'2011' }],
    [{ artist:'Fatboy Slim', title:'Praise You',       query:'Fatboy Slim Praise You',       year:'1998' },
     { artist:'Fatboy Slim', title:'Rockafeller Skank',query:'Fatboy Slim Rockafeller Skank',year:'1998' }],
    [{ artist:'Daft Punk',   title:'Da Funk',          query:'Daft Punk Da Funk',            year:'1995' },
     { artist:'Daft Punk',   title:'Instant Crush',    query:'Daft Punk Instant Crush',      year:'2013' },
     { artist:'Daft Punk',   title:'Veridis Quo',      query:'Daft Punk Veridis Quo',        year:'2001' }],
  ],
  // Rock Ravine
  [
    [{ artist:'Led Zeppelin',title:'Whole Lotta Love', query:'Led Zeppelin Whole Lotta Love', year:'1969' },
     { artist:'Led Zeppelin',title:'Kashmir',          query:'Led Zeppelin Kashmir',          year:'1975' }],
    [{ artist:'Pearl Jam',   title:'Even Flow',        query:'Pearl Jam Even Flow',           year:'1991' },
     { artist:'Pearl Jam',   title:'Black',            query:'Pearl Jam Black',               year:'1991' },
     { artist:'Pearl Jam',   title:'Alive',            query:'Pearl Jam Alive',               year:'1991' }],
    [{ artist:'Jimi Hendrix',title:'Purple Haze',      query:'Jimi Hendrix Purple Haze',      year:'1967' },
     { artist:'Jimi Hendrix',title:'All Along The Watchtower', query:'Jimi Hendrix All Along The Watchtower', year:'1968' }],
  ],
];

// Track which pool index to use per slot across playthroughs
let poolIndices = [[0,0],[0,0],[0,0]]; // [level][battle]
function advancePoolIndex(lvl, battle) {
  const pool = songPools[lvl][battle];
  poolIndices[lvl][battle] = (poolIndices[lvl][battle] + 1) % pool.length;
}
function getSong(lvl, battle) {
  return songPools[lvl][battle][poolIndices[lvl][battle]];
}

// Earned songs this session
let earnedSongs  = [];
let nowPlaying   = null; // { track (Deezer obj), song (our obj) }
let songNotif    = null; // { song, timer }

function awardSong(lvl, battle) {
  const song = getSong(lvl, battle);
  advancePoolIndex(lvl, battle);
  earnedSongs.push({ ...song, levelIndex: lvl });
  songNotif = { song: { ...song, levelIndex: lvl }, timer: 300 };
  playDeezerSong(song.query, track => {
    nowPlaying = { track, song: { ...song, levelIndex: lvl } };
  });
  sfxBattleWin();
}

// ══════════════════════════════════════════════════════════════
//  GAME STATE
// ══════════════════════════════════════════════════════════════
// States: 'intro' | 'home' | 'levelIntro' | 'playing'
//         | 'battleTransition' | 'knockout' | 'win'
let gameState    = 'intro';
let levelIndex   = 0;
let battleIndex  = 0;
let tokens       = [];
let frame        = 0;
let lastBeatFrame = 0;
let bgMusicTimer  = 0;
let knockoutTimer = 0;

// ── Level metadata ────────────────────────────────────────────
const levels = [
  {
    name:'Country Circuits', bpm:90,
    skyTop:'#e8883a', skyBot:'#f5c97a',
    floorTop:'#8b5e2e', floorBot:'#5a3510',
    accent:'#f0a030', lineColor:'#a0724a',
    tokenIcon:'🪙',
    albumColors:['#8b5e2e','#f0a030','#e8883a'],
    intro:"The radio crackles with twang and dust...\nWelcome to COUNTRY CIRCUITS.",
  },
  {
    name:'Neon Nexus', bpm:128,
    skyTop:'#0a0020', skyBot:'#26124b',
    floorTop:'#1a0840', floorBot:'#0d0420',
    accent:'#c800ff', lineColor:'#8a2be2',
    tokenIcon:'🎧',
    albumColors:['#26124b','#c800ff','#00ffff'],
    intro:"Bass drops into the void...\nWelcome to NEON NEXUS.",
  },
  {
    name:'Rock Ravine', bpm:140,
    skyTop:'#0d0000', skyBot:'#3a0000',
    floorTop:'#2b0000', floorBot:'#1a0000',
    accent:'#ff2200', lineColor:'#cc2200',
    tokenIcon:'🎸',
    albumColors:['#2b0000','#ff2200','#ffaa00'],
    intro:"The ground shakes. Amps scream.\nWelcome to ROCK RAVINE.",
  },
];

// ── Battle names ──────────────────────────────────────────────
const battleNames = [
  ['Sound Snakes',    'Banjo Specter',    'ROBOT COWBOY'],
  ['Bass Crawlers',   'Strobe Phantom',   'DJ MONSTER'],
  ['Amp Gargoyles',   'Riff Wraith',      'GUITAR DEMON LORD'],
];

// ══════════════════════════════════════════════════════════════
//  INTRO SCREEN — comic panels
// ══════════════════════════════════════════════════════════════
const introPanels = [
  {
    text: "It started at a garage sale.\nA beat-up old beatbox.\nSomething felt... wrong.",
    draw: drawPanelBeatbox,
  },
  {
    text: "The label was scratched off.\nThe knobs were warm\nlike it had been running for years.",
    draw: drawPanelCloseup,
  },
  {
    text: "You reached out...\nand touched the dial.",
    draw: drawPanelHand,
  },
  {
    text: "The static SCREAMED.\nThe world folded inward.\nYou were gone.",
    draw: drawPanelSuck,
  },
  {
    text: "Three worlds. Three tokens.\nFight your way out\nor be trapped in the Rift forever.",
    draw: drawPanelTitle,
  },
];

let introPanel    = 0;
let introPanelAge = 0;
let introFade     = 0; // 0=in 1=showing 2=out

// ── Panel drawing functions ───────────────────────────────────
function drawPanelBeatbox(age) {
  // Dark garage sale background
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(0, 0, W, H);

  // Table surface
  ctx.fillStyle = '#3a2810';
  ctx.fillRect(0, 360, W, 140);
  ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 360); ctx.lineTo(W, 360); ctx.stroke();

  // Junk items on table
  ctx.fillStyle = '#555'; ctx.fillRect(60, 310, 40, 50);  // old radio
  ctx.fillStyle = '#4a3a20'; ctx.fillRect(680, 290, 60, 70); // box

  // THE BEATBOX — centre, battered
  const bx = W/2 - 90, by = 220;
  const bobble = Math.sin(age * 0.04) * 2;

  // Body — dark dented metal
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath(); ctx.roundRect(bx, by + bobble, 180, 130, 12); ctx.fill();
  ctx.strokeStyle = '#ff4400';
  ctx.lineWidth   = 2;
  ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 12 + Math.sin(age*0.08)*6;
  ctx.stroke(); ctx.shadowBlur = 0;

  // Dents / scratches
  ctx.strokeStyle = '#4a2a00'; ctx.lineWidth = 1.5;
  [[bx+20,by+30,bx+40,by+45],[bx+140,by+20,bx+160,by+35],[bx+80,by+90,bx+100,by+110]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1+bobble); ctx.lineTo(x2,y2+bobble); ctx.stroke();
  });

  // Two speaker cones
  [bx+20, bx+110].forEach(sx => {
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(sx+25, by+50+bobble, 30, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
    [22,16,10,5].forEach(r => {
      ctx.strokeStyle = r===5 ? '#ff3300' : '#2a2a2a';
      ctx.lineWidth   = r===5 ? 2 : 1;
      ctx.beginPath(); ctx.arc(sx+25, by+50+bobble, r, 0, Math.PI*2); ctx.stroke();
    });
  });

  // Cassette slot
  ctx.fillStyle = '#111';
  ctx.fillRect(bx+40, by+88+bobble, 100, 22);
  ctx.strokeStyle = '#ff2200'; ctx.lineWidth = 1;
  ctx.strokeRect(bx+40, by+88+bobble, 100, 22);

  // Evil eyes — glowing red slits in the vents
  ctx.fillStyle = '#ff2200';
  ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 14;
  [[bx+55, by+108],[bx+95, by+108],[bx+125, by+108]].forEach(([ex,ey])=>{
    ctx.beginPath(); ctx.ellipse(ex, ey+bobble, 6, 3, 0, 0, Math.PI*2); ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Price tag
  ctx.fillStyle = '#fff'; ctx.fillRect(bx+130, by-18+bobble, 44, 24);
  ctx.fillStyle = '#c00'; ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left'; ctx.fillText('$2.00', bx+133, by-2+bobble);

  // Ambient dust particles
  ctx.fillStyle = 'rgba(200,180,120,0.4)';
  for (let i=0; i<12; i++) {
    const px = (Math.sin(i*137+age*0.02)*350)+W/2;
    const py = (Math.cos(i*97 +age*0.015)*100)+300;
    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill();
  }
}

function drawPanelCloseup(age) {
  ctx.fillStyle = '#0d0808';
  ctx.fillRect(0, 0, W, H);

  // Close-up of dial/vents
  const cx = W/2, cy = H/2;
  ctx.fillStyle = '#1a0f05';
  ctx.beginPath(); ctx.roundRect(cx-200, cy-150, 400, 300, 20); ctx.fill();
  ctx.strokeStyle = '#ff3300'; ctx.lineWidth = 3;
  ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 20;
  ctx.stroke(); ctx.shadowBlur = 0;

  // Big dial
  const angle = age * 0.01;
  ctx.fillStyle = '#3a2010';
  ctx.beginPath(); ctx.arc(cx-70, cy+10, 55, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#8a5020'; ctx.lineWidth = 3; ctx.stroke();
  // Notch
  ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx-70, cy+10);
  ctx.lineTo(cx-70+Math.cos(angle)*44, cy+10+Math.sin(angle)*44);
  ctx.stroke();

  // Heat shimmer lines
  ctx.strokeStyle = 'rgba(255,100,0,0.3)'; ctx.lineWidth = 1;
  for (let i=0; i<6; i++) {
    const hx = cx + 60 + i*18;
    ctx.beginPath();
    ctx.moveTo(hx + Math.sin(age*0.05+i)*4, cy-120);
    ctx.lineTo(hx + Math.sin(age*0.05+i+1)*4, cy+120);
    ctx.stroke();
  }

  // Scratched label area
  ctx.fillStyle = '#2a1a08';
  ctx.fillRect(cx+20, cy-30, 140, 50);
  ctx.strokeStyle = '#4a3010'; ctx.lineWidth = 1;
  // Scratches over label
  for (let i=0; i<8; i++) {
    ctx.beginPath();
    ctx.moveTo(cx+25+i*16, cy-28); ctx.lineTo(cx+30+i*16, cy+15);
    ctx.stroke();
  }

  // Warmth glow
  ctx.fillStyle = 'rgba(255,80,0,0.07)';
  ctx.beginPath(); ctx.arc(cx, cy, 200, 0, Math.PI*2); ctx.fill();
}

function drawPanelHand(age) {
  ctx.fillStyle = '#0d0808';
  ctx.fillRect(0, 0, W, H);

  // Beatbox in background, smaller
  ctx.fillStyle = '#1a0f05';
  ctx.beginPath(); ctx.roundRect(W/2-80, 60, 160, 110, 10); ctx.fill();
  ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2; ctx.stroke();
  // Mini evil eyes
  ctx.fillStyle='#ff2200'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=10;
  [W/2-30,W/2+10,W/2+40].forEach(ex=>{
    ctx.beginPath(); ctx.ellipse(ex, 148, 5, 2.5, 0, 0, Math.PI*2); ctx.fill();
  });
  ctx.shadowBlur=0;

  // First-person hand reaching up from bottom
  const reach = Math.min(age / 80, 1);
  const handY = H - 60 - reach * 260;

  // Arm
  ctx.fillStyle = '#b08878';
  ctx.fillRect(W/2-28, handY+60, 56, H);

  // Hand / fingers
  ctx.fillStyle = '#b08878';
  // Palm
  ctx.beginPath(); ctx.roundRect(W/2-32, handY, 64, 55, 10); ctx.fill();
  // Fingers
  [-28,-10,8,26].forEach((fx,i)=>{
    ctx.beginPath();
    ctx.roundRect(W/2+fx, handY-28-i%2*6, 14, 34, 6);
    ctx.fill();
  });
  // Thumb
  ctx.beginPath(); ctx.roundRect(W/2+34, handY+8, 14, 28, 6); ctx.fill();
  // Outline
  ctx.strokeStyle = '#7a5848'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(W/2-32, handY, 64, 55, 10); ctx.stroke();

  // Electric arc when hand gets close to box
  if (reach > 0.7) {
    const arc = (reach - 0.7) / 0.3;
    ctx.strokeStyle = `rgba(255,150,50,${arc * 0.9})`;
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(W/2, 170);
    ctx.bezierCurveTo(W/2+30, 200, W/2-20, 220, W/2+10, handY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawPanelSuck(age) {
  // Vortex / static suck-in effect
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const cx = W/2, cy = H/2;
  const spin = age * 0.06;

  // Spiral rings expanding outward
  for (let r=0; r<12; r++) {
    const radius = ((r * 45 + age * 3) % 360);
    const alpha  = 1 - radius/360;
    ctx.strokeStyle = `rgba(255,${80+r*10},0,${alpha*0.8})`;
    ctx.lineWidth   = 3 - r*0.1;
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius+10, spin + r*0.5, spin + r*0.5 + Math.PI*1.4);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Static noise dots
  ctx.fillStyle = '#fff';
  for (let i=0; i<80; i++) {
    const nx = (Math.sin(i*173+age*0.3)*350)+cx;
    const ny = (Math.cos(i*97 +age*0.25)*200)+cy;
    const nr = Math.random()*2;
    ctx.globalAlpha = Math.random()*0.8;
    ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Person silhouette being sucked in, shrinking
  const scale = Math.max(0.05, 1 - age/120);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#fff';
  // Body silhouette
  ctx.beginPath(); ctx.ellipse(0,-60,20,25,0,0,Math.PI*2); ctx.fill(); // head
  ctx.fillRect(-18,-30,36,50); // body
  ctx.fillRect(-32,-20,14,40); // left arm
  ctx.fillRect(18,-20,14,40);  // right arm
  ctx.fillRect(-20,20,14,44);  // left leg
  ctx.fillRect(6,20,14,44);    // right leg
  ctx.restore();
}

function drawPanelTitle(age) {
  // Epic title card
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Background frequency waves
  ctx.strokeStyle = 'rgba(255,80,0,0.2)';
  ctx.lineWidth = 2;
  for (let i=0; i<8; i++) {
    ctx.beginPath();
    for (let x=0; x<W; x+=4) {
      const y = H/2 + Math.sin((x+age*3)*0.02 + i*0.8) * (20+i*12);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // RADIO RIFT title
  const pulse = 1 + Math.sin(age*0.06)*0.04;
  ctx.save();
  ctx.translate(W/2, H/2 - 60);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ff4400';
  ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 30;
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RADIO', 0, 0);
  ctx.fillStyle = '#ffaa00';
  ctx.fillText('RIFT', 0, 72);
  ctx.restore();
  ctx.shadowBlur = 0;

  // Tagline
  ctx.fillStyle = '#aaa';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Three worlds. Three tokens.', W/2, H/2 + 70);
  ctx.fillText('Fight your way home.', W/2, H/2 + 95);

  // Press space
  if (Math.floor(age/25)%2===0) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('PRESS SPACE TO BEGIN', W/2, H - 50);
  }
}

// ══════════════════════════════════════════════════════════════
//  HOME SCREEN
// ══════════════════════════════════════════════════════════════
let homeOption = 0; // 0=play 1=library

function drawHome() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Frequency wave bg
  ctx.strokeStyle = 'rgba(255,80,0,0.15)';
  ctx.lineWidth = 2;
  for (let i=0; i<6; i++) {
    ctx.beginPath();
    for (let x=0; x<W; x+=4) {
      const y = H/2 + Math.sin((x+frame*2)*0.018 + i*1.1)*(18+i*10);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // Title
  const pulse = 1 + Math.sin(frame*0.05)*0.03;
  ctx.save();
  ctx.translate(W/2, 130);
  ctx.scale(pulse,pulse);
  ctx.fillStyle = '#ff4400'; ctx.shadowColor='#ff2200'; ctx.shadowBlur=24;
  ctx.font = 'bold 64px monospace'; ctx.textAlign='center';
  ctx.fillText('RADIO', 0, 0);
  ctx.fillStyle='#ffaa00';
  ctx.fillText('RIFT', 0, 66);
  ctx.restore(); ctx.shadowBlur=0;

  // Subtitle
  ctx.fillStyle='#888'; ctx.font='14px monospace'; ctx.textAlign='center';
  ctx.fillText('An Audio Adventure', W/2, 230);

  // Tokens earned so far
  if (tokens.length > 0) {
    ctx.fillStyle='#fff'; ctx.font='18px monospace';
    ctx.fillText(tokens.join('  '), W/2, 265);
  }

  // Menu options
  const options = ['▶  PLAY', '📼  LIBRARY'];
  options.forEach((opt, i) => {
    const isSelected = homeOption === i;
    const by = 310 + i * 60;
    ctx.fillStyle = isSelected ? 'rgba(255,100,0,0.25)' : 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.roundRect(W/2-120, by-30, 240, 46, 10); ctx.fill();
    ctx.strokeStyle = isSelected ? '#ff6600' : '#444';
    ctx.lineWidth = isSelected ? 2 : 1;
    if (isSelected) { ctx.shadowColor='#ff6600'; ctx.shadowBlur=10; }
    ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle = isSelected ? '#ffaa00' : '#888';
    ctx.font = `${isSelected?'bold ':''  }18px monospace`;
    ctx.textAlign='center';
    ctx.fillText(opt, W/2, by+4);
  });

  // Controls reminder
  ctx.fillStyle='#555'; ctx.font='11px monospace';
  ctx.fillText('↑↓ navigate   SPACE select', W/2, H-20);

  ctx.textAlign='left';
}

function handleHomeInput() {
  if (keys['ArrowUp'])   { homeOption = 0; keys['ArrowUp']=false; }
  if (keys['ArrowDown']) { homeOption = 1; keys['ArrowDown']=false; }
  if (keys[' ']) {
    keys[' '] = false;
    if (homeOption === 0) startLevel();
    if (homeOption === 1) gameState = 'library';
  }
}

function startLevel() {
  gameState   = 'levelIntro';
  levelIntroAge = 0;
}

// ══════════════════════════════════════════════════════════════
//  LEVEL INTRO CARD
// ══════════════════════════════════════════════════════════════
let levelIntroAge = 0;

function drawLevelIntro() {
  levelIntroAge++;
  const lvl = levels[levelIndex];

  // Background flash then settle
  const fadeIn = Math.min(levelIntroAge / 30, 1);
  ctx.fillStyle = `rgba(0,0,0,${fadeIn})`;
  ctx.fillRect(0, 0, W, H);

  // Accent colour wash
  ctx.fillStyle = lvl.accent;
  ctx.globalAlpha = Math.max(0, 0.3 - levelIntroAge/100);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Level number
  ctx.fillStyle = lvl.accent;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = lvl.accent; ctx.shadowBlur = 8;
  ctx.fillText(`LEVEL ${levelIndex+1}`, W/2, H/2 - 80);
  ctx.shadowBlur = 0;

  // Level name — slides in
  const slide = Math.min(levelIntroAge / 20, 1);
  const nameX  = W/2 - (1-slide)*200;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px monospace';
  ctx.shadowColor = lvl.accent; ctx.shadowBlur = 18;
  ctx.fillText(lvl.name, nameX, H/2 - 20);
  ctx.shadowBlur = 0;

  // Flavour text
  if (levelIntroAge > 25) {
    ctx.fillStyle = '#aaa'; ctx.font = '15px monospace';
    lvl.intro.split('\n').forEach((line, i) => {
      ctx.fillText(line, W/2, H/2 + 40 + i*24);
    });
  }

  // Enemy roster
  if (levelIntroAge > 45) {
    ctx.fillStyle = '#666'; ctx.font = '12px monospace';
    ctx.fillText('ENCOUNTERS:', W/2, H/2 + 120);
    battleNames[levelIndex].forEach((name, i) => {
      ctx.fillStyle = i===2 ? lvl.accent : '#888';
      ctx.fillText((i===2?'⚡ BOSS: ':` ${i+1}. `) + name, W/2, H/2 + 140 + i*20);
    });
  }

  // Press space
  if (levelIntroAge > 60 && Math.floor(levelIntroAge/25)%2===0) {
    ctx.fillStyle='#fff'; ctx.font='14px monospace';
    ctx.fillText('PRESS SPACE TO ENTER', W/2, H-40);
  }

  if (keys[' '] && levelIntroAge > 60) {
    keys[' '] = false;
    gameState = 'playing';
    resetBattle();
  }

  ctx.textAlign='left';
}

// ══════════════════════════════════════════════════════════════
//  BATTLE TRANSITION SCREEN
// ══════════════════════════════════════════════════════════════
let transitionAge = 0;
let transitionMsg = '';

function showTransition(msg) {
  gameState     = 'battleTransition';
  transitionAge = 0;
  transitionMsg = msg;
  stopDeezerSong();
}

function drawTransition() {
  transitionAge++;
  const lvl = levels[levelIndex];

  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = lvl.accent;
  ctx.shadowColor = lvl.accent; ctx.shadowBlur = 14;
  ctx.font = 'bold 26px monospace'; ctx.textAlign='center';
  ctx.fillText(transitionMsg, W/2, H/2 - 20);
  ctx.shadowBlur=0;

  // Next encounter label
  if (battleIndex < 3) {
    ctx.fillStyle='#888'; ctx.font='15px monospace';
    const nextName = battleNames[levelIndex][battleIndex] || '';
    ctx.fillText(`Next: ${nextName}`, W/2, H/2+20);
  }

  if (transitionAge > 60 && Math.floor(transitionAge/22)%2===0) {
    ctx.fillStyle='#fff'; ctx.font='14px monospace';
    ctx.fillText('PRESS SPACE TO CONTINUE', W/2, H-40);
  }

  if (keys[' '] && transitionAge > 60) {
    keys[' '] = false;
    if (battleIndex >= 3) {
      // Level complete
      tokens.push(levels[levelIndex].tokenIcon);
      battleIndex = 0;
      levelIndex++;
      if (levelIndex >= levels.length) { gameState='win'; return; }
      gameState = 'levelIntro';
      levelIntroAge = 0;
    } else {
      gameState = 'playing';
      resetBattle();
    }
  }
  ctx.textAlign='left';
}

// ══════════════════════════════════════════════════════════════
//  PLAYER
// ══════════════════════════════════════════════════════════════
const GROUND = 400;
const GRAVITY = 0.5;

const player = {
  x:120, y:GROUND-56, w:36, h:56,
  vy:0, vx:0, onGround:true,
  hp:100, maxHp:100,
  bullets:[], shootCD:0,
  facing:1,
  walkFrame:0, bobOffset:0,
  isWalking:false, isCrouching:false,
  invincible:0,
  // Deflect shield
  shielding:false,
  shieldCooldown:0,
  shieldDuration:0,
};

const SHIELD_MAX      = 90;  // frames shield can be held
const SHIELD_COOLDOWN = 180; // frames before shield recharges

function handleInput() {
  if (gameState !== 'playing') return;
  player.isWalking   = false;
  player.isCrouching = false;
  player.vx          = 0;

  if (keys['ArrowRight']) { player.vx=3.5; player.facing=1;  player.isWalking=true; }
  if (keys['ArrowLeft'])  { player.vx=-3.5; player.facing=-1; player.isWalking=true; }
  if (keys['ArrowDown'])  { player.isCrouching=true; }
  if (keys['ArrowUp'] && player.onGround) { player.vy=-13; player.onGround=false; }
  if (keys[' ']) shoot();

  // Shield
  const shieldKey = keys['z'] || keys['Z'];
  if (shieldKey && player.shieldCooldown <= 0 && player.shieldDuration < SHIELD_MAX) {
    player.shielding     = true;
    player.shieldDuration++;
    if (player.shieldDuration >= SHIELD_MAX) {
      player.shielding      = false;
      player.shieldCooldown = SHIELD_COOLDOWN;
      player.shieldDuration = 0;
    }
  } else if (!shieldKey) {
    if (player.shielding) {
      player.shielding      = false;
      player.shieldCooldown = SHIELD_COOLDOWN;
      player.shieldDuration = 0;
    }
  }
  if (player.shieldCooldown > 0) player.shieldCooldown--;

  player.x += player.vx;
  player.x  = Math.max(0, Math.min(W - player.w, player.x));
}

function shoot() {
  if (player.shootCD > 0) return;
  player.bullets.push({
    x: player.x + (player.facing===1 ? player.w+4 : -12),
    y: player.y + 18,
    vx: 6 * player.facing,
  });
  player.shootCD = 16;
  sfxShoot();
}

function applyPhysics() {
  player.vy += GRAVITY;
  player.y  += player.vy;
  const floor = GROUND - player.h;
  if (player.y >= floor) { player.y=floor; player.vy=0; player.onGround=true; }
  if (player.invincible>0) player.invincible--;
}

function updateBullets() {
  if (player.shootCD>0) player.shootCD--;
  player.bullets.forEach(b => b.x += b.vx);
  player.bullets = player.bullets.filter(b => b.x>-20 && b.x<W+20);
  player.bullets.forEach(b => {
    if (!enemy) return;
    if (b.x<enemy.x+enemy.w && b.x+8>enemy.x && b.y<enemy.y+enemy.h && b.y+8>enemy.y) {
      enemy.hp -= 10; b.x=9999; sfxHit();
      if (enemy.hp<=0) battleWon();
    }
  });
}

function checkStomp() {
  if (!enemy || enemy.type!==0) return;
  const falling  = player.vy>0;
  const overlapX = player.x<enemy.x+enemy.w && player.x+player.w>enemy.x;
  const feetY    = player.y+player.h;
  if (falling && overlapX && feetY>enemy.y && feetY<enemy.y+22) {
    enemy.hp -= 40; player.vy=-10; player.invincible=30; sfxHit();
    if (enemy.hp<=0) battleWon();
  }
}

function updatePlayerAnim() {
  if (player.isWalking) player.walkFrame=(player.walkFrame+0.18)%4;
  player.bobOffset = player.onGround && !player.isWalking
    ? Math.sin(frame*0.06)*2.5 : 0;
}

// ══════════════════════════════════════════════════════════════
//  ENEMY SYSTEM
// ══════════════════════════════════════════════════════════════
let enemy        = null;
let enemyBullets = [];

function buildEnemy() {
  enemyBullets=[];
  const type   = battleIndex;
  const hpBase = [70, 110, 200];
  const hp     = hpBase[type] + levelIndex*30;
  const base   = {
    x:620, y:GROUND-60, w:48, h:60,
    hp, maxHp:hp, type, levelIndex,
    phase:0, actionTimer:60, moveDir:-1,
    vy:0, onGround:true, anim:0,
    shootCD:0,
  };
  if (type===0) return { ...base, speed:1.4+levelIndex*0.3 };
  if (type===1) return { ...base, speed:1.0+levelIndex*0.25, preferX:520 };
  return { ...base, w:70, h:78, x:560, y:GROUND-78, speed:1.2+levelIndex*0.4 };
}

// ── Bullet factories — reduced speed and count ────────────────
function fireEnemyBullet() {
  const dx=player.x-enemy.x, dy=player.y-enemy.y;
  const dist=Math.hypot(dx,dy)||1;
  enemyBullets.push({
    x:enemy.x+enemy.w/2, y:enemy.y+enemy.h/2,
    vx:(dx/dist)*2.8, vy:(dy/dist)*2.8,    // slower
    w:10, h:10, dmg:8+levelIndex*3,
    life:180, kind:'single',
  });
}

function fireBossSpread() {
  // Only 3 spread bullets instead of 5, slower
  const dx=player.x-enemy.x, dy=player.y-enemy.y;
  const base=Math.atan2(dy,dx);
  [-0.25, 0, 0.25].forEach(a => {
    const ang=base+a;
    enemyBullets.push({
      x:enemy.x+enemy.w/2, y:enemy.y+enemy.h/2,
      vx:Math.cos(ang)*3, vy:Math.sin(ang)*3,
      w:10, h:10, dmg:10+levelIndex*3,
      life:200, kind:'spread',
    });
  });
}

function fireBossWave() {
  // Only 3 wave bullets, more spread out, slower
  [-1,0,1].forEach(i => {
    enemyBullets.push({
      x:enemy.x+enemy.w/2, y:enemy.y+enemy.h/2+i*28,
      vx:(player.x<enemy.x?-3.2:3.2),
      vy:i*0.8,
      w:12, h:12, dmg:12+levelIndex*4,
      life:160, kind:'wave',
    });
  });
}

// ── AI ────────────────────────────────────────────────────────
function updateEnemy() {
  if (!enemy) return;
  enemy.anim++;
  enemy.vy+=GRAVITY; enemy.y+=enemy.vy;
  const floor=GROUND-enemy.h;
  if (enemy.y>=floor){enemy.y=floor;enemy.vy=0;enemy.onGround=true;}

  if (enemy.type===0) updateMeleeAI();
  if (enemy.type===1) updateRangedAI();
  if (enemy.type===2) updateBossAI();

  enemy.x=Math.max(0,Math.min(W-enemy.w,enemy.x));

  // Enemy bullet movement
  enemyBullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});
  enemyBullets=enemyBullets.filter(b=>b.life>0&&b.x>-60&&b.x<W+60);

  // Hit player — deflect check
  if (player.invincible<=0) {
    enemyBullets.forEach(b=>{
      if (b.x<player.x+player.w&&b.x+b.w>player.x&&b.y<player.y+player.h&&b.y+b.h>player.y) {
        if (player.shielding) {
          // Deflect — reverse bullet back toward enemy
          b.vx *= -1.2; b.vy *= -0.8;
          b.dmg = 20; // deflected bullet does more damage
          b.kind = 'deflected';
          sfxDeflect();
        } else {
          player.hp -= b.dmg; b.life=0;
          player.invincible=50; sfxPlayerHit();
          if (player.hp<=0) playerDied();
        }
      }
    });
  }

  // Deflected bullets hitting enemy
  enemyBullets.filter(b=>b.kind==='deflected').forEach(b=>{
    if (b.x<enemy.x+enemy.w&&b.x+8>enemy.x&&b.y<enemy.y+enemy.h&&b.y+8>enemy.y) {
      enemy.hp-=b.dmg; b.life=0; sfxHit();
      if (enemy.hp<=0) battleWon();
    }
  });

  // Melee contact
  if (enemy.type===0&&player.invincible<=0&&
    player.x<enemy.x+enemy.w&&player.x+player.w>enemy.x&&
    player.y<enemy.y+enemy.h&&player.y+player.h>enemy.y) {
    if (player.shielding) { sfxDeflect(); }
    else { player.hp-=0.3; player.invincible=18; if(player.hp<=0) playerDied(); }
  }
}

function updateMeleeAI() {
  const dx=player.x-enemy.x;
  enemy.moveDir=dx>0?1:-1;
  enemy.x+=enemy.moveDir*enemy.speed;
  enemy.actionTimer--;
  // Only jump sometimes, not constantly
  if (enemy.actionTimer<=0&&enemy.onGround&&Math.abs(dx)<220) {
    enemy.vy=-10; enemy.onGround=false;
    enemy.actionTimer=100+Math.random()*80; // longer cooldown
  }
}

function updateRangedAI() {
  const target=player.x>400?140:560;
  const dtx=target-enemy.x;
  if (Math.abs(dtx)>12) enemy.x+=(dtx>0?1:-1)*enemy.speed;

  const fpb=Math.round((60/levels[levelIndex].bpm)*60);
  // Only shoot every 2 beats instead of every beat
  if (frame%(fpb*2)===0) fireEnemyBullet();
}

function updateBossAI() {
  const pct=enemy.hp/enemy.maxHp;
  enemy.phase=pct>0.66?0:pct>0.33?1:2;
  const fpb=Math.round((60/levels[levelIndex].bpm)*60);

  if (enemy.phase===0) {
    enemy.actionTimer--;
    if (enemy.actionTimer<=0){enemy.moveDir*=-1;enemy.actionTimer=110;}
    enemy.x+=enemy.moveDir*enemy.speed;
    // Shoot every 3 beats
    if (frame%(fpb*3)===0) fireEnemyBullet();
  }
  if (enemy.phase===1) {
    enemy.actionTimer--;
    if (enemy.actionTimer<=0){enemy.moveDir*=-1;enemy.actionTimer=75;}
    enemy.x+=enemy.moveDir*(enemy.speed*1.3);
    // Spread every 4 beats
    if (frame%(fpb*4)===0) fireBossSpread();
  }
  if (enemy.phase===2) {
    enemy.x+=enemy.moveDir*(enemy.speed*1.5);
    if (enemy.x<80||enemy.x>W-130) enemy.moveDir*=-1;
    // Wave every 2.5 beats
    if (frame%(Math.round(fpb*2.5))===0) fireBossWave();
  }
}

// ══════════════════════════════════════════════════════════════
//  DRAW: BACKGROUNDS (unchanged from Phase 2)
// ══════════════════════════════════════════════════════════════
function beatPulse() {
  const bpm=levels[levelIndex].bpm;
  const fpb=Math.round((60/bpm)*60);
  const phase=frame%fpb;
  if (phase===0&&frame!==lastBeatFrame){lastBeatFrame=frame;sfxBeat();}
  return Math.max(0,1-phase/(fpb*0.25));
}

function drawBackground() {
  const lvl=levels[levelIndex], pulse=beatPulse();
  const skyGrad=ctx.createLinearGradient(0,0,0,GROUND);
  skyGrad.addColorStop(0,lvl.skyTop); skyGrad.addColorStop(1,lvl.skyBot);
  ctx.fillStyle=skyGrad; ctx.fillRect(0,0,W,GROUND);
  if(levelIndex===0) drawCountryBG(pulse);
  if(levelIndex===1) drawEDMBG(pulse);
  if(levelIndex===2) drawRockBG(pulse);
  const fg=ctx.createLinearGradient(0,GROUND,0,H);
  fg.addColorStop(0,lvl.floorTop); fg.addColorStop(1,lvl.floorBot);
  ctx.fillStyle=fg; ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.save();
  ctx.shadowColor=lvl.accent;ctx.shadowBlur=6+pulse*18;
  ctx.strokeStyle=lvl.lineColor;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,GROUND);ctx.lineTo(W,GROUND);ctx.stroke();
  ctx.restore();
}

function drawCountryBG(pulse){
  ctx.fillStyle='#c46a20';
  ctx.beginPath();ctx.moveTo(0,GROUND);
  ctx.bezierCurveTo(100,260,200,220,320,270);
  ctx.bezierCurveTo(420,300,500,240,620,260);
  ctx.bezierCurveTo(700,275,760,290,800,GROUND);
  ctx.closePath();ctx.fill();
  const sp=1+pulse*0.08;
  ctx.save();ctx.translate(660,110);ctx.scale(sp,sp);
  ctx.fillStyle='#ffdd44';ctx.shadowColor='#ffaa00';ctx.shadowBlur=18+pulse*20;
  ctx.beginPath();ctx.arc(0,0,38,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#7a3a10';ctx.fillRect(50,280,140,120);ctx.fillRect(40,255,160,30);
  ctx.fillStyle='#3a1a00';ctx.fillRect(105,330,30,70);
  ctx.fillStyle='#ffcc66';ctx.fillRect(62,295,28,22);ctx.fillRect(115,295,28,22);
  ctx.fillStyle='#4a7a30';
  ctx.fillRect(700,320,18,80);ctx.fillRect(670,340,32,14);ctx.fillRect(718,335,32,14);
  ctx.fillRect(670,315,14,28);ctx.fillRect(726,310,14,28);
  ctx.fillStyle='#8b6a3e';
  for(let i=200;i<620;i+=55){ctx.fillRect(i,375,10,30);ctx.fillRect(i,385,55,5);}
}

function drawEDMBG(pulse){
  const cols=10,rows=3,tileW=W/cols,tileH=40;
  const colors=['#ff00ff','#00ffff','#ff6600','#00ff88','#ff0088','#8800ff'];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const ci=(c+r+Math.floor(frame/18))%colors.length;
      ctx.fillStyle=colors[ci];
      ctx.globalAlpha=0.18+(c%2===0?pulse*0.35:0);
      ctx.fillRect(c*tileW,GROUND-tileH*(r+1),tileW-2,tileH-2);
    }
  }
  ctx.globalAlpha=1;
  ['#ff00ff','#00ffff','#ff4400'].forEach((col,i)=>{
    const x=150+i*250+Math.sin(frame*0.03+i)*40;
    ctx.save();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.globalAlpha=0.4+pulse*0.4;
    ctx.shadowColor=col;ctx.shadowBlur=12;
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+60,GROUND);ctx.stroke();ctx.restore();
  });
  ctx.fillStyle='#1a1a2e';ctx.fillRect(30,200,60,200);ctx.fillRect(710,200,60,200);
  [220,270,320,370].forEach(y=>{
    ctx.fillStyle='#333';
    ctx.beginPath();ctx.arc(60,y,18,0,Math.PI*2);ctx.arc(740,y,18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#555';
    ctx.beginPath();ctx.arc(60,y,9,0,Math.PI*2);ctx.arc(740,y,9,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle='#220044';ctx.fillRect(320,330,160,70);
  ctx.fillStyle='#440088';ctx.fillRect(310,320,180,18);
  [345,375,405,435,465].forEach(x=>{
    ctx.fillStyle='#8800ff';ctx.beginPath();ctx.arc(x,315,5,0,Math.PI*2);ctx.fill();
  });
}

function drawRockBG(pulse){
  ctx.fillStyle='#1a0000';ctx.fillRect(0,0,130,GROUND);ctx.fillRect(670,0,130,GROUND);
  ctx.fillStyle='#2d0000';
  for(let x=10;x<120;x+=22)ctx.fillRect(x,0,10,GROUND);
  for(let x=680;x<790;x+=22)ctx.fillRect(x,0,10,GROUND);
  ['#ff2200','#ff6600','#ffaa00'].forEach((col,i)=>{
    const cx=200+i*200;
    ctx.save();ctx.globalAlpha=0.12+(i===1?pulse*0.2:0.05);
    const grad=ctx.createRadialGradient(cx,0,0,cx,GROUND,180);
    grad.addColorStop(0,col);grad.addColorStop(1,'transparent');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,GROUND);ctx.restore();
  });
  ctx.fillStyle='#111';
  [[80,290],[80,340],[80,390],[680,290],[680,340],[680,390]].forEach(([ax,ay])=>{
    ctx.fillRect(ax,ay,70,46);ctx.fillStyle='#222';ctx.fillRect(ax+4,ay+4,62,38);
    ctx.fillStyle='#444';ctx.beginPath();ctx.arc(ax+35,ay+23,15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';
  });
  ctx.fillStyle='#2b0000';
  ctx.beginPath();ctx.ellipse(400,GROUND-10,80,25,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#550000';ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(400,GROUND-5,45,20,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#440000';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(340,GROUND);ctx.lineTo(340,GROUND-50);ctx.stroke();
  ctx.beginPath();ctx.ellipse(340,GROUND-52,20,6,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#1a0000';
  for(let x=0;x<W;x+=28){
    const h=30+Math.sin(x*0.3+frame*0.04)*12;
    ctx.beginPath();ctx.arc(x+14,GROUND+25,10,0,Math.PI*2);ctx.fill();
    ctx.fillRect(x+6,GROUND+25,16,h);
  }
}

// ══════════════════════════════════════════════════════════════
//  DRAW: PLAYER
// ══════════════════════════════════════════════════════════════
function drawPlayer() {
  const p=player, bob=p.bobOffset, cx=p.x+p.w/2, f=p.facing;
  const squat=p.isCrouching?0.75:1;
  if (p.invincible>0&&Math.floor(frame/4)%2===0) return;

  ctx.save();
  ctx.translate(cx, p.y+p.h+bob);
  ctx.scale(f, squat);

  const legSwing=p.isWalking?Math.sin(p.walkFrame*Math.PI/2)*10:0;

  // Legs
  ctx.fillStyle='#4a5a6a';
  ctx.save();ctx.translate(-9,-16);ctx.rotate((legSwing*Math.PI)/180);
  ctx.fillRect(-6,0,12,22);ctx.fillStyle='#2a3a4a';ctx.fillRect(-7,20,13,8);ctx.restore();
  ctx.fillStyle='#4a5a6a';
  ctx.save();ctx.translate(9,-16);ctx.rotate((-legSwing*Math.PI)/180);
  ctx.fillRect(-6,0,12,22);ctx.fillStyle='#2a3a4a';ctx.fillRect(-6,20,13,8);ctx.restore();

  // Body
  ctx.fillStyle='#5a6a7a';
  ctx.beginPath();ctx.roundRect(-14,-40,28,26,4);ctx.fill();
  ctx.strokeStyle='#3a4a5a';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,-40);ctx.lineTo(0,-18);ctx.stroke();

  // Walkman
  ctx.fillStyle='#1a1a1a';ctx.fillRect(-8,-18,14,9);
  ctx.fillStyle='#444';ctx.fillRect(-6,-16,10,5);
  ctx.fillStyle='#888';
  ctx.beginPath();ctx.arc(-1,-13,2,0,Math.PI*2);ctx.arc(5,-13,2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#222';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(2,-18);ctx.bezierCurveTo(10,-30,14,-42,10,-52);ctx.stroke();

  // Head
  ctx.fillStyle='#b08878';
  ctx.beginPath();ctx.ellipse(0,-54,17,16,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#7a5848';ctx.lineWidth=2;ctx.stroke();

  // Hair
  ctx.fillStyle='#1e1208';
  ctx.beginPath();ctx.ellipse(0,-64,16,10,0,Math.PI,Math.PI*2);ctx.fill();
  ctx.beginPath();
  ctx.arc(-10,-66,5,0,Math.PI*2);ctx.arc(0,-68,5,0,Math.PI*2);ctx.arc(10,-66,5,0,Math.PI*2);
  ctx.fill();

  // Eyes
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.ellipse(-6,-54,5,6,-0.1,0,Math.PI*2);ctx.ellipse(7,-54,5,6,0.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a1a0a';
  ctx.beginPath();ctx.ellipse(-5,-53,3,4,0,0,Math.PI*2);ctx.ellipse(8,-53,3,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(-4,-55,1.2,0,Math.PI*2);ctx.arc(9,-55,1.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7a5848';
  ctx.beginPath();ctx.arc(1,-48,1.5,0,Math.PI*2);ctx.fill();

  // Headphones
  ctx.strokeStyle='#222';ctx.lineWidth=3.5;
  ctx.beginPath();ctx.arc(0,-60,19,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
  ctx.fillStyle='#333';
  ctx.beginPath();ctx.ellipse(-19,-56,7,9,-0.3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.ellipse(19,-56,7,9,0.3,0,Math.PI*2);ctx.fill();ctx.stroke();

  // Shield effect
  if (player.shielding) {
    const lvl=levels[levelIndex];
    const shimmer=Math.sin(frame*0.3)*0.2+0.7;
    ctx.strokeStyle=lvl.accent;
    ctx.lineWidth=3;
    ctx.globalAlpha=shimmer;
    ctx.shadowColor=lvl.accent;ctx.shadowBlur=20;
    ctx.beginPath();ctx.ellipse(0,-35,28,50,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=0.15;
    ctx.fillStyle=lvl.accent;
    ctx.beginPath();ctx.ellipse(0,-35,28,50,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  ctx.restore();

  // Shield cooldown indicator under player
  if (player.shieldCooldown>0) {
    const pct=1-player.shieldCooldown/SHIELD_COOLDOWN;
    ctx.fillStyle='#333';ctx.fillRect(player.x,player.y+player.h+8,player.w,4);
    ctx.fillStyle='#44aaff';ctx.fillRect(player.x,player.y+player.h+8,player.w*pct,4);
  }
}

// ══════════════════════════════════════════════════════════════
//  DRAW: ENEMIES
// ══════════════════════════════════════════════════════════════
function glowCircle(x,y,r,col){
  ctx.save();ctx.shadowColor=col;ctx.shadowBlur=14;
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawEnemy(){
  if(!enemy)return;
  const pulse=beatPulse();
  ctx.save();
  if(enemy.hp/enemy.maxHp<0.25&&Math.floor(frame/4)%2===0)ctx.globalAlpha=0.7;

  if(enemy.levelIndex===0){
    if(enemy.type===0) drawSoundSnake(pulse);
    if(enemy.type===1) drawBanjoSpecter(pulse);
    if(enemy.type===2) drawRobotCowboy(pulse);
  } else if(enemy.levelIndex===1){
    if(enemy.type===0) drawBassCrawler(pulse);
    if(enemy.type===1) drawStrobePhantom(pulse);
    if(enemy.type===2) drawDJMonster(pulse);
  } else {
    if(enemy.type===0) drawAmpGargoyle(pulse);
    if(enemy.type===1) drawRiffWraith(pulse);
    if(enemy.type===2) drawGuitarDemon(pulse);
  }
  ctx.restore();

  // HP bar — well above sprite
  const bx=enemy.x, by=enemy.y-32;
  ctx.fillStyle='#333';ctx.fillRect(bx,by,enemy.w,10);
  ctx.fillStyle='#ff3333';ctx.fillRect(bx,by,enemy.w*(enemy.hp/enemy.maxHp),10);
  ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(bx,by,enemy.w,10);

  // Phase pips for boss
  if(enemy.type===2){
    [0,1,2].forEach(i=>{
      ctx.fillStyle=i===enemy.phase?levels[levelIndex].accent:'#333';
      ctx.beginPath();ctx.arc(bx+enemy.w/2-16+i*16,by-10,4,0,Math.PI*2);ctx.fill();
    });
  }
}

// ── Country melee: Tumbleweed Rattler (sound snake) ───────────
function drawSoundSnake(pulse){
  const ex=enemy.x,ey=enemy.y;
  const slither=Math.sin(enemy.anim*0.14)*8;
  const segments=6;

  // Body segments — barbed wire + tumbleweed texture
  for(let i=segments;i>=0;i--){
    const sx=ex+i*14;
    const sy=ey+40+Math.sin(enemy.anim*0.14+i*0.7)*10;
    const r=10-i*0.8;
    // Tumbleweed body
    ctx.fillStyle=`hsl(30,${40+i*5}%,${25+i*3}%)`;
    ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
    // Barbed wire wrapping
    ctx.strokeStyle='#8a7050';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(sx,sy,r,enemy.anim*0.05+i,enemy.anim*0.05+i+Math.PI*1.5);ctx.stroke();
    // Barbs
    if(i%2===0){
      ctx.fillStyle='#aaa';
      ctx.beginPath();ctx.arc(sx+r*0.7,sy,2.5,0,Math.PI*2);ctx.fill();
    }
  }

  // Head
  const hx=ex-8+slither*0.3, hy=ey+38;
  ctx.fillStyle='#6a3a10';
  ctx.beginPath();ctx.ellipse(hx,hy,14,10,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#3a1a00';ctx.lineWidth=2;ctx.stroke();

  // Eyes — evil orange slits
  ctx.fillStyle='#ff8800';ctx.shadowColor='#ff6600';ctx.shadowBlur=8;
  ctx.beginPath();ctx.ellipse(hx-5,hy-2,3,4,0.3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(hx+5,hy-2,3,4,-0.3,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;

  // Forked tongue
  ctx.strokeStyle='#ff2200';ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(hx,hy+8);ctx.lineTo(hx,hy+18);
  ctx.moveTo(hx,hy+18);ctx.lineTo(hx-5,hy+26);
  ctx.moveTo(hx,hy+18);ctx.lineTo(hx+5,hy+26);
  ctx.stroke();

  // Rattle tail — speaker cone shape
  const tx=ex+segments*14+10, ty=ey+40;
  ctx.fillStyle='#888';
  ctx.beginPath();ctx.arc(tx,ty,8,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ff8800';ctx.lineWidth=1;
  [6,4,2].forEach(r=>{ctx.beginPath();ctx.arc(tx,ty,r,0,Math.PI*2);ctx.stroke();});
  // Rattle pulse on beat
  if(pulse>0.5){glowCircle(tx,ty,5,'#ff8800');}
}

// ── Country intermediate: Banjo Specter ───────────────────────
function drawBanjoSpecter(pulse){
  const ex=enemy.x,ey=enemy.y;
  const float=Math.sin(enemy.anim*0.08)*10;
  const bob=Math.sin(enemy.anim*0.12)*3;

  // Ghost body — translucent
  ctx.globalAlpha=0.82;

  // Cowboy hat
  ctx.fillStyle='#3a2008';
  ctx.fillRect(ex+4,ey-28+float,44,8);
  ctx.fillRect(ex+12,ey-46+float,28,20);
  ctx.fillStyle='#c8a000';ctx.fillRect(ex+4,ey-22+float,44,5); // hatband

  // Ghost head — pale green
  ctx.fillStyle='#c8e8c0';
  ctx.beginPath();ctx.ellipse(ex+26,ey-8+float,18,20,0,0,Math.PI*2);ctx.fill();
  // Hollow eyes
  ctx.fillStyle='#1a3a10';
  ctx.beginPath();
  ctx.ellipse(ex+18,ey-10+float,5,7,0,0,Math.PI*2);
  ctx.ellipse(ex+34,ey-10+float,5,7,0,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#88ff44';ctx.shadowColor='#44ff00';ctx.shadowBlur=8;
  ctx.beginPath();ctx.arc(ex+18,ey-10+float,3,0,Math.PI*2);ctx.arc(ex+34,ey-10+float,3,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;

  // Ghost body trail
  ctx.fillStyle='#a8d8a0';
  ctx.beginPath();
  ctx.moveTo(ex+8,ey+10+float);ctx.lineTo(ex+44,ey+10+float);
  ctx.lineTo(ex+48,ey+50+float);
  ctx.quadraticCurveTo(ex+36,ey+40+float,ex+26,ey+55+float);
  ctx.quadraticCurveTo(ex+16,ey+40+float,ex+4,ey+50+float);
  ctx.closePath();ctx.fill();

  // Banjo!
  const bAngle=Math.sin(enemy.anim*0.06)*0.15;
  ctx.save();ctx.translate(ex-10,ey+10+float);ctx.rotate(bAngle);
  // Banjo neck
  ctx.fillStyle='#6a3a00';ctx.fillRect(-4,-40,8,44);
  // Banjo head (round)
  ctx.fillStyle='#8b5020';
  ctx.beginPath();ctx.arc(0,-45,18,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#c8a000';ctx.lineWidth=2;ctx.stroke();
  // Strings
  ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.globalAlpha=0.9;
  [-6,-2,2,6].forEach(sx=>{ctx.beginPath();ctx.moveTo(sx,-60);ctx.lineTo(sx,4);ctx.stroke();});
  ctx.globalAlpha=0.82;
  // Sonic wave rings from banjo on beat
  if(pulse>0.4){
    ctx.strokeStyle='#88ff44';ctx.lineWidth=1.5;ctx.globalAlpha=pulse*0.6;
    [12,22,32].forEach(r=>{ctx.beginPath();ctx.arc(0,-45,r,0,Math.PI*2);ctx.stroke();});
    ctx.globalAlpha=0.82;
  }
  ctx.restore();

  ctx.globalAlpha=1;
}

// ── Country boss: Robot Cowboy (from Phase 3, kept) ───────────
function drawRobotCowboy(pulse){
  const ex=enemy.x,ey=enemy.y,bob=Math.sin(enemy.anim*0.08)*4,phase=enemy.phase;
  const ec=['#ffcc00','#ff8800','#ff4400'][phase];
  ctx.fillStyle='#4a2a08';
  ctx.beginPath();ctx.ellipse(ex+36,ey-24+bob,52,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#5a3410';ctx.fillRect(ex+8,ey-52+bob,56,30);
  ctx.fillStyle='#4a2a08';
  ctx.beginPath();ctx.ellipse(ex+36,ey-52+bob,28,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8b4010';ctx.fillRect(ex+8,ey-26+bob,56,6);
  ctx.fillStyle='#c8a000';ctx.beginPath();ctx.arc(ex+36,ey-23+bob,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7a6040';
  ctx.beginPath();ctx.roundRect(ex+6,ey-22+bob,60,46,6);ctx.fill();
  ctx.strokeStyle='#5a4020';ctx.lineWidth=2;ctx.stroke();
  glowCircle(ex+22,ey-2+bob,9,ec);glowCircle(ex+50,ey-2+bob,9,ec);
  ctx.fillStyle='#2a1a00';ctx.fillRect(ex+16,ey+16+bob,40,10);
  for(let i=0;i<5;i++){ctx.fillStyle=ec;ctx.fillRect(ex+18+i*7,ey+18+bob,4,6);}
  ctx.strokeStyle='#3a2000';ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(ex+16,ey+14+bob);ctx.quadraticCurveTo(ex+22,ey+20+bob,ex+28,ey+14+bob);
  ctx.moveTo(ex+44,ey+14+bob);ctx.quadraticCurveTo(ex+50,ey+20+bob,ex+56,ey+14+bob);
  ctx.stroke();
  ctx.fillStyle='#6a4020';
  ctx.beginPath();ctx.ellipse(ex-10,ey+30+bob,20,14,-0.3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(ex+82,ey+30+bob,20,14,0.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7a5030';ctx.fillRect(ex+4,ey+24+bob,64,40);
  ctx.fillStyle='#1a0800';ctx.beginPath();ctx.arc(ex+36,ey+44+bob,18,0,Math.PI*2);ctx.fill();
  [18,12,6].forEach((r,i)=>{
    ctx.strokeStyle=i===0?'#3a2000':ec;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(ex+36,ey+44+bob,r,0,Math.PI*2);ctx.stroke();
  });
  if(pulse>0.5)glowCircle(ex+36,ey+44+bob,8,ec);
  ctx.fillStyle='#6a4020';ctx.fillRect(ex-22,ey+28+bob,16,36);ctx.fillRect(ex+78,ey+28+bob,16,36);
  const ls=Math.sin(enemy.anim*0.07)*20;
  ctx.save();ctx.translate(ex+86,ey+56+bob);ctx.rotate((ls*Math.PI)/180);
  ctx.strokeStyle='#c8a050';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,14);ctx.lineTo(0,30);ctx.stroke();ctx.restore();
  ctx.fillStyle='#4a2a00';ctx.fillRect(ex+12,ey+62+bob,16,20);ctx.fillRect(ex+44,ey+62+bob,16,20);
  ctx.fillStyle='#3a1a00';
  ctx.beginPath();ctx.moveTo(ex+6,ey+80+bob);ctx.lineTo(ex+32,ey+80+bob);ctx.lineTo(ex+36,ey+88+bob);ctx.lineTo(ex+4,ey+88+bob);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(ex+40,ey+80+bob);ctx.lineTo(ex+66,ey+80+bob);ctx.lineTo(ex+70,ey+88+bob);ctx.lineTo(ex+38,ey+88+bob);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c8a000';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(ex+6,ey+87+bob,6,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(ex+68,ey+87+bob,6,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#c8a000';ctx.fillRect(ex+26,ey+62+bob,20,14);
  ctx.strokeStyle='#8b6000';ctx.lineWidth=2;ctx.strokeRect(ex+26,ey+62+bob,20,14);
  ctx.fillStyle='#8b6000';ctx.font='bold 7px monospace';ctx.textAlign='center';
  ctx.fillText('RR',ex+36,ey+72+bob);ctx.textAlign='left';
}

// ── EDM melee: Bass Crawler ───────────────────────────────────
function drawBassCrawler(pulse){
  const ex=enemy.x,ey=enemy.y+30; // low to ground
  const segments=7;
  const lvl=levels[1];

  for(let i=segments;i>=0;i--){
    const sx=ex+i*13;
    const sy=ey+Math.sin(enemy.anim*0.16+i*0.9)*6;
    const r=11-i*0.6;
    // Speaker cone body segment
    ctx.fillStyle=`hsl(280,${60+i*5}%,${15+i*3}%)`;
    ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#c800ff';ctx.lineWidth=1;
    ctx.shadowColor='#c800ff';ctx.shadowBlur=4+pulse*6;
    ctx.beginPath();ctx.arc(sx,sy,r*0.6,0,Math.PI*2);ctx.stroke();
    ctx.shadowBlur=0;
    // Legs — 2 per segment
    if(i%2===0){
      ctx.strokeStyle='#8800ff';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(sx,sy+r);ctx.lineTo(sx-8,sy+r+14);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx,sy+r);ctx.lineTo(sx+8,sy+r+14);ctx.stroke();
    }
  }

  // Head
  const hx=ex-10,hy=ey;
  ctx.fillStyle='#2a0a4a';
  ctx.beginPath();ctx.ellipse(hx,hy,16,12,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#c800ff';ctx.lineWidth=2;ctx.stroke();
  // Speaker mouth
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(hx,hy,8,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#c800ff';ctx.shadowColor='#c800ff';ctx.shadowBlur=8+pulse*12;
  [6,4,2].forEach(r=>{ctx.beginPath();ctx.arc(hx,hy,r,0,Math.PI*2);ctx.stroke();});
  ctx.shadowBlur=0;
  // Eyes
  glowCircle(hx-6,hy-4,3,'#00ffff');glowCircle(hx+6,hy-4,3,'#00ffff');
}

// ── EDM intermediate: Strobe Phantom ─────────────────────────
function drawStrobePhantom(pulse){
  const ex=enemy.x,ey=enemy.y;
  // Flicker effect
  const strobe=Math.sin(enemy.anim*0.4+frame*0.3)*0.3+0.7;
  ctx.globalAlpha=strobe;

  const float=Math.sin(enemy.anim*0.1)*15;

  // Ghost body — electric blue/white
  ctx.fillStyle='#a0c8ff';
  ctx.beginPath();
  ctx.moveTo(ex+10,ey+float);ctx.lineTo(ex+42,ey+float);
  ctx.lineTo(ex+48,ey+50+float);
  ctx.quadraticCurveTo(ex+38,ey+38+float,ex+26,ey+56+float);
  ctx.quadraticCurveTo(ex+14,ey+38+float,ex+4,ey+50+float);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#00ffff';ctx.lineWidth=2;
  ctx.shadowColor='#00ffff';ctx.shadowBlur=10+pulse*12;ctx.stroke();ctx.shadowBlur=0;

  // Head
  ctx.fillStyle='#d0e8ff';
  ctx.beginPath();ctx.ellipse(ex+26,ey-8+float,20,22,0,0,Math.PI*2);ctx.fill();

  // Visor — full face
  ctx.fillStyle='rgba(0,200,255,0.4)';
  ctx.beginPath();ctx.ellipse(ex+26,ey-8+float,16,14,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#00ffff';ctx.lineWidth=2;
  ctx.shadowColor='#00ffff';ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;

  // Laser eyes
  glowCircle(ex+18,ey-10+float,5,'#ff00ff');
  glowCircle(ex+34,ey-10+float,5,'#ff00ff');

  // Static/lightning arms
  ctx.strokeStyle='#00ffff';ctx.lineWidth=2;ctx.shadowColor='#00ffff';ctx.shadowBlur=8;
  // Left arm jagged
  ctx.beginPath();
  ctx.moveTo(ex+10,ey+15+float);
  ctx.lineTo(ex-8,ey+22+float);ctx.lineTo(ex-2,ey+30+float);ctx.lineTo(ex-14,ey+40+float);
  ctx.stroke();
  // Right arm jagged
  ctx.beginPath();
  ctx.moveTo(ex+42,ey+15+float);
  ctx.lineTo(ex+58,ey+22+float);ctx.lineTo(ex+50,ey+30+float);ctx.lineTo(ex+62,ey+40+float);
  ctx.stroke();
  ctx.shadowBlur=0;

  ctx.globalAlpha=1;
}

// ── EDM boss: DJ Monster (from Phase 3, kept) ─────────────────
function drawDJMonster(pulse){
  const ex=enemy.x,ey=enemy.y,bob=Math.sin(enemy.anim*0.09)*5,phase=enemy.phase;
  const mg=['#00ffcc','#ff8800','#ff00ff'][phase];
  ctx.fillStyle='#1a1a1a';
  ctx.fillRect(ex+4,ey-26+bob,64,10);ctx.fillRect(ex+12,ey-44+bob,50,20);ctx.fillRect(ex-8,ey-28+bob,20,6);
  ctx.fillStyle='#2a1a4a';
  ctx.beginPath();ctx.roundRect(ex+4,ey-16+bob,64,58,10);ctx.fill();
  ctx.strokeStyle=mg;ctx.lineWidth=2;ctx.shadowColor=mg;ctx.shadowBlur=8+pulse*12;ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle='#111';
  ctx.beginPath();ctx.moveTo(ex+8,ey+6+bob);ctx.lineTo(ex+36,ey+6+bob);ctx.lineTo(ex+22,ey+22+bob);ctx.closePath();
  ctx.moveTo(ex+38,ey+6+bob);ctx.lineTo(ex+66,ey+6+bob);ctx.lineTo(ex+50,ey+22+bob);ctx.closePath();ctx.fill();
  glowCircle(ex+22,ey+12+bob,5,mg);glowCircle(ex+50,ey+12+bob,5,mg);
  ctx.fillStyle=mg;ctx.shadowColor=mg;ctx.shadowBlur=16+pulse*20;
  ctx.beginPath();ctx.arc(ex+36,ey+35+bob,14,0,Math.PI);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#fff';for(let i=0;i<4;i++)ctx.fillRect(ex+24+i*7,ey+35+bob,5,8);
  ctx.fillStyle='#1a1a3a';ctx.fillRect(ex,ey+42+bob,72,40);
  ctx.fillStyle='#111';ctx.fillRect(ex+22,ey+58+bob,28,18);
  ctx.fillStyle='#2a1a4a';ctx.fillRect(ex-22,ey+44+bob,20,34);ctx.fillRect(ex+74,ey+44+bob,20,34);
  ctx.strokeStyle='#333';ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(ex+36,ey-16+bob,38,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
  ctx.fillStyle='#555';
  ctx.beginPath();ctx.ellipse(ex+0,ey-12+bob,11,14,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(ex+72,ey-12+bob,11,14,0,0,Math.PI*2);ctx.fill();
}

// ── Rock melee: Amp Gargoyle ──────────────────────────────────
function drawAmpGargoyle(pulse){
  const ex=enemy.x,ey=enemy.y;
  const bob=Math.sin(enemy.anim*0.15)*5;
  const wingFlap=Math.sin(enemy.anim*0.18)*20;

  // Wings — stone texture
  ctx.fillStyle='#3a3a4a';
  // Left wing
  ctx.save();ctx.translate(ex+10,ey+10+bob);ctx.rotate((-wingFlap*Math.PI)/180);
  ctx.beginPath();
  ctx.moveTo(0,0);ctx.lineTo(-50,-20);ctx.lineTo(-55,10);ctx.lineTo(-35,30);ctx.lineTo(-10,20);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#5a5a6a';ctx.lineWidth=1;ctx.stroke();
  // Wing membrane lines
  ctx.strokeStyle='#2a2a3a';ctx.lineWidth=1;
  [-40,-30,-20].forEach(wx=>{
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(wx,20);ctx.stroke();
  });
  ctx.restore();
  // Right wing
  ctx.save();ctx.translate(ex+40,ey+10+bob);ctx.rotate((wingFlap*Math.PI)/180);
  ctx.beginPath();
  ctx.moveTo(0,0);ctx.lineTo(50,-20);ctx.lineTo(55,10);ctx.lineTo(35,30);ctx.lineTo(10,20);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#5a5a6a';ctx.lineWidth=1;ctx.stroke();
  [40,30,20].forEach(wx=>{
    ctx.strokeStyle='#2a2a3a';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(wx,20);ctx.stroke();
  });
  ctx.restore();

  // Stone body
  ctx.fillStyle='#4a4a5a';
  ctx.beginPath();ctx.roundRect(ex+4,ey+8+bob,40,36,6);ctx.fill();
  ctx.strokeStyle='#6a6a7a';ctx.lineWidth=1.5;ctx.stroke();
  // Stone crack lines
  ctx.strokeStyle='#2a2a3a';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ex+14,ey+10+bob);ctx.lineTo(ex+18,ey+30+bob);ctx.lineTo(ex+26,ey+22+bob);ctx.stroke();

  // Speaker chest — the amp face
  ctx.fillStyle='#111';
  ctx.beginPath();ctx.arc(ex+24,ey+26+bob,14,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ff2200';ctx.shadowColor='#ff2200';ctx.shadowBlur=8+pulse*14;
  [12,8,4].forEach(r=>{ctx.beginPath();ctx.arc(ex+24,ey+26+bob,r,0,Math.PI*2);ctx.stroke();});
  ctx.shadowBlur=0;

  // Gargoyle head
  ctx.fillStyle='#4a4a5a';
  ctx.beginPath();ctx.roundRect(ex+8,ey-18+bob,32,28,4);ctx.fill();
  ctx.strokeStyle='#6a6a7a';ctx.lineWidth=1.5;ctx.stroke();

  // Stone horns
  ctx.fillStyle='#3a3a4a';
  ctx.beginPath();ctx.moveTo(ex+10,ey-16+bob);ctx.lineTo(ex+4,ey-38+bob);ctx.lineTo(ex+16,ey-16+bob);ctx.fill();
  ctx.beginPath();ctx.moveTo(ex+38,ey-16+bob);ctx.lineTo(ex+44,ey-38+bob);ctx.lineTo(ex+32,ey-16+bob);ctx.fill();

  // Glowing red eyes
  glowCircle(ex+16,ey-8+bob,5,'#ff2200');glowCircle(ex+32,ey-8+bob,5,'#ff2200');

  // Fang mouth
  ctx.fillStyle='#1a1a1a';ctx.fillRect(ex+12,ey+2+bob,24,10);
  ctx.fillStyle='#fff';
  [ex+14,ex+20,ex+26,ex+30].forEach(fx=>{ctx.fillRect(fx,ey+2+bob,4,8);});

  // Clawed feet
  ctx.fillStyle='#3a3a4a';
  ctx.fillRect(ex+6,ey+42+bob,14,10);ctx.fillRect(ex+28,ey+42+bob,14,10);
  ctx.fillStyle='#555';
  [-3,3,9].forEach(cx2=>{
    ctx.beginPath();ctx.moveTo(ex+8+cx2,ey+52+bob);ctx.lineTo(ex+6+cx2,ey+62+bob);ctx.lineTo(ex+12+cx2,ey+52+bob);ctx.fill();
    ctx.beginPath();ctx.moveTo(ex+30+cx2,ey+52+bob);ctx.lineTo(ex+28+cx2,ey+62+bob);ctx.lineTo(ex+34+cx2,ey+52+bob);ctx.fill();
  });
}

// ── Rock intermediate: Riff Wraith ────────────────────────────
function drawRiffWraith(pulse){
  const ex=enemy.x,ey=enemy.y;
  const float=Math.sin(enemy.anim*0.09)*12;
  const waver=Math.sin(enemy.anim*0.06);

  ctx.globalAlpha=0.88;

  // Shadow trail
  ctx.fillStyle='rgba(40,0,0,0.4)';
  for(let i=1;i<=4;i++){
    ctx.beginPath();
    ctx.ellipse(ex+24,ey+60+float+i*6,18-i*2,8-i,0,0,Math.PI*2);
    ctx.fill();
  }

  // Tattered robe body
  ctx.fillStyle='#1a0808';
  ctx.beginPath();
  ctx.moveTo(ex+4,ey+10+float);ctx.lineTo(ex+44,ey+10+float);
  ctx.lineTo(ex+52,ey+65+float);
  // Tattered hem
  for(let i=0;i<5;i++){
    const tx=ex+52-i*12, ty=ey+65+float;
    ctx.lineTo(tx-4,ty+12+Math.sin(enemy.anim*0.1+i)*6);
    ctx.lineTo(tx-8,ty);
  }
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#330000';ctx.lineWidth=1.5;ctx.stroke();

  // Guitar shape — fused into the wraith
  ctx.save();ctx.translate(ex+36,ey+28+float);ctx.rotate(waver*0.1);
  ctx.fillStyle='#2a0000';
  ctx.beginPath();ctx.ellipse(0,15,14,18,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(0,-5,10,14,0,0,Math.PI*2);ctx.fill();
  ctx.fillRect(-3,-30,6,32);
  ctx.strokeStyle='#ff2200';ctx.shadowColor='#ff2200';ctx.shadowBlur=10+pulse*14;
  ctx.lineWidth=1.5;
  [-4,-1,2,5].forEach(sx=>{ctx.beginPath();ctx.moveTo(sx,-30);ctx.lineTo(sx,20);ctx.stroke();});
  ctx.shadowBlur=0;ctx.restore();

  // Skull head
  ctx.fillStyle='#d8c8c0';
  ctx.beginPath();ctx.ellipse(ex+24,ey-10+float,18,20,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#8a5040';ctx.lineWidth=1.5;ctx.stroke();
  // Eye sockets — deep
  ctx.fillStyle='#1a0000';
  ctx.beginPath();ctx.ellipse(ex+16,ey-12+float,6,7,0,0,Math.PI*2);ctx.ellipse(ex+32,ey-12+float,6,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff2200';ctx.shadowColor='#ff0000';ctx.shadowBlur=10;
  ctx.beginPath();ctx.arc(ex+16,ey-12+float,3,0,Math.PI*2);ctx.arc(ex+32,ey-12+float,3,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  // Cracked jawbone
  ctx.strokeStyle='#d8c8c0';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(ex+10,ey+4+float);ctx.lineTo(ex+20,ey+10+float);ctx.lineTo(ex+28,ey+8+float);ctx.lineTo(ex+38,ey+4+float);ctx.stroke();

  ctx.globalAlpha=1;
}

// ── Rock boss: Guitar Demon Lord (gargoyle redesign) ──────────
function drawGuitarDemon(pulse){
  const ex=enemy.x,ey=enemy.y;
  const bob=Math.sin(enemy.anim*0.07)*6,phase=enemy.phase;
  const fc=['#ff6600','#ff2200','#ff0066'][phase];
  const wingFlap=Math.sin(enemy.anim*0.08)*15;

  // Massive stone wings
  ctx.fillStyle='#2a1a1a';
  ctx.save();ctx.translate(ex+10,ey+20+bob);ctx.rotate((-wingFlap*Math.PI)/180);
  ctx.beginPath();
  ctx.moveTo(0,0);ctx.lineTo(-80,-40);ctx.lineTo(-90,0);ctx.lineTo(-60,40);ctx.lineTo(-10,30);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle=fc;ctx.lineWidth=1;ctx.shadowColor=fc;ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0;
  [-60,-40,-20].forEach(wx=>{
    ctx.strokeStyle='#1a0808';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(wx,28);ctx.stroke();
  });
  ctx.restore();
  ctx.save();ctx.translate(ex+62,ey+20+bob);ctx.rotate((wingFlap*Math.PI)/180);
  ctx.beginPath();
  ctx.moveTo(0,0);ctx.lineTo(80,-40);ctx.lineTo(90,0);ctx.lineTo(60,40);ctx.lineTo(10,30);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle=fc;ctx.lineWidth=1;ctx.shadowColor=fc;ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0;
  [60,40,20].forEach(wx=>{
    ctx.strokeStyle='#1a0808';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(wx,28);ctx.stroke();
  });
  ctx.restore();

  // Stone horns
  ctx.fillStyle='#2a1a1a';
  ctx.beginPath();ctx.moveTo(ex+8,ey-18+bob);ctx.lineTo(ex-26,ey-72+bob);ctx.lineTo(ex+14,ey-28+bob);ctx.fill();
  ctx.beginPath();ctx.moveTo(ex+64,ey-18+bob);ctx.lineTo(ex+98,ey-72+bob);ctx.lineTo(ex+58,ey-28+bob);ctx.fill();
  ctx.strokeStyle=fc;ctx.lineWidth=2;ctx.shadowColor=fc;ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(ex+8,ey-18+bob);ctx.lineTo(ex-26,ey-72+bob);
  ctx.moveTo(ex+64,ey-18+bob);ctx.lineTo(ex+98,ey-72+bob);ctx.stroke();ctx.shadowBlur=0;

  // Stone gargoyle head
  ctx.fillStyle='#3a2828';
  ctx.beginPath();ctx.roundRect(ex+4,ey-22+bob,64,52,8);ctx.fill();
  ctx.strokeStyle='#5a3838';ctx.lineWidth=2;ctx.stroke();
  // Stone texture cracks
  ctx.strokeStyle='#2a1a1a';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ex+20,ey-20+bob);ctx.lineTo(ex+28,ey+6+bob);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ex+50,ey-18+bob);ctx.lineTo(ex+44,ey+8+bob);ctx.stroke();

  // Glowing fire eyes
  glowCircle(ex+18,ey+0+bob,10,fc);glowCircle(ex+54,ey+0+bob,10,fc);

  // Roaring stone mouth
  ctx.fillStyle='#1a0000';
  ctx.beginPath();
  ctx.moveTo(ex+14,ey+22+bob);ctx.lineTo(ex+58,ey+22+bob);
  ctx.lineTo(ex+54,ey+32+bob);ctx.lineTo(ex+18,ey+32+bob);ctx.closePath();ctx.fill();
  ctx.fillStyle=fc;ctx.shadowColor=fc;ctx.shadowBlur=10+pulse*12;
  ctx.beginPath();ctx.arc(ex+36,ey+24+bob,8,0,Math.PI);ctx.fill();ctx.shadowBlur=0;
  // Stone fangs
  ctx.fillStyle='#c8c0b8';
  [ex+18,ex+26,ex+36,ex+46].forEach(fx=>{ctx.fillRect(fx,ey+22+bob,6,11);});

  // Massive stone body
  ctx.fillStyle='#3a2828';ctx.fillRect(ex,ey+30+bob,72,52);
  ctx.strokeStyle='#5a3838';ctx.lineWidth=1.5;ctx.stroke();
  // Chest rune
  ctx.strokeStyle=fc;ctx.lineWidth=2;ctx.shadowColor=fc;ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(ex+36,ey+38+bob);ctx.lineTo(ex+28,ey+50+bob);ctx.lineTo(ex+44,ey+50+bob);ctx.closePath();ctx.stroke();
  ctx.shadowBlur=0;

  // Fire guitar (big)
  const gs=Math.sin(enemy.anim*0.06)*14;
  ctx.save();ctx.translate(ex+8,ey+48+bob);ctx.rotate((gs*Math.PI)/180);
  ctx.fillStyle='#3a0000';
  ctx.beginPath();ctx.ellipse(-22,12,24,20,-0.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#5a0000';
  ctx.beginPath();ctx.ellipse(-22,-8,17,15,-0.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a0000';ctx.fillRect(-8,-52,9,56);
  ctx.shadowColor=fc;ctx.shadowBlur=18+pulse*24;ctx.strokeStyle=fc;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-26,2);ctx.bezierCurveTo(-44,-14,-20,-26,-26,-40);ctx.stroke();
  ctx.shadowBlur=0;
  // Strings
  ctx.strokeStyle='rgba(255,100,0,0.6)';ctx.lineWidth=1;
  [-5,-2,1,4].forEach(sx=>{ctx.beginPath();ctx.moveTo(sx,-52);ctx.lineTo(sx,10);ctx.stroke();});
  ctx.restore();

  // Clawed stone arms
  ctx.fillStyle='#3a2828';
  ctx.fillRect(ex-22,ey+32+bob,20,40);ctx.fillRect(ex+74,ey+32+bob,20,40);
  // Claws
  ctx.fillStyle='#2a1a1a';
  [0,7,14].forEach(ox=>{
    ctx.beginPath();ctx.moveTo(ex-22+ox,ey+70+bob);ctx.lineTo(ex-26+ox,ey+84+bob);ctx.lineTo(ex-18+ox,ey+70+bob);ctx.fill();
    ctx.beginPath();ctx.moveTo(ex+74+ox,ey+70+bob);ctx.lineTo(ex+70+ox,ey+84+bob);ctx.lineTo(ex+78+ox,ey+70+bob);ctx.fill();
  });

  // Stone legs
  ctx.fillStyle='#3a2828';ctx.fillRect(ex+8,ey+80+bob,20,18);ctx.fillRect(ex+44,ey+80+bob,20,18);
  // Talons
  ctx.fillStyle='#2a1a1a';
  [0,8,16].forEach(ox=>{
    ctx.beginPath();ctx.moveTo(ex+8+ox,ey+96+bob);ctx.lineTo(ex+4+ox,ey+108+bob);ctx.lineTo(ex+12+ox,ey+96+bob);ctx.fill();
    ctx.beginPath();ctx.moveTo(ex+44+ox,ey+96+bob);ctx.lineTo(ex+40+ox,ey+108+bob);ctx.lineTo(ex+48+ox,ey+96+bob);ctx.fill();
  });
}

// ── Enemy bullets ─────────────────────────────────────────────
function drawEnemyBullets(){
  const lvl=levels[levelIndex];
  enemyBullets.forEach(b=>{
    ctx.save();ctx.translate(b.x,b.y);
    ctx.shadowColor=b.kind==='deflected'?'#44aaff':lvl.accent;
    ctx.shadowBlur=10;
    if(b.kind==='single'){
      ctx.strokeStyle=lvl.accent;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
    } else if(b.kind==='spread'){
      ctx.fillStyle=lvl.accent;
      ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(7,0);ctx.lineTo(0,7);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();
    } else if(b.kind==='deflected'){
      ctx.fillStyle='#44aaff';
      ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();
    } else {
      ctx.fillStyle=lvl.accent;ctx.fillRect(-8,-4,16,8);
      ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(-8,-4,16,8);
    }
    ctx.restore();
  });
}

// ── Player bullets ────────────────────────────────────────────
function drawBullets(){
  const lvl=levels[levelIndex];
  player.bullets.forEach(b=>{
    ctx.save();ctx.translate(b.x,b.y);
    ctx.fillStyle=lvl.accent;ctx.shadowColor=lvl.accent;ctx.shadowBlur=8;
    ctx.beginPath();ctx.ellipse(0,0,5,4,-0.4,0,Math.PI*2);ctx.fill();
    ctx.fillRect(4,-10,2,10);
    ctx.beginPath();ctx.moveTo(6,-10);ctx.quadraticCurveTo(14,-6,8,-2);ctx.fill();
    ctx.restore();
  });
}

// ══════════════════════════════════════════════════════════════
//  DRAW: HUD
// ══════════════════════════════════════════════════════════════
function drawHUD(){
  const lvl=levels[levelIndex];
  const bName=battleNames[levelIndex][battleIndex]||'';

  // Player HP
  ctx.fillStyle='#222';ctx.fillRect(20,18,180,14);
  ctx.fillStyle='#44dd66';ctx.fillRect(20,18,180*(player.hp/player.maxHp),14);
  ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(20,18,180,14);
  ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText('HP',22,30);

  // Battle label
  ctx.fillStyle=lvl.accent;ctx.font='bold 14px monospace';ctx.textAlign='center';
  ctx.shadowColor=lvl.accent;ctx.shadowBlur=8;
  ctx.fillText(bName,W/2,30);ctx.shadowBlur=0;ctx.textAlign='left';

  // Tokens
  ctx.font='14px monospace';ctx.fillStyle='#fff';
  ctx.fillText(tokens.join(' ')||'',20,52);

  // Battle dots
  ctx.textAlign='center';
  for(let i=0;i<3;i++){
    ctx.fillStyle=i<battleIndex?lvl.accent:i===battleIndex?'#fff':'#555';
    ctx.beginPath();ctx.arc(W/2-20+i*20,46,5,0,Math.PI*2);ctx.fill();
  }

  // Shield indicator
  ctx.textAlign='left';
  ctx.fillStyle='#888';ctx.font='10px monospace';
  ctx.fillText('[Z] SHIELD'+(player.shieldCooldown>0?' (recharging)':''),W-120,H-10);

  // Now playing bar
  if(nowPlaying){
    const lvlNP=levels[nowPlaying.song.levelIndex];
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.beginPath();ctx.roundRect(10,H-48,280,36,8);ctx.fill();
    ctx.strokeStyle=lvlNP.accent;ctx.lineWidth=1.5;
    ctx.shadowColor=lvlNP.accent;ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0;
    // Vinyl dot
    ctx.fillStyle=lvlNP.accent;ctx.beginPath();ctx.arc(28,H-30,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(28,H-30,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 10px monospace';
    ctx.fillText(nowPlaying.song.title.slice(0,28),44,H-34);
    ctx.fillStyle='#aaa';ctx.font='9px monospace';
    ctx.fillText(nowPlaying.song.artist,44,H-20);
  }
}

// ══════════════════════════════════════════════════════════════
//  DRAW: SONG NOTIFICATION
// ══════════════════════════════════════════════════════════════
function drawSongNotif(){
  if(!songNotif)return;
  songNotif.timer--;
  if(songNotif.timer<=0){songNotif=null;return;}
  const s=songNotif.song,lvl=levels[s.levelIndex];
  const alpha=songNotif.timer<40?songNotif.timer/40:songNotif.timer>260?(300-songNotif.timer)/40:1;
  const bx=W-310,by=70,bw=290,bh=70;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.fillStyle='#111';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,10);ctx.fill();
  ctx.strokeStyle=lvl.accent;ctx.lineWidth=2;ctx.shadowColor=lvl.accent;ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;
  const ax=bx+10,ay=by+10,as_=50;
  ctx.fillStyle=lvl.albumColors[0];ctx.fillRect(ax,ay,as_,as_);
  ctx.strokeStyle=lvl.albumColors[1];ctx.lineWidth=2;
  [20,14,8,4].forEach(r=>{ctx.beginPath();ctx.arc(ax+as_/2,ay+as_/2,r,0,Math.PI*2);ctx.stroke();});
  ctx.fillStyle=lvl.albumColors[2];ctx.beginPath();ctx.arc(ax+as_/2,ay+as_/2,4,0,Math.PI*2);ctx.fill();
  ctx.font='14px serif';ctx.textAlign='center';ctx.fillText(lvl.tokenIcon,ax+as_/2,ay+as_/2-10);
  ctx.textAlign='left';
  ctx.fillStyle=lvl.accent;ctx.font='bold 11px monospace';ctx.fillText('♪ Song Unlocked!',bx+70,by+22);
  ctx.fillStyle='#fff';ctx.font='bold 12px monospace';
  ctx.fillText(s.title.length>22?s.title.slice(0,22)+'…':s.title,bx+70,by+40);
  ctx.fillStyle='#aaa';ctx.font='10px monospace';
  ctx.fillText(s.artist+' ('+s.year+')',bx+70,by+56);
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  DRAW: LIBRARY
// ══════════════════════════════════════════════════════════════
function drawLibrary(){
  ctx.fillStyle='rgba(0,0,0,0.92)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';ctx.font='bold 20px monospace';ctx.textAlign='center';
  ctx.fillText('📼  YOUR PLAYLIST',W/2,38);
  ctx.fillStyle='#555';ctx.font='11px monospace';
  ctx.fillText('SPACE or L to close',W/2,56);
  if(earnedSongs.length===0){
    ctx.fillStyle='#888';ctx.font='14px monospace';
    ctx.fillText('No songs yet — beat some enemies!',W/2,H/2);
    ctx.textAlign='left';return;
  }
  const rowH=62;
  earnedSongs.forEach((s,i)=>{
    const lvl=levels[s.levelIndex];
    const row=Math.floor(i/2),col=i%2;
    const x=30+col*385,y=70+row*rowH;
    ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.roundRect(x,y,360,rowH-6,8);ctx.fill();
    ctx.strokeStyle=lvl.accent;ctx.lineWidth=1.5;ctx.shadowColor=lvl.accent;ctx.shadowBlur=4;ctx.stroke();ctx.shadowBlur=0;
    const vx=x+8,vy=y+6,vs=46;
    ctx.fillStyle=lvl.albumColors[0];ctx.fillRect(vx,vy,vs,vs);
    ctx.strokeStyle=lvl.albumColors[1];ctx.lineWidth=2;
    [18,12,6].forEach(r=>{ctx.beginPath();ctx.arc(vx+vs/2,vy+vs/2,r,0,Math.PI*2);ctx.stroke();});
    ctx.fillStyle=lvl.albumColors[2];ctx.beginPath();ctx.arc(vx+vs/2,vy+vs/2,3,0,Math.PI*2);ctx.fill();
    ctx.font='13px serif';ctx.textAlign='center';ctx.fillText(lvl.tokenIcon,vx+vs/2,vy+vs/2-8);
    ctx.textAlign='left';
    ctx.fillStyle=lvl.accent;ctx.font='bold 10px monospace';ctx.fillText(lvl.name.toUpperCase(),x+64,y+18);
    ctx.fillStyle='#fff';ctx.font='bold 12px monospace';
    ctx.fillText(s.title.length>24?s.title.slice(0,24)+'…':s.title,x+64,y+34);
    ctx.fillStyle='#aaa';ctx.font='10px monospace';
    ctx.fillText(s.artist+' ('+s.year+')',x+64,y+50);

    // Play button
    const pbx=x+316,pby=y+14;
    ctx.fillStyle=lvl.accent;
    ctx.beginPath();ctx.roundRect(pbx,pby,36,24,6);ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 12px monospace';ctx.textAlign='center';
    ctx.fillText('▶',pbx+18,pby+17);
    ctx.textAlign='left';
  });
  ctx.textAlign='left';
}

// Library click handler for play buttons
canvas.addEventListener('click', e => {
  if(gameState!=='library') return;
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const rowH=62;
  earnedSongs.forEach((s,i)=>{
    const row=Math.floor(i/2),col=i%2;
    const x=30+col*385,y=70+row*rowH;
    const pbx=x+316,pby=y+14;
    if(mx>pbx&&mx<pbx+36&&my>pby&&my<pby+24){
      playDeezerSong(s.query, track=>{nowPlaying={track,song:s};});
    }
  });
});

// ══════════════════════════════════════════════════════════════
//  DRAW: KNOCKOUT SCREEN
// ══════════════════════════════════════════════════════════════
function drawKnockout(){
  knockoutTimer--;
  ctx.fillStyle='rgba(80,0,0,0.78)';ctx.fillRect(0,0,W,H);
  const pulse=Math.sin(frame*0.08)*0.15+1;
  ctx.save();ctx.translate(W/2,H/2-60);ctx.scale(pulse,pulse);
  ctx.fillStyle='#ff2200';ctx.font='bold 72px monospace';ctx.textAlign='center';
  ctx.shadowColor='#ff0000';ctx.shadowBlur=30;ctx.fillText('✖',0,0);ctx.restore();
  ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.font='bold 28px monospace';ctx.textAlign='center';
  ctx.fillText('KNOCKED OUT',W/2,H/2+10);
  ctx.fillStyle='#ff8888';ctx.font='16px monospace';
  ctx.fillText('Restarting this battle...',W/2,H/2+40);
  const bw=280,progress=knockoutTimer/180;
  ctx.fillStyle='#333';ctx.fillRect(W/2-bw/2,H/2+60,bw,12);
  ctx.fillStyle='#ff4444';ctx.fillRect(W/2-bw/2,H/2+60,bw*progress,12);
  ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(W/2-bw/2,H/2+60,bw,12);
  ctx.textAlign='left';
  if(knockoutTimer<=0) resetBattle();
}

// ══════════════════════════════════════════════════════════════
//  DRAW: WIN SCREEN
// ══════════════════════════════════════════════════════════════
function drawWinScreen(){
  ctx.fillStyle='rgba(0,0,0,0.88)';ctx.fillRect(0,0,W,H);
  const pulse=Math.sin(frame*0.06)*0.1+1;
  ctx.save();ctx.translate(W/2,110);ctx.scale(pulse,pulse);
  ctx.fillStyle='#ffdd00';ctx.font='bold 48px monospace';ctx.textAlign='center';
  ctx.shadowColor='#ffaa00';ctx.shadowBlur=24;ctx.fillText('YOU ESCAPED!',0,0);ctx.restore();ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.font='18px monospace';ctx.textAlign='center';
  ctx.fillText('All 3 Genre Tokens collected',W/2,175);
  ctx.fillText(tokens.join('  '),W/2,210);
  ctx.fillStyle='#aaa';ctx.font='13px monospace';
  ctx.fillText('Songs collected: '+earnedSongs.length,W/2,248);

  // Play again
  const bx=W/2-80,by=285;
  ctx.fillStyle='#ffdd00';ctx.beginPath();ctx.roundRect(bx,by,160,42,8);ctx.fill();
  ctx.fillStyle='#000';ctx.font='bold 16px monospace';ctx.fillText('PLAY AGAIN',W/2,by+28);

  // Back to home
  const hx=W/2-70,hy=345;
  ctx.fillStyle='#444';ctx.beginPath();ctx.roundRect(hx,hy,140,38,8);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.fillText('HOME',W/2,hy+26);

  ctx.textAlign='left';
  canvas.onclick=e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    if(mx>bx&&mx<bx+160&&my>by&&my<by+42){
      canvas.onclick=null;
      levelIndex=0;battleIndex=0;tokens=[];earnedSongs=[];
      poolIndices=[[0,0],[0,0],[0,0]];
      shufflePools();
      resetBattle();gameState='levelIntro';levelIntroAge=0;
    }
    if(mx>hx&&mx<hx+140&&my>hy&&my<hy+38){
      canvas.onclick=null;
      levelIndex=0;battleIndex=0;tokens=[];
      gameState='home';
    }
  };
}

// ══════════════════════════════════════════════════════════════
//  GAME STATE TRANSITIONS
// ══════════════════════════════════════════════════════════════
function battleWon(){
  awardSong(levelIndex,battleIndex);
  battleIndex++;
  const bName=battleNames[levelIndex][battleIndex-1];
  showTransition(`${bName} defeated!`);
}

function playerDied(){
  player.hp=0;
  gameState='knockout';
  knockoutTimer=180;
  sfxDeath();
  stopDeezerSong();
}

function resetBattle(){
  player.hp=100;player.x=120;player.y=GROUND-player.h;
  player.vy=0;player.vx=0;player.bullets=[];player.invincible=0;
  player.shielding=false;player.shieldCooldown=0;player.shieldDuration=0;
  enemy=buildEnemy();enemyBullets=[];
  gameState='playing';
}

function shufflePools(){
  // randomise which song from each pool we start on
  songPools.forEach((_,li)=>{
    [0,1,2].forEach(bi=>{
      poolIndices[li][bi]=Math.floor(Math.random()*songPools[li][bi].length);
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════════════════════════
function update(){
  frame++;

  // Background music tick
  bgMusicTimer++;
  const fpb=Math.round((60/levels[Math.min(levelIndex,2)].bpm)*60);
  if(bgMusicTimer%fpb===0&&gameState==='playing') tickBGMusic();

  // State machine
  switch(gameState){
    case 'intro':
      handleIntro(); break;
    case 'home':
      handleHomeInput(); break;
    case 'playing':
      handleInput();applyPhysics();updateBullets();updateEnemy();checkStomp();updatePlayerAnim();
      break;
    case 'knockout':
      applyPhysics(); break;
  }

  draw();
  requestAnimationFrame(update);
}

function handleIntro(){
  introPanelAge++;
  // Auto advance all panels except last; last needs space
  if(introPanel<introPanels.length-1&&introPanelAge>160){
    if(keys[' ']){keys[' ']=false;nextIntroPanel();}
  }
  if(introPanel===introPanels.length-1&&keys[' ']){
    keys[' ']=false;
    gameState='home';
  }
}

function nextIntroPanel(){
  introPanel++;
  introPanelAge=0;
}

function draw(){
  ctx.clearRect(0,0,W,H);

  switch(gameState){
    case 'intro':
      drawIntroPanel(); break;
    case 'home':
      drawHome(); break;
    case 'levelIntro':
      drawLevelIntro(); break;
    case 'battleTransition':
      drawTransition(); break;
    case 'library':
      drawBackground();drawLibrary(); break;
    case 'playing':
      drawBackground();
      if(enemy)drawEnemy();
      drawEnemyBullets();drawPlayer();drawBullets();drawHUD();drawSongNotif();
      break;
    case 'knockout':
      drawBackground();if(enemy)drawEnemy();drawPlayer();drawHUD();drawKnockout();
      break;
    case 'win':
      drawWinScreen(); break;
  }
}

function drawIntroPanel(){
  const panel=introPanels[introPanel];
  panel.draw(introPanelAge);

  // Text box at bottom
  const lines=panel.text.split('\n');
  const boxH=lines.length*26+24;
  ctx.fillStyle='rgba(0,0,0,0.78)';
  ctx.beginPath();ctx.roundRect(30,H-boxH-20,W-60,boxH,10);ctx.fill();
  ctx.strokeStyle='rgba(255,100,0,0.5)';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='16px monospace';ctx.textAlign='center';
  lines.forEach((line,i)=>ctx.fillText(line,W/2,H-boxH-4+i*26));

  // Advance prompt
  if(introPanelAge>80&&Math.floor(introPanelAge/25)%2===0){
    ctx.fillStyle='#aaa';ctx.font='12px monospace';
    ctx.fillText('SPACE to continue',W/2,H-8);
  }
  ctx.textAlign='left';
}

// ── Init ──────────────────────────────────────────────────────
shufflePools();
enemy=buildEnemy();
update();
