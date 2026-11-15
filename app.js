(() => {
  const stage = document.getElementById('stage');
  const photo = document.getElementById('photo');
  const spots = document.getElementById('hotspots');
  const lens = document.getElementById('lens');
  const lensImg = document.getElementById('lensImg');
  const lensName = document.getElementById('lensName');
  const list = document.getElementById('names');
  const search = document.getElementById('search');
  const count = document.getElementById('count');
  const ZOOM = 2.2;
  let people = [];
  let current = -1;

  const label = p => (p.name && p.name.trim()) || 'Onbekend';

  function show(i) {
    const p = people[i];
    if (!p) return hide();
    current = i;
    const W = stage.clientWidth, H = stage.clientHeight;
    // face box in px, padded so hair/chin fit
    const fw = p.w / 100 * W, fh = p.h / 100 * H;
    const cx = (p.x + p.w / 2) / 100 * W, cy = (p.y + p.h / 2) / 100 * H;
    const src = Math.max(fw, fh) * 1.6;          // source region diameter
    const size = Math.min(Math.max(src * ZOOM, 120), W * 0.4);
    const scale = size / src;
    lensImg.style.width = lensImg.style.height = size + 'px';
    lensImg.style.backgroundImage = `url("${photo.src}")`;
    lensImg.style.backgroundSize = `${W * scale}px ${H * scale}px`;
    lensImg.style.backgroundPosition = `${-(cx * scale - size / 2)}px ${-(cy * scale - size / 2)}px`;
    lensName.textContent = label(p);
    // keep lens inside stage
    const half = size / 2;
    const lx = Math.min(Math.max(cx, half + 8), W - half - 8);
    const ly = Math.min(Math.max(cy, half + 8), H - half - 50);
    lens.style.left = lx + 'px';
    lens.style.top = (ly + 20) + 'px';
    stage.classList.add('active');
    list.querySelectorAll('li').forEach(li => li.classList.toggle('on', +li.dataset.i === i));
  }

  function hide() {
    current = -1;
    stage.classList.remove('active');
    list.querySelectorAll('li.on').forEach(li => li.classList.remove('on'));
  }

  function render() {
    spots.innerHTML = '';
    people.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'hotspot';
      b.setAttribute('aria-label', label(p));
      Object.assign(b.style, { left: p.x + '%', top: p.y + '%', width: p.w + '%', height: p.h + '%' });
      b.addEventListener('mouseenter', () => show(i));
      b.addEventListener('focus', () => show(i));
      b.addEventListener('click', e => { e.stopPropagation(); current === i ? hide() : show(i); });
      spots.appendChild(b);
    });
    renderList();
  }

  function renderList() {
    const q = search.value.trim().toLowerCase();
    const items = people.map((p, i) => ({ i, n: label(p) }))
      .filter(o => o.n.toLowerCase().includes(q))
      .sort((a, b) => a.n.localeCompare(b.n, 'nl'));
    list.innerHTML = '';
    items.forEach(o => {
      const li = document.createElement('li');
      li.textContent = o.n;
      li.dataset.i = o.i;
      li.addEventListener('mouseenter', () => show(o.i));
      li.addEventListener('click', () => {
        show(o.i);
        if (innerWidth <= 900) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      list.appendChild(li);
    });
    count.textContent = `${items.length} van ${people.length} personen`;
  }

  spots.addEventListener('mouseleave', hide);
  list.addEventListener('mouseleave', () => { if (innerWidth > 900) hide(); });
  stage.addEventListener('click', hide);
  search.addEventListener('input', renderList);
  addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  addEventListener('resize', () => { if (current >= 0) show(current); });

  const YEARS = { '2026': 'Reünie 2026 · groepsfoto', '1986': 'Klassenfoto 1986' };
  const jaar = YEARS[new URLSearchParams(location.search).get('jaar')] ? new URLSearchParams(location.search).get('jaar') : '2026';
  const other = jaar === '2026' ? '1986' : '2026';
  document.getElementById('eyebrow').textContent = YEARS[jaar];
  document.title = `${YEARS[jaar]} — HAVO 5 · 1986`;
  document.getElementById('navAlt').innerHTML = `<a href="foto.html?jaar=${other}">${YEARS[other]} →</a>`;
  photo.src = `havo5-${jaar}.jpeg`;
  photo.alt = YEARS[jaar];

  fetch(`people-${jaar}.json`)
    .then(r => r.json())
    .then(d => { people = d.people || []; render(); })
    .catch(err => console.error('people.json kon niet geladen worden:', err));
})();
