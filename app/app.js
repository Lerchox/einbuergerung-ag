(function () {
  'use strict';
  const D = window.APP_DATA;
  const app = document.getElementById('app');
  const timerEl = document.getElementById('timer');
  const L = ['A', 'B', 'C', 'D', 'E', 'F'];
  const byId = {};
  D.chapters.forEach(c => c.questions.forEach(q => { byId[q.id] = q; q.chapter = c.id; }));

  // ---------- Speicher (nur lokal im Browser) ----------
  const APP_VERSION = '6 (14.11.2026)';
  // Mehrere Personen (Profile) auf demselben Gerät: jede Person hat ihren eigenen Fortschritt.
  const OLD_KEY = 'einb-ag-v1', PKEY = 'einb-ag-profiles', pKey = id => 'einb-ag-p-' + id;
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ohne Speicher weiter */ } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* egal */ } };
  const blank = () => ({ stats: {}, esAlways: false, exams: [], pos: {} });

  let profiles = lsGet(PKEY);
  if (!profiles || !profiles.list || !profiles.list.length) {
    profiles = { active: 'p1', list: [{ id: 'p1', name: 'Person 1' }] };
    const old = lsGet(OLD_KEY);              // bisherigen Fortschritt übernehmen
    if (old) { lsSet(pKey('p1'), old); lsDel(OLD_KEY); }
    lsSet(PKEY, profiles);
  }
  if (!profiles.list.some(p => p.id === profiles.active)) profiles.active = profiles.list[0].id;
  const activeProfile = () => profiles.list.find(p => p.id === profiles.active);
  let store = Object.assign(blank(), lsGet(pKey(profiles.active)) || {});
  function save() { lsSet(pKey(profiles.active), store); }
  function switchProfile(id) {
    profiles.active = id; lsSet(PKEY, profiles);
    store = Object.assign(blank(), lsGet(pKey(id)) || {});
  }
  function askName(def) {
    const n = (prompt('Name der Person:', def) || '').trim().slice(0, 30);
    return n || null;
  }
  function record(q, right) {
    const s = store.stats[q.id] || { r: 0, w: 0, last: null };
    right ? s.r++ : s.w++; s.last = right; store.stats[q.id] = s; save();
  }

  // ---------- Hilfsfunktionen ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const catName = k => D.cats[k][0];
  const catNameEs = k => D.cats[k][1];
  const chapter = id => D.chapters.find(c => c.id === id);
  const learned = qs => qs.filter(q => (store.stats[q.id] || {}).last === true).length;
  const wrongList = qs => qs.filter(q => (store.stats[q.id] || {}).last === false);
  // Status einer Frage: noch nie gefragt / zuletzt richtig / zuletzt falsch
  const status = q => { const s = store.stats[q.id]; return !s ? 'neu' : s.last === false ? 'falsch' : 'richtig'; };
  const newList = qs => qs.filter(q => status(q) === 'neu');
  const counts = qs => { const c = { neu: 0, richtig: 0, falsch: 0 }; qs.forEach(q => c[status(q)]++); return c; };
  const pct = (a, n) => (n ? a / n * 100 : 0).toFixed(1);
  function segBar(qs) {
    const c = counts(qs), n = qs.length;
    return `<div class="bar seg" title="${c.richtig} richtig, ${c.falsch} falsch, ${c.neu} noch nie gefragt"><i class="ok" style="width:${pct(c.richtig, n)}%"></i><i class="no" style="width:${pct(c.falsch, n)}%"></i></div>`;
  }
  const legend = c => `<span class="lg ok">✔ ${c.richtig} richtig</span> · <span class="lg no">✘ ${c.falsch} falsch</span> · <span class="lg">○ ${c.neu} noch nie gefragt</span>`;

  let S = null; // aktuelle Sitzung
  let tick = null;

  function stopTimer() { clearInterval(tick); tick = null; timerEl.classList.add('hidden'); timerEl.classList.remove('warn'); }

  // ---------- Startseite ----------
  function home() {
    stopTimer(); S = null;
    const ag = chapter('ag').questions, ex = chapter('extra').questions;
    const wAg = wrongList(ag).length, wEx = wrongList(ex).length;
    const last = store.exams.slice(-3).reverse();
    app.innerHTML = `
      <h1>Einbürgerung Kanton Aargau</h1>
      <p class="lead">Lerntrainer für den staatsbürgerlichen Test und das Einbürgerungsgespräch (Gemeinde Strengelbach). Bei jeder Frage kannst du mit dem gelben Knopf auf Spanisch (Venezuela) umschalten.</p>

      <div class="card profiles">
        <div class="meta" style="margin-bottom:8px">Wer lernt gerade? Jede Person hat ihren eigenen Fortschritt.</div>
        <div class="row">
          ${profiles.list.map(p => `<button class="btn ${p.id === profiles.active ? 'primary' : ''}" data-act="profile" data-id="${p.id}">👤 ${esc(p.name)}</button>`).join('')}
          ${profiles.list.length < 6 ? '<button class="btn" data-act="addProfile">＋ Person</button>' : ''}
          <span class="spacer"></span>
          <button class="btn" data-act="renameProfile" title="Aktive Person umbenennen">✎ Umbenennen</button>
          ${profiles.list.length > 1 ? '<button class="btn" data-act="deleteProfile" title="Aktive Person entfernen">🗑</button>' : ''}
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0">Kapitel 1 · Offizieller Übungstest Aargau</h2>
        <p class="meta">${ag.length} Fragen aus dem offiziellen Fragenkatalog (gültig ab 29.09.2025)</p>
        ${segBar(ag)}
        <p class="meta" style="margin:6px 0 0">${legend(counts(ag))}</p>
        <div class="grid" style="margin-top:14px">
          <button class="btn primary block" data-act="exam"><b>Prüfung simulieren</b><small>45 Fragen · 40 Minuten · bestanden ab 34</small></button>
          <button class="btn block" data-act="practice" data-ch="ag"><b>Alle Fragen, zufällig</b><small>sofortige Auflösung</small></button>
          ${orderedBtn('ag')}
          <button class="btn block" data-act="wrong" data-ch="ag" ${wAg ? '' : 'disabled'}><b>Fehler wiederholen</b><small>${wAg} Frage(n)</small></button>
          <button class="btn block" data-act="new" data-ch="ag" ${newList(ag).length ? '' : 'disabled'}><b>Noch nie gefragte Fragen</b><small>${newList(ag).length} Frage(n)</small></button>
          <button class="btn block" data-act="stats" data-ch="ag"><b>📊 Statistik</b><small>Übersicht und Fragenliste</small></button>
        </div>
        <h2>Nach Themenbereich üben</h2>
        <div class="grid">${Object.keys(D.exam.dist).map(k => {
          const qs = ag.filter(q => q.cat === k);
          return `<button class="btn block" data-act="practice" data-ch="ag" data-cat="${k}"><b>${esc(catName(k))}</b><small>✔ ${counts(qs).richtig} · ✘ ${counts(qs).falsch} · ○ ${counts(qs).neu} von ${qs.length} · in der Prüfung ${D.exam.dist[k]}</small>${segBar(qs)}</button>`;
        }).join('')}</div>
        ${last.length ? `<h2>Letzte Prüfungen</h2><table>${last.map(e => `<tr><td>${new Date(e.t).toLocaleString('de-CH')}</td><td class="num">${e.score} / ${D.exam.total}</td><td>${e.score >= D.exam.pass ? '✅ bestanden' : '❌ nicht bestanden'}</td></tr>`).join('')}</table>` : ''}
      </div>

      <div class="card">
        <h2 style="margin-top:0">Kapitel 2 · Strengelbach & Alltag</h2>
        <p class="meta">${ex.length} Zusatzfragen zur Vorbereitung auf das Einbürgerungsgespräch in der Gemeinde</p>
        ${segBar(ex)}
        <p class="meta" style="margin:6px 0 0">${legend(counts(ex))}</p>
        <div class="grid" style="margin-top:14px">
          ${['strengelbach', 'alltag'].map(k => {
            const qs = ex.filter(q => q.cat === k);
            return `<button class="btn block" data-act="practice" data-ch="extra" data-cat="${k}"><b>${esc(catName(k))}</b><small>✔ ${counts(qs).richtig} · ✘ ${counts(qs).falsch} · ○ ${counts(qs).neu} von ${qs.length}</small>${segBar(qs)}</button>`;
          }).join('')}
          <button class="btn block" data-act="practice" data-ch="extra"><b>Alle Zusatzfragen</b><small>gemischt</small></button>
          ${orderedBtn('extra')}
          <button class="btn block" data-act="wrong" data-ch="extra" ${wEx ? '' : 'disabled'}><b>Fehler wiederholen</b><small>${wEx} Frage(n)</small></button>
          <button class="btn block" data-act="new" data-ch="extra" ${newList(ex).length ? '' : 'disabled'}><b>Noch nie gefragte Fragen</b><small>${newList(ex).length} Frage(n)</small></button>
          <button class="btn block" data-act="stats" data-ch="extra"><b>📊 Statistik</b><small>Übersicht und Fragenliste</small></button>
        </div>
      </div>

      <div class="card">
        <div class="row">
          <button class="btn" data-act="info">ℹ️ Bewertung & Ablauf</button>
          <label class="row" style="gap:6px;cursor:pointer"><input type="checkbox" id="esAlways" ${store.esAlways ? 'checked' : ''}> Spanisch immer anzeigen</label>
          <span class="spacer"></span>
          <button class="btn" data-act="reset">Fortschritt löschen</button>
        </div>
        <div class="row" style="margin-top:12px">
          <span class="meta">Version ${APP_VERSION}</span>
          <span class="spacer"></span>
          <button class="btn" data-act="update">🔄 Nach Update suchen</button>
        </div>
      </div>`;
    app.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act, ch = b.dataset.ch, cat = b.dataset.cat;
      if (a === 'exam') startExam();
      else if (a === 'practice') startPractice(chapter(ch).questions.filter(q => !cat || q.cat === cat), cat ? catName(cat) : chapter(ch).title[0]);
      else if (a === 'ordered') startOrdered(ch);
      else if (a === 'wrong') startPractice(wrongList(chapter(ch).questions), 'Fehler wiederholen');
      else if (a === 'info') info();
      else if (a === 'new') startPractice(newList(chapter(ch).questions), 'Noch nie gefragte Fragen');
      else if (a === 'stats') stats(ch, 'alle', null);
      else if (a === 'update') checkUpdate(b);
      else if (a === 'reset' && confirm(`Lernfortschritt und Prüfungsresultate von «${activeProfile().name}» löschen?`)) { store = Object.assign(blank(), { esAlways: store.esAlways }); save(); home(); }
      else if (a === 'profile') { switchProfile(b.dataset.id); home(); }
      else if (a === 'addProfile') {
        const name = askName('Person ' + (profiles.list.length + 1));
        if (name) { const id = 'p' + Date.now().toString(36); profiles.list.push({ id, name }); switchProfile(id); home(); }
      }
      else if (a === 'renameProfile') {
        const p = activeProfile(), name = askName(p.name);
        if (name) { p.name = name; lsSet(PKEY, profiles); home(); }
      }
      else if (a === 'deleteProfile') {
        const p = activeProfile();
        if (confirm(`Person «${p.name}» mit ihrem ganzen Fortschritt entfernen?`)) {
          lsDel(pKey(p.id)); profiles.list = profiles.list.filter(x => x.id !== p.id);
          switchProfile(profiles.list[0].id); home();
        }
      }
    }));
    document.getElementById('esAlways').addEventListener('change', e => { store.esAlways = e.target.checked; save(); });
    window.scrollTo(0, 0);
  }

  // ---------- Update von Hand holen ----------
  async function checkUpdate(btn) {
    btn.disabled = true; btn.textContent = 'Suche Update …';
    try {
      // Neue sw.js holen; die Seite selbst lädt dank «no-cache» ohnehin frisch vom Server
      if (window.__swReg) await window.__swReg.update();
    } catch (e) { /* offline: einfach neu laden */ }
    location.reload();
  }

  // ---------- Sitzungen ----------
  function startPractice(qs, title) {
    if (!qs.length) return;
    S = { mode: 'practice', title, list: shuffle(qs), idx: 0, answers: {}, es: {}, right: 0 };
    render();
  }
  // Der Reihe nach (wie im PDF), mit gespeicherter Position zum Weitermachen
  function orderedList(ch) { return chapter(ch).questions.slice().sort((a, b) => a.n - b.n); }
  function orderedBtn(ch) {
    const list = orderedList(ch), pos = (store.pos || {})[ch] || 0;
    const sub = pos > 0 ? `weiter bei Frage ${list[pos].n} (${pos + 1} von ${list.length})` : `Nr. ${list[0].n} bis ${list[list.length - 1].n}${ch === 'ag' ? ', wie im PDF' : ''}`;
    return `<button class="btn block" data-act="ordered" data-ch="${ch}"><b>${ch === 'ag' ? 'Alle Fragen' : 'Alle Zusatzfragen'} der Reihe nach</b><small>${sub}</small></button>`;
  }
  function startOrdered(ch) {
    const list = orderedList(ch);
    let start = (store.pos || {})[ch] || 0;
    if (start > 0 && !confirm(`Bei Frage ${list[start].n} weitermachen?\n\nOK = weitermachen · Abbrechen = von vorne beginnen`)) start = 0;
    S = { mode: 'practice', title: (ch === 'ag' ? 'Alle Fragen' : 'Alle Zusatzfragen') + ' der Reihe nach', list, idx: start, answers: {}, es: {}, right: 0, posKey: ch };
    render();
  }
  function startExam() {
    const ag = chapter('ag').questions;
    let list = [];
    Object.entries(D.exam.dist).forEach(([k, n]) => { list = list.concat(shuffle(ag.filter(q => q.cat === k)).slice(0, n)); });
    S = { mode: 'exam', title: 'Prüfungssimulation', list: shuffle(list), idx: 0, answers: {}, es: {}, deadline: Date.now() + D.exam.minutes * 60000 };
    timerEl.classList.remove('hidden');
    tick = setInterval(updateTimer, 500); updateTimer();
    render();
  }
  function updateTimer() {
    if (!S || S.mode !== 'exam') return stopTimer();
    const ms = Math.max(0, S.deadline - Date.now());
    const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60;
    timerEl.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    timerEl.classList.toggle('warn', ms < 5 * 60000);
    if (ms === 0) { alert('Die Zeit ist abgelaufen. Der Test wird ausgewertet.'); finishExam(); }
  }

  // ---------- Frage anzeigen ----------
  function render() {
    const q = S.list[S.idx];
    if (S.posKey) { store.pos = store.pos || {}; store.pos[S.posKey] = S.idx; save(); }
    const showEs = S.es[q.id] !== undefined ? S.es[q.id] : store.esAlways;
    const T = showEs ? q.es : q.de;
    const chosen = S.answers[q.id];
    const revealed = S.mode === 'practice' && chosen !== undefined;
    const isPic = q.de.a.every(a => /^[a-d]\)$/.test(a));
    const catLabel = showEs ? catNameEs(q.cat) : catName(q.cat);

    app.innerHTML = `
      <div class="row">
        <span class="meta">👤 ${esc(activeProfile().name)} · ${esc(S.title)} · Frage ${S.idx + 1} von ${S.list.length}${S.mode === 'practice' ? ` · ${S.right} richtig` : ''}</span>
        <span class="spacer"></span>
        <button class="btn es" id="esBtn">${showEs ? 'DE · Deutsch' : 'ES · Español'}</button>
      </div>
      <div class="card">
        ${showEs ? '<span class="lang-tag">ES · Venezuela</span>' : ''}
        <div class="meta">${esc(catLabel)}${q.code ? ` · Nr. ${q.n} (${esc(q.code)})` : ''}</div>
        <div class="q">${esc(T.q)}${q.img.map(f => `<img src="img/${esc(f)}" alt="Abbildung zur Frage">`).join('')}</div>
        <div class="opts">${T.a.map((a, i) => {
          let cls = 'opt';
          if (revealed) { if (q.ok.includes(i)) cls += ' right'; else if (i === chosen) cls += ' wrong'; }
          else if (i === chosen) cls += ' sel';
          return `<button class="${cls}" data-i="${i}" ${revealed ? 'disabled' : ''}><b>${L[i]}.</b><span>${isPic ? (showEs ? 'Imagen ' : 'Bild ') + esc(a) : esc(a)}</span></button>`;
        }).join('')}</div>
        ${revealed ? `<div class="feedback ${q.ok.includes(chosen) ? 'ok' : 'no'}">${q.ok.includes(chosen)
          ? (showEs ? '✔ ¡Correcto!' : '✔ Richtig!')
          : (showEs ? '✘ Incorrecto. Respuesta correcta: ' : '✘ Falsch. Richtig ist: ') + q.ok.map(i => L[i]).join(', ')}</div>` : ''}
        ${revealed && q.src ? `<div class="src">Quelle: ${esc(q.src)}</div>` : ''}
      </div>
      <div class="row">
        <button class="btn" id="prev" ${S.idx === 0 ? 'disabled' : ''}>← Zurück</button>
        <span class="spacer"></span>
        <button class="btn" id="quit">${S.mode === 'exam' ? 'Abbrechen' : 'Beenden'}</button>
        ${S.mode === 'exam' ? '<button class="btn primary" id="submit">Antworten einreichen</button>' : ''}
        <button class="btn ${S.mode === 'practice' && revealed ? 'primary' : ''}" id="next" ${S.idx === S.list.length - 1 && S.mode === 'exam' ? 'disabled' : ''}>${S.idx === S.list.length - 1 ? 'Fertig' : 'Weiter →'}</button>
      </div>
      ${S.mode === 'exam' ? `<div class="nav">${S.list.map((x, i) => `<button data-j="${i}" class="${S.answers[x.id] !== undefined ? 'done' : ''} ${i === S.idx ? 'cur' : ''}">${i + 1}</button>`).join('')}</div>
        <p class="meta">${Object.keys(S.answers).length} von ${S.list.length} beantwortet · Fragen können übersprungen und später beantwortet werden.</p>` : ''}`;

    document.getElementById('esBtn').onclick = () => { S.es[q.id] = !showEs; render(); };
    app.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      if (S.mode === 'practice') {
        if (S.answers[q.id] !== undefined) return;
        S.answers[q.id] = i;
        const ok = q.ok.includes(i); if (ok) S.right++;
        record(q, ok);
      } else S.answers[q.id] = i;
      render();
    }));
    document.getElementById('prev').onclick = () => { S.idx--; render(); };
    document.getElementById('next').onclick = () => {
      if (S.idx < S.list.length - 1) { S.idx++; render(); window.scrollTo(0, 0); }
      else if (S.mode === 'practice') {
        if (S.posKey) { store.pos[S.posKey] = 0; save(); }
        practiceDone();
      }
    };
    document.getElementById('quit').onclick = () => {
      if (S.mode === 'exam' ? confirm('Prüfung abbrechen? Das Resultat wird nicht gespeichert.') : true) {
        S.mode === 'practice' && Object.keys(S.answers).length ? practiceDone() : home();
      }
    };
    const sub = document.getElementById('submit');
    if (sub) sub.onclick = () => {
      const open = S.list.length - Object.keys(S.answers).length;
      if (confirm(open ? `Noch ${open} Frage(n) unbeantwortet. Trotzdem einreichen?` : 'Antworten jetzt einreichen?')) finishExam();
    };
    app.querySelectorAll('.nav button').forEach(b => b.addEventListener('click', () => { S.idx = +b.dataset.j; render(); }));
  }

  function practiceDone() {
    const n = Object.keys(S.answers).length;
    app.innerHTML = `<h1>Übung beendet</h1>
      <div class="card"><p class="result">${S.right} von ${n} richtig</p>
      <p class="meta">${esc(S.title)}</p>
      <div class="row"><button class="btn primary" id="h">Zur Startseite</button></div></div>`;
    document.getElementById('h').onclick = home;
  }

  // ---------- Prüfung auswerten (offizieller Schlüssel) ----------
  function finishExam() {
    if (!S || S.mode !== 'exam') return;
    stopTimer();
    const per = {}; Object.keys(D.exam.dist).forEach(k => per[k] = { r: 0, n: 0 });
    let score = 0;
    S.list.forEach(q => {
      const ok = S.answers[q.id] !== undefined && q.ok.includes(S.answers[q.id]);
      per[q.cat].n++; if (ok) { per[q.cat].r++; score++; }
      record(q, ok);
    });
    const pass = score >= D.exam.pass;
    const used = Math.min(D.exam.minutes * 60000, Date.now() - (S.deadline - D.exam.minutes * 60000));
    store.exams.push({ t: Date.now(), score }); store.exams = store.exams.slice(-200); save();
    const list = S.list, answers = S.answers;
    S = null;
    app.innerHTML = `<h1>Ergebnis Prüfungssimulation</h1>
      <div class="card">
        <p class="result ${pass ? 'pass' : 'fail'}">${score} / ${D.exam.total} Punkte – ${pass ? 'bestanden ✅' : 'nicht bestanden ❌'}</p>
        <p class="meta">Bestanden ab ${D.exam.pass} richtigen Antworten (rund 75 %). Benötigte Zeit: ${Math.floor(used / 60000)} Min. ${Math.floor(used / 1000) % 60} Sek.</p>
        <table><tr><th>Kategorie</th><th class="num">Punkte</th></tr>
        ${Object.entries(per).map(([k, v]) => `<tr><td>${esc(catName(k))}</td><td class="num">${v.r} / ${v.n}</td></tr>`).join('')}
        <tr><th>Total</th><th class="num">${score} / ${D.exam.total}</th></tr></table>
      </div>
      <h2>Alle Fragen</h2>
      ${list.map((q, i) => {
        const a = answers[q.id], ok = a !== undefined && q.ok.includes(a);
        return `<div class="card"><div class="meta">${i + 1}. ${esc(catName(q.cat))}</div>
          <div><b>${ok ? '✔' : '✘'} ${esc(q.de.q)}</b></div>
          <div class="meta">Deine Antwort: ${a === undefined ? '– (nicht beantwortet)' : L[a] + '. ' + esc(q.de.a[a])}</div>
          ${ok ? '' : `<div style="color:var(--ok)">Richtig: ${q.ok.map(j => L[j] + '. ' + esc(q.de.a[j])).join(' / ')}</div>`}
          <div class="meta" style="margin-top:4px">ES: ${esc(q.es.q)} → ${q.ok.map(j => esc(q.es.a[j])).join(' / ')}</div></div>`;
      }).join('')}
      <div class="row"><button class="btn primary" id="h">Zur Startseite</button><button class="btn" id="again">Neue Prüfung</button></div>`;
    document.getElementById('h').onclick = home;
    document.getElementById('again').onclick = startExam;
    window.scrollTo(0, 0);
  }

  // ---------- Statistik ----------
  const FILTERS = { alle: 'Alle', neu: '○ Noch nie gefragt', falsch: '✘ Falsch', richtig: '✔ Richtig' };
  const ICON = { neu: '○', falsch: '✘', richtig: '✔' };
  function stats(ch, filter, cat) {
    stopTimer(); S = null;
    const c = chapter(ch), all = c.questions.slice().sort((a, b) => a.n - b.n);
    const cats = ch === 'ag' ? Object.keys(D.exam.dist) : [...new Set(all.map(q => q.cat))];
    const tot = counts(all);
    let answers = 0, rights = 0;
    all.forEach(q => { const s = store.stats[q.id]; if (s) { answers += s.r + s.w; rights += s.r; } });
    const shown = all.filter(q => (!cat || q.cat === cat) && (filter === 'alle' || status(q) === filter));
    const exams = ch === 'ag' ? store.exams.slice().reverse() : [];
    const passed = exams.filter(e => e.score >= D.exam.pass).length;
    const cell = (k, f, v) => `<a href="#" data-f="${f}" data-c="${k || ''}">${v}</a>`;

    app.innerHTML = `
      <h1>📊 Statistik</h1>
      <p class="lead">👤 ${esc(activeProfile().name)} · ${esc(c.title[0])}</p>
      <div class="card">
        ${segBar(all)}
        <p class="meta" style="margin:6px 0 0">${legend(tot)}</p>
        <p class="meta">${all.length - tot.neu} von ${all.length} Fragen schon gefragt (${pct(all.length - tot.neu, all.length)} %) · ${answers} Antworten insgesamt, davon ${answers ? Math.round(rights / answers * 100) : 0} % richtig</p>
        <table>
          <tr><th>Themenbereich</th><th class="num">✔</th><th class="num">✘</th><th class="num">○</th><th class="num">Total</th></tr>
          ${cats.map(k => { const qs = all.filter(q => q.cat === k), x = counts(qs);
            return `<tr><td>${cell(k, 'alle', esc(catName(k)))}</td><td class="num ok">${cell(k, 'richtig', x.richtig)}</td><td class="num no">${cell(k, 'falsch', x.falsch)}</td><td class="num">${cell(k, 'neu', x.neu)}</td><td class="num">${qs.length}</td></tr>`; }).join('')}
          <tr><th>${cell('', 'alle', 'Total')}</th><th class="num ok">${cell('', 'richtig', tot.richtig)}</th><th class="num no">${cell('', 'falsch', tot.falsch)}</th><th class="num">${cell('', 'neu', tot.neu)}</th><th class="num">${all.length}</th></tr>
        </table>
        <p class="src">Zahlen antippen, um die passenden Fragen unten aufzulisten. «Richtig/Falsch» zählt jeweils die letzte Antwort auf eine Frage.</p>
      </div>
      ${ch === 'ag' ? `<div class="card"><h2 style="margin-top:0">Prüfungssimulationen</h2>
        ${exams.length ? `<p class="meta">${exams.length} Prüfung(en), davon ${passed} bestanden · Durchschnitt ${(exams.reduce((a, e) => a + e.score, 0) / exams.length).toFixed(1)} / ${D.exam.total} · Bestes Resultat ${Math.max(...exams.map(e => e.score))}</p>
        <table>${exams.map(e => `<tr><td>${new Date(e.t).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}</td><td class="num">${e.score} / ${D.exam.total}</td><td>${e.score >= D.exam.pass ? '✅' : '❌'}</td></tr>`).join('')}</table>`
        : '<p class="meta">Noch keine Prüfung simuliert.</p>'}</div>` : ''}
      <div class="card" id="liste">
        <h2 style="margin-top:0">Fragenliste</h2>
        <div class="row">${Object.entries(FILTERS).map(([f, l]) => `<button class="btn ${f === filter ? 'primary' : ''}" data-f="${f}" data-c="${cat || ''}">${l}</button>`).join('')}</div>
        <div class="row" style="margin-top:8px">
          <button class="btn ${!cat ? 'primary' : ''}" data-f="${filter}" data-c="">Alle Bereiche</button>
          ${cats.map(k => `<button class="btn ${cat === k ? 'primary' : ''}" data-f="${filter}" data-c="${k}">${esc(catName(k))}</button>`).join('')}
        </div>
        <div class="row" style="margin:12px 0">
          <span class="meta">${shown.length} Frage(n)</span><span class="spacer"></span>
          <button class="btn primary" id="practiceShown" ${shown.length ? '' : 'disabled'}>Diese Fragen üben</button>
        </div>
        <div class="qlist">${shown.map(q => { const s = store.stats[q.id], st = status(q);
          return `<details class="qi ${st}"><summary><span class="ic">${ICON[st]}</span><span class="nr">${q.n}</span><span class="tx">${esc(q.de.q)}</span><span class="ct">${s ? `${s.r}✔ ${s.w}✘` : ''}</span></summary>
            <div class="ans">✔ ${q.ok.map(i => L[i] + '. ' + esc(q.de.a[i])).join(' / ')}${q.img.length ? ' (siehe Bild)' : ''}</div>
            <div class="ans es">ES: ${esc(q.es.q)} → ${q.ok.map(i => esc(q.es.a[i])).join(' / ')}</div></details>`; }).join('')}</div>
      </div>
      <div class="row"><button class="btn" id="h">← Zur Startseite</button></div>`;

    app.querySelectorAll('[data-f]').forEach(el => el.addEventListener('click', e => {
      e.preventDefault();
      stats(ch, el.dataset.f, el.dataset.c || null);
      document.getElementById('liste').scrollIntoView();
    }));
    document.getElementById('practiceShown').onclick = () => startPractice(shown, `Statistik: ${FILTERS[filter]}${cat ? ' · ' + catName(cat) : ''}`);
    document.getElementById('h').onclick = home;
    window.scrollTo(0, 0);
  }

  // ---------- Info ----------
  function info() {
    stopTimer();
    const d = D.exam.dist;
    app.innerHTML = `<h1>Bewertung & Ablauf</h1>
      <div class="card">
        <h2 style="margin-top:0">Staatsbürgerlicher Test (Kanton Aargau)</h2>
        <ul class="plain">
          <li><b>${D.exam.total} Fragen</b>, zufällig aus dem Fragenkatalog gezogen – jeder Test ist anders.</li>
          <li><b>${D.exam.minutes} Minuten</b> Zeit. Nach Ablauf wird der Test automatisch beendet.</li>
          <li><b>Bestanden ab ${D.exam.pass} richtigen Antworten</b> (34 von 45, rund 75 %).</li>
          <li>Verteilung pro Test: Demokratie/Föderalismus ${d.demo}, Sozialstaat ${d.sozial}, Rechtsstaat ${d.recht}, Geschichte ${d.gesch}, Zivilgesellschaft ${d.zivil}.</li>
          <li>Während des Tests gibt es keine Rückmeldung, ob eine Antwort richtig ist. Fragen dürfen übersprungen werden.</li>
          <li>Am Computer in der Gemeinde, unter Aufsicht, ohne Hilfsmittel.</li>
          <li>Pflicht ab dem vollendeten 16. Lebensjahr; Nachweis bei Gesuchseinreichung nicht älter als 6 Monate.</li>
          <li>Wiederholung beliebig oft, frühestens <b>2 Monate</b> nach der letzten Teilnahme. Gebühr: <b>CHF 50.–</b>.</li>
        </ul>
        <p class="src">Quellen: Kanton Aargau, Handbuch ordentliche Einbürgerungen, Anhang 2 «Hinweise zum Testablauf» (Version 30.06.2026); Verordnung über das Kantons- und das Gemeindebürgerrecht (KBüV, SAR 121.213) § 3.</p>
      </div>
      <div class="card">
        <h2 style="margin-top:0">Einbürgerungsgespräch in der Gemeinde</h2>
        <ul class="plain">
          <li>Kein Frage-Antwort-Test, sondern ein Gespräch zur Integration und zur Vertrautheit mit den Lebensverhältnissen.</li>
          <li>Typische Themen: Leben in der Gemeinde & Mobilität, Beruf & Wirtschaft, Bildung, Finanzen & soziale Absicherung, Kultur & Orientierung.</li>
          <li>Fragen zu Bund und Kanton werden nur gestellt, wenn kein staatsbürgerlicher Test abgelegt wurde.</li>
          <li>Unzulässig sind u.a. intime Fragen (z.B. Parteizugehörigkeit, Kinderwunsch) und suggestive Fragen.</li>
          <li>Die Vertretung der Gemeinde entscheidet mit Mehrheit über eine (nicht verbindliche) Empfehlung.</li>
        </ul>
        <p class="src">Quellen: Handbuch Anhang 3 «Hinweise Einbürgerungsgespräch» und Anhang 4 «Fragebeispiele» (Version 30.06.2026). Kapitel 2 dieser App ist aus diesen Themen sowie aus Angaben von strengelbach.ch und Wikipedia (Stand November 2026) zusammengestellt – keine offiziellen Prüfungsfragen.</p>
      </div>
      <div class="card"><p class="meta">Inoffizielles Lernwerkzeug für den privaten Gebrauch. Fragen von Kapitel 1: Übungstest der Gemeindefachverbände Aargau (einbuergerungstest-aargau.ch), gültig ab 29.09.2025. Spanische Übersetzung inoffiziell.</p>
      <button class="btn primary" id="h">Zur Startseite</button></div>`;
    document.getElementById('h').onclick = home;
    window.scrollTo(0, 0);
  }

  document.getElementById('homeBtn').onclick = () => {
    if (S && S.mode === 'exam' && !confirm('Prüfung abbrechen?')) return;
    home();
  };
  home();
})();
