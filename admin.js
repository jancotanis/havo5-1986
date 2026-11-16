(() => {
  const jaar = new URLSearchParams(location.search).get('jaar') === '1986' ? '1986' : '2026';
  // 2026 houdt de oude sleutel zodat eerder bewaard werk niet verloren gaat
  const KEY = jaar === '2026' ? 'havo5-people' : 'havo5-people-' + jaar;
  const MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  const wrap = document.getElementById('wrap');
  const img = document.getElementById('photo');
  img.src = `havo5-${jaar}.jpeg`;
  const jaarSel = document.getElementById('jaar');
  jaarSel.value = jaar;
  jaarSel.onchange = () => (location.search = '?jaar=' + jaarSel.value);
  const status = document.getElementById('status');
  const editor = document.getElementById('editor');
  const nameInput = document.getElementById('nameInput');
  let people = JSON.parse(localStorage.getItem(KEY) || '[]');
  let sel = -1;

  const setStatus = t => (status.textContent = t);
  const save = () => localStorage.setItem(KEY, JSON.stringify(people));
  const r2 = n => Math.round(n * 100) / 100;

  function render() {
    wrap.querySelectorAll('.box').forEach(b => b.remove());
    people.forEach((p, i) => {
      const b = document.createElement('div');
      b.className = 'box' + (p.name ? ' named' : '') + (i === sel ? ' sel' : '');
      Object.assign(b.style, { left: p.x + '%', top: p.y + '%', width: p.w + '%', height: p.h + '%' });
      const s = document.createElement('span');
      s.textContent = p.name || '#' + (i + 1);
      b.appendChild(s);
      b.addEventListener('mousedown', e => startDrag(e, i));
      b.addEventListener('wheel', e => resize(e, i), { passive: false });
      wrap.appendChild(b);
    });
    const named = people.filter(p => p.name).length;
    setStatus(`${people.length} kaders · ${named} met naam`);
  }

  function select(i) {
    sel = i;
    render();
    if (i < 0) { editor.style.display = 'none'; return; }
    editor.style.display = 'flex';
    nameInput.value = people[i].name || '';
    nameInput.focus();
    nameInput.select();
  }

  function startDrag(e, i) {
    e.preventDefault(); e.stopPropagation();
    const R = wrap.getBoundingClientRect();
    const p = people[i], sx = e.clientX, sy = e.clientY, ox = p.x, oy = p.y;
    let moved = false;
    const move = ev => {
      const dx = (ev.clientX - sx) / R.width * 100, dy = (ev.clientY - sy) / R.height * 100;
      if (Math.abs(dx) + Math.abs(dy) > 0.2) moved = true;
      p.x = r2(ox + dx); p.y = r2(oy + dy);
      const el = wrap.querySelectorAll('.box')[i];
      el.style.left = p.x + '%'; el.style.top = p.y + '%';
    };
    const up = () => {
      removeEventListener('mousemove', move); removeEventListener('mouseup', up);
      save(); select(i);
    };
    addEventListener('mousemove', move); addEventListener('mouseup', up);
  }

  function resize(e, i) {
    if (i !== sel) return;
    e.preventDefault();
    const p = people[i], f = e.deltaY < 0 ? 1.06 : 1 / 1.06;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    p.w = r2(p.w * f); p.h = r2(p.h * f);
    p.x = r2(cx - p.w / 2); p.y = r2(cy - p.h / 2);
    save(); render();
  }

  wrap.addEventListener('click', e => {
    if (e.target !== img) return;
    const R = img.getBoundingClientRect();
    const w = 4, h = w * R.width / R.height; // square in px
    const x = (e.clientX - R.left) / R.width * 100, y = (e.clientY - R.top) / R.height * 100;
    people.push({ name: '', x: r2(x - w / 2), y: r2(y - h / 2), w, h: r2(h) });
    save(); select(people.length - 1);
  });

  function commitName(next) {
    if (sel < 0) return;
    people[sel].name = nameInput.value.trim();
    save();
    if (next) {
      const n = people.findIndex((p, i) => i > sel && !p.name);
      select(n);
    } else select(-1);
  }
  document.getElementById('save').onclick = () => commitName(false);
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') commitName(true);
    if (e.key === 'Escape') select(-1);
  });
  document.getElementById('del').onclick = () => { people.splice(sel, 1); save(); select(-1); };
  addEventListener('keydown', e => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel >= 0 && document.activeElement !== nameInput) {
      people.splice(sel, 1); save(); select(-1);
    }
  });

  document.getElementById('detect').onclick = async () => {
    if (people.length && !confirm('Bestaande kaders vervangen door nieuwe detectie?')) return;
    try {
      setStatus('Modellen laden…');
      await faceapi.tf.ready();
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS);
      setStatus('Gezichten zoeken…');
      const src = new Image();
      src.src = img.src;
      await src.decode();
      const dets = await faceapi.detectAllFaces(src, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3, maxResults: 200 }));
      const W = src.naturalWidth, H = src.naturalHeight;
      people = dets.map(d => d.box)
        .sort((a, b) => (a.y - b.y) || (a.x - b.x))
        .map(b => ({ name: '', x: r2(b.x / W * 100), y: r2(b.y / H * 100), w: r2(b.width / W * 100), h: r2(b.height / H * 100) }));
      save(); select(-1);
    } catch (err) {
      console.error(err);
      setStatus('Detectie mislukt — voeg kaders handmatig toe (' + err.message + ')');
    }
  };

  document.getElementById('export').onclick = () => {
    const blob = new Blob([JSON.stringify({ image: `havo5-${jaar}.jpeg`, people }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `people-${jaar}.json`; a.click();
  };
  document.getElementById('import').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    people = JSON.parse(await f.text()).people || [];
    save(); select(-1);
  };
  document.getElementById('clear').onclick = () => {
    if (confirm('Alle kaders wissen?')) { people = []; save(); select(-1); }
  };

  // Start: bewaard werk, anders bestaande people.json van de server
  if (people.length) render();
  else fetch(`people-${jaar}.json`).then(r => r.json()).then(d => { people = d.people || []; render(); }).catch(render);
})();
