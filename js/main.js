// ── THEME TOGGLE ──────────────────────────────────
(function () {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.dataset.theme = saved;
})();

const themeToggle = document.getElementById('theme-toggle');

function updateToggleLabel() {
  if (!themeToggle) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.textContent = dark ? 'Light' : 'Dark';
}

updateToggleLabel();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    updateToggleLabel();
  });
}

/* ── PARTICLE CANVAS (commented out — kept for reference) ─────────────
const canvas_OLD = document.getElementById('particleCanvas');
if (canvas_OLD) {
  const ctx = canvas_OLD.getContext('2d');
  let mouse = { x: -9999, y: -9999 };
  function resizeCanvas() { const r = canvas_OLD.parentElement.getBoundingClientRect(); canvas_OLD.width = canvas_OLD.height = r.width; }
  resizeCanvas(); window.addEventListener('resize', resizeCanvas);
  canvas_OLD.addEventListener('mousemove', e => { const r = canvas_OLD.getBoundingClientRect(); mouse.x=(e.clientX-r.left)/r.width; mouse.y=(e.clientY-r.top)/r.height; });
  canvas_OLD.addEventListener('mouseleave', () => { mouse.x=-9999; mouse.y=-9999; });
  const N=80; const particles=Array.from({length:N},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-0.5)*0.0004,vy:(Math.random()-0.5)*0.0004,r:Math.random()*1.5+0.5}));
  function drawParticles(){const W=canvas_OLD.width,H=canvas_OLD.height;ctx.clearRect(0,0,W,H);particles.forEach(p=>{const dx=p.x-mouse.x,dy=p.y-mouse.y,d=Math.sqrt(dx*dx+dy*dy);if(d<0.18&&d>0){const f=(0.18-d)/0.18*0.00008;p.vx+=(dx/d)*f;p.vy+=(dy/d)*f;}p.vx*=0.995;p.vy*=0.995;p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=1;if(p.x>1)p.x=0;if(p.y<0)p.y=1;if(p.y>1)p.y=0;});for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const dx=(particles[i].x-particles[j].x)*W,dy=(particles[i].y-particles[j].y)*H,d=Math.sqrt(dx*dx+dy*dy);if(d<90){ctx.strokeStyle=`rgba(26,61,143,${(1-d/90)*0.18})`;ctx.beginPath();ctx.moveTo(particles[i].x*W,particles[i].y*H);ctx.lineTo(particles[j].x*W,particles[j].y*H);ctx.stroke();}}particles.forEach(p=>{ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.r,0,Math.PI*2);ctx.fillStyle='rgba(26,61,143,0.45)';ctx.fill();});requestAnimationFrame(drawParticles);}
  drawParticles();
}
─────────────────────────────────────────────────────────────────────── */

