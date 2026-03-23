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

// ── PARTICLE CANVAS ───────────────────────────────
const canvas = document.getElementById('particleCanvas');
if (canvas) {
const ctx    = canvas.getContext('2d');

let mouse = { x: -9999, y: -9999 }; // in canvas-local coords (0-1)

function resizeCanvas() {
  const rect   = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.width;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) / rect.width;
  mouse.y = (e.clientY - rect.top)  / rect.height;
});
canvas.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

const N = 80;
const particles = Array.from({ length: N }, () => ({
  x:  Math.random(),
  y:  Math.random(),
  vx: (Math.random() - 0.5) * 0.0004,
  vy: (Math.random() - 0.5) * 0.0004,
  r:  Math.random() * 1.5 + 0.5,
}));

function drawParticles() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const REPEL_R = 0.18;
  const REPEL_F = 0.00008;

  particles.forEach(p => {
    // mouse repulsion
    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < REPEL_R && dist > 0) {
      const force = (REPEL_R - dist) / REPEL_R * REPEL_F;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }

    // dampen velocity
    p.vx *= 0.995;
    p.vy *= 0.995;

    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = 1;
    if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1;
    if (p.y > 1) p.y = 0;
  });

  // connections
  ctx.lineWidth = 0.5;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx   = (particles[i].x - particles[j].x) * W;
      const dy   = (particles[i].y - particles[j].y) * H;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90) {
        ctx.strokeStyle = `rgba(26,61,143,${(1 - dist / 90) * 0.18})`;
        ctx.beginPath();
        ctx.moveTo(particles[i].x * W, particles[i].y * H);
        ctx.lineTo(particles[j].x * W, particles[j].y * H);
        ctx.stroke();
      }
    }
  }

  // dots
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(26,61,143,0.45)';
    ctx.fill();
  });

  requestAnimationFrame(drawParticles);
}
drawParticles();
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
