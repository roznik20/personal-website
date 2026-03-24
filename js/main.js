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

  // Mouse state
  let mouseNX = 0.5, mouseNY = 0.5; // normalised position
  let mousePresence = 0;             // 0→1, fades in/out smoothly

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseNX = (e.clientX - rect.left) / rect.width;
    mouseNY = (e.clientY - rect.top)  / rect.height;
    mousePresence = Math.min(1, mousePresence + 0.12);
  });
  canvas.addEventListener('mouseleave', () => { mousePresence = 0; });

  let startTime = null;

  function drawWavefunction(timestamp) {
    if (!startTime) startTime = timestamp;
    const t = (timestamp - startTime) / 1000;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const dark = document.documentElement.dataset.theme === 'dark';
    const rgb  = dark ? '140,190,255' : '26,61,143';

    // ── Main coherent state (harmonic oscillator)
    const omega = 0.65;
    const alpha = 0.30;
    const x0    = 0.5 + alpha * Math.cos(omega * t);
    const p0    = -alpha * omega * Math.sin(omega * t);
    const sigma = 0.09;
    const k0    = p0 * 42;
    const drift = t * 1.2;

    // ── Cursor wave packet
    // x position = mouse x, momentum = mapped from mouse y (top → high k)
    const k_mouse = (0.5 - mouseNY) * 80;
    const sigma_m = 0.07;

    const N   = 500;
    const yC  = H * 0.54;
    const amp = H * 0.34;

    const reP = [], imP = [], pTop = [], pBot = [];

    for (let i = 0; i <= N; i++) {
      const x = i / N;

      // Main packet
      const dx  = x - x0;
      const env = Math.exp(-dx * dx / (2 * sigma * sigma));
      let re    = env * Math.cos(k0 * dx - drift);
      let im    = env * Math.sin(k0 * dx - drift);

      // Mouse packet — fades in with mousePresence
      if (mousePresence > 0) {
        const dm   = x - mouseNX;
        const envm = mousePresence * 0.65 * Math.exp(-dm * dm / (2 * sigma_m * sigma_m));
        re += envm * Math.cos(k_mouse * dm);
        im += envm * Math.sin(k_mouse * dm);
      }

      const pr = re * re + im * im;
      const px = x * W;
      reP.push( [px, yC - re * amp] );
      imP.push( [px, yC - im * amp] );
      pTop.push([px, yC - pr * amp * 0.88]);
      pBot.push([px, yC + pr * amp * 0.88]);
    }

    const path = pts => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    };

    // |ψ|² fill
    ctx.beginPath();
    pTop.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    for (let i = pBot.length - 1; i >= 0; i--) ctx.lineTo(...pBot[i]);
    ctx.closePath();
    ctx.fillStyle = `rgba(${rgb},${dark ? 0.10 : 0.06})`;
    ctx.fill();

    // |ψ|² outline
    path(pTop);
    ctx.strokeStyle = `rgba(${rgb},${dark ? 0.28 : 0.14})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Im(ψ) — dashed
    ctx.setLineDash([3, 6]);
    path(imP);
    ctx.strokeStyle = `rgba(${rgb},${dark ? 0.42 : 0.22})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Re(ψ) — solid
    path(reP);
    ctx.strokeStyle = `rgba(${rgb},${dark ? 0.88 : 0.62})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Baseline
    ctx.beginPath();
    ctx.moveTo(0, yC); ctx.lineTo(W, yC);
    ctx.strokeStyle = dark ? 'rgba(232,224,208,0.07)' : 'rgba(14,17,23,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cursor position marker
    if (mousePresence > 0) {
      const cx = mouseNX * W;
      ctx.beginPath();
      ctx.moveTo(cx, yC - amp * 0.12);
      ctx.lineTo(cx, yC + amp * 0.12);
      ctx.strokeStyle = `rgba(${rgb},${mousePresence * (dark ? 0.35 : 0.20)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Labels
    const fs = Math.max(10, W * 0.030);
    ctx.font = `${fs}px 'Space Mono', monospace`;
    ctx.fillStyle = `rgba(${rgb},${dark ? 0.65 : 0.45})`;
    ctx.fillText('Re(ψ)', W * 0.04, H * 0.08);
    ctx.fillStyle = `rgba(${rgb},${dark ? 0.40 : 0.25})`;
    ctx.fillText('Im(ψ)', W * 0.04, H * 0.14);
    ctx.fillStyle = `rgba(${rgb},${dark ? 0.25 : 0.15})`;
    ctx.fillText('|ψ|²',  W * 0.04, H * 0.20);

    requestAnimationFrame(drawWavefunction);
  }

  requestAnimationFrame(drawWavefunction);
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
