function buildCurve() {
  const track = document.querySelector('.track');
  const svg = document.querySelector('.track-svg');
  const bgPath = svg.querySelector('.bg-path');
  const fgPath = svg.querySelector('.fg-path');
  const features = [...document.querySelectorAll('.feature')];
  if (!track || features.length === 0) return;

  const trackRect = track.getBoundingClientRect();
  const W = track.clientWidth;
  const H = track.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.height = H + 'px';

  const points = [];
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  features.forEach((f) => {
    const rect = f.getBoundingClientRect();
    const cy = rect.top - trackRect.top + rect.height / 2;
    const reversed = f.classList.contains('reverse');
    let cx;
    if (isMobile) {
      cx = reversed ? W * 0.18 : W * 0.08;
    } else {
      cx = reversed ? W * 0.62 : W * 0.38;
    }
    points.push({ x: cx, y: cy });
  });
  points.unshift({ x: W * 0.5, y: 0 });
  points.push({ x: W * 0.5, y: H });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dy = p1.y - p0.y;
    const c1y = p0.y + dy * 0.5;
    const c2y = p1.y - dy * 0.5;
    d += ` C ${p0.x} ${c1y}, ${p1.x} ${c2y}, ${p1.x} ${p1.y}`;
  }

  bgPath.setAttribute('d', d);
  fgPath.setAttribute('d', d);

  const len = fgPath.getTotalLength();
  fgPath.style.strokeDasharray = len;
  fgPath.style.strokeDashoffset = len;
  updateDraw();
}

function updateDraw() {
  const fgPath = document.querySelector('.track-svg .fg-path');
  const track = document.querySelector('.track');
  if (!fgPath || !track) return;
  const r = track.getBoundingClientRect();
  const vh = window.innerHeight;
  const total = r.height + vh;
  const seen = Math.min(Math.max(vh - r.top, 0), total);
  const t = Math.min(Math.max(seen / total, 0), 1);
  const len = parseFloat(fgPath.style.strokeDasharray) || 0;
  fgPath.style.strokeDashoffset = len * (1 - t);
}

let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(buildCurve, 150);
});
window.addEventListener('scroll', updateDraw, { passive: true });

(function () {
  const form = document.querySelector('.signup');
  if (!form) return;
  const emailInput = form.querySelector('.signup-input');
  const buttons = form.querySelectorAll('.signup-btn');
  const msg = form.querySelector('.signup-msg');
  let pendingPlatform = null;

  buttons.forEach(b => {
    b.addEventListener('click', () => { pendingPlatform = b.dataset.platform; });
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const platform = pendingPlatform || 'ios';
    const email = (emailInput.value || '').trim();

    msg.textContent = '';
    msg.className = 'signup-msg';

    if (!email || !emailInput.checkValidity()) {
      msg.textContent = 'Please enter a valid email.';
      msg.classList.add('err');
      return;
    }

    const clicked = Array.from(buttons).find(b => b.dataset.platform === platform) || buttons[0];
    const originalLabel = clicked.innerHTML;
    buttons.forEach(b => b.disabled = true);
    clicked.innerHTML = '<span class="btn-spinner"></span>';

    try {
      const res = await fetch('https://claude-to-web-815886502786.europe-west1.run.app/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, platform })
      });
      const data = await res.json().catch(() => ({}));

      if (data && data.ok) {
        if (data.alreadyRegistered) {
          msg.textContent = "You're already on the list. We'll be in touch.";
        } else {
          msg.textContent = "You're in. We'll email you when testing opens.";
        }
        msg.classList.add('ok');
        emailInput.value = '';
      } else {
        msg.textContent = 'Something went wrong. Try again in a moment.';
        msg.classList.add('err');
      }
    } catch (err) {
      msg.textContent = 'Network error. Check your connection and retry.';
      msg.classList.add('err');
    } finally {
      clicked.innerHTML = originalLabel;
      buttons.forEach(b => b.disabled = false);
      pendingPlatform = null;
    }
  });
})();

// Recalculate after images load (their heights affect track height)
window.addEventListener('load', () => {
  setTimeout(buildCurve, 50);
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', () => buildCurve(), { once: true });
  });
});
