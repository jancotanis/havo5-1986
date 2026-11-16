(() => {
  const INTERVAL = 5000;
  const isVideo = f => /\.(mov|mp4|m4v)$/i.test(f);
  const jaar = /^\d{4}$/.test(new URLSearchParams(location.search).get('jaar') || '')
    ? new URLSearchParams(location.search).get('jaar') : '2026';
  const show = document.getElementById('show');
  const thumbs = document.getElementById('thumbs');
  const ctr = document.getElementById('ctr');
  const playBtn = document.getElementById('play');
  document.getElementById('title').textContent = `Reünie ${jaar} · foto's`;
  document.title = `Reünie ${jaar} — HAVO 5 · 1986`;

  let files = [], slides = [], idx = 0, timer = null, playing = true;
  const url = f => `slideshow/${jaar}/${encodeURIComponent(f)}`;

  function load(i) {
    const el = slides[i];
    if (el && !el.getAttribute('src')) el.src = el.dataset.src;
  }

  function go(i) {
    if (!files.length) return;
    idx = (i + files.length) % files.length;
    load(idx);
    // alleen foto's vooraf laden, video's niet (te groot)
    [idx + 1, idx - 1].forEach(n => {
      const k = (n + files.length) % files.length;
      if (!isVideo(files[k])) load(k);
    });
    slides.forEach((s, n) => {
      s.classList.toggle('on', n === idx);
      if (s.tagName === 'VIDEO' && n !== idx) s.pause();
    });
    [...thumbs.children].forEach((t, n) => t.classList.toggle('on', n === idx));
    thumbs.children[idx].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    ctr.textContent = `${idx + 1} / ${files.length}`;
    const cur = slides[idx];
    if (cur.tagName === 'VIDEO') {
      clearInterval(timer);
      cur.currentTime = 0;
      cur.muted = false;
      // autoplay met geluid kan geblokkeerd worden: dan gedempt starten
      cur.play().catch(() => { cur.muted = true; cur.play().catch(() => {}); });
    } else restart();
  }

  function restart() {
    clearInterval(timer);
    if (playing && slides[idx]?.tagName !== 'VIDEO') timer = setInterval(() => go(idx + 1), INTERVAL);
  }
  function toggle() {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚ Pauze' : '▶ Afspelen';
    restart();
  }

  document.getElementById('prev').onclick = () => go(idx - 1);
  document.getElementById('next').onclick = () => go(idx + 1);
  playBtn.onclick = toggle;
  addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') go(idx - 1);
    else if (e.key === ' ' && slides[idx]?.tagName !== 'VIDEO') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape') location.href = 'index.html';
  });
  let sx = null;
  show.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
  show.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    sx = null;
  });

  fetch(`slideshow/${jaar}.json`)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(list => {
      files = list;
      if (!files.length) throw new Error('leeg');
      files.forEach((f, n) => {
        let el, t;
        if (isVideo(f)) {
          el = document.createElement('video');
          el.controls = true; el.playsInline = true; el.preload = 'metadata';
          el.addEventListener('ended', () => { if (playing) go(idx + 1); });
          t = document.createElement('div');
          t.className = 'vthumb';
          t.innerHTML = '<span>▶</span>';
        } else {
          el = document.createElement('img');
          el.alt = `Foto ${n + 1}`;
          t = document.createElement('img');
          t.src = url(f); t.loading = 'lazy'; t.alt = '';
        }
        el.dataset.src = url(f);
        show.appendChild(el); slides.push(el);
        t.onclick = () => go(n);
        thumbs.appendChild(t);
      });
      go(0);
    })
    .catch(() => {
      show.insertAdjacentHTML('beforeend', '<div class="empty">Nog geen foto\'s voor deze reünie.</div>');
      playBtn.hidden = true;
    });
})();