// ── WAVEFUNCTION CANVAS ────────────────────────────
// Coherent state of a quantum harmonic oscillator:
// ψ(x,t) = Gaussian envelope × oscillating phase
// Shows Re(ψ), Im(ψ), and |ψ|² evolving over time.
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect   = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.width;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Render at half resolution for performance, then scale up
  const STEP = 3;
  let startTime = null;
  let runningMax = 1;

  function drawWavefunction2D(timestamp) {
    if (!startTime) startTime = timestamp;
    const t = (timestamp - startTime) / 1000;

    const W = canvas.width, H = canvas.height;
    const dark = document.documentElement.dataset.theme === 'dark';

    // 3 point sources orbiting the centre at 120° apart
    // — superposition creates a rotating interference pattern
    const R     = 0.20;
    const speed = 0.30;
    const k     = 20;   // spatial wave number
    const omega = 3.5;  // temporal frequency

    const sources = [0, 1, 2].map(i => ({
      x: 0.5 + R * Math.cos(speed * t + i * 2.094),
      y: 0.5 + R * Math.sin(speed * t + i * 2.094),
    }));

    const imageData = ctx.createImageData(W, H);
    const d = imageData.data;

    // Background colour
    const bgR = dark ?  15 : 245;
    const bgG = dark ?  17 : 240;
    const bgB = dark ?  23 : 232;

    // High-intensity target colour
    const hiR = dark ? 140 :  26;
    const hiG = dark ? 190 :  61;
    const hiB = dark ? 255 : 143;

    // First pass — compute |ψ|² and track max
    const cols  = Math.ceil(W / STEP);
    const rows  = Math.ceil(H / STEP);
    const vals  = new Float32Array(cols * rows);
    let frameMax = 0;

    for (let row = 0; row < rows; row++) {
      const y = (row * STEP + STEP / 2) / H;
      for (let col = 0; col < cols; col++) {
        const x = (col * STEP + STEP / 2) / W;
        let re = 0, im = 0;
        for (const s of sources) {
          const dx = x - s.x, dy = y - s.y;
          const r  = Math.sqrt(dx * dx + dy * dy);
          if (r < 1e-4) continue;
          const amp   = 1 / (0.3 + r * 1.8);
          const phase = k * r - omega * t;
          re += amp * Math.cos(phase);
          im += amp * Math.sin(phase);
        }
        const prob = re * re + im * im;
        vals[row * cols + col] = prob;
        if (prob > frameMax) frameMax = prob;
      }
    }

    // Smooth the running max so colours stay stable
    runningMax += (frameMax - runningMax) * 0.05;

    // Second pass — colorise pixels
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Gamma-correct for more visible mid-tones
        const n = Math.pow(vals[row * cols + col] / runningMax, 0.55);

        const r = Math.round(bgR + n * (hiR - bgR));
        const g = Math.round(bgG + n * (hiG - bgG));
        const b = Math.round(bgB + n * (hiB - bgB));

        // Fill STEP×STEP block
        for (let dy = 0; dy < STEP; dy++) {
          const py = row * STEP + dy;
          if (py >= H) break;
          for (let dx = 0; dx < STEP; dx++) {
            const px = col * STEP + dx;
            if (px >= W) break;
            const idx = (py * W + px) * 4;
            d[idx]     = r;
            d[idx + 1] = g;
            d[idx + 2] = b;
            d[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Label
    const fs = Math.max(9, W * 0.028);
    ctx.font = `${fs}px 'Space Mono', monospace`;
    ctx.fillStyle = dark ? 'rgba(140,190,255,0.45)' : 'rgba(26,61,143,0.30)';
    ctx.fillText('|ψ(x,y,t)|²', W * 0.04, H * 0.07);

    requestAnimationFrame(drawWavefunction2D);
  }

  requestAnimationFrame(drawWavefunction2D);
} // end canvas guard

// ── READING PROGRESS BAR ──────────────────────────
const progressBar = document.getElementById('progress-bar');

function updateProgress() {
  const scrollTop  = window.scrollY;
  const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
  const pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });

// ── HERO PARALLAX ON SCROLL ───────────────────────
const heroLeft = document.querySelector('.hero-left');

function onScroll() {
  updateProgress();
  if (!heroLeft) return;
  const y = window.scrollY;
  heroLeft.style.transform = `translateY(${y * 0.12}px)`;
}
window.addEventListener('scroll', onScroll, { passive: true });

// ── MAGNETIC BUTTONS ──────────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const dx   = e.clientX - (rect.left + rect.width  / 2);
    const dy   = e.clientY - (rect.top  + rect.height / 2);
    btn.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
    btn.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, color 0.2s';
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transition = 'transform 0.1s ease, background 0.2s, color 0.2s';
  });
});

// ── NAV BURGER ────────────────────────────────────
const burger   = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ── ACTIVE NAV LINK ───────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

const activeObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  },
  { rootMargin: '-35% 0px -60% 0px' }
);
sections.forEach(s => activeObserver.observe(s));

// ── SCROLL REVEAL ─────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const siblings = entry.target.parentElement.querySelectorAll('.reveal');
        const idx = Array.from(siblings).indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('visible'), idx * 100);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── EDUCATION ROW HIGHLIGHT ───────────────────────
document.querySelectorAll('.edu-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    item.style.transition = 'background 0.2s, padding-left 0.25s';
    item.style.background  = 'rgba(26,61,143,0.03)';
    item.style.paddingLeft = '1rem';
  });
  item.addEventListener('mouseleave', () => {
    item.style.background  = '';
    item.style.paddingLeft = '';
  });
});

// ── PROJECT ROW HIGHLIGHT ─────────────────────────
document.querySelectorAll('.project-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    item.style.transition = 'background 0.2s';
    item.style.background = 'rgba(200,57,43,0.03)';
  });
  item.addEventListener('mouseleave', () => {
    item.style.background = '';
  });
});
