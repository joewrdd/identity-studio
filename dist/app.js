const byId = id => document.getElementById(id);
const icon = name => `<svg aria-hidden="true"><use href="icons.svg#${name}"/></svg>`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const levels = { guided:'Guided', builder:'Builder', advanced:'Advanced' };
const stateKey = 'identity-studio.v1';
function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(stateKey));
    return {
      done: Array.isArray(stored?.done) ? [...new Set(stored.done.filter(id => lessons.some(l => l.id === id)))] : [],
      level: Object.hasOwn(levels, stored?.level) ? stored.level : 'builder'
    };
  } catch { return { done:[], level:'builder' }; }
}
const state = loadState();
function saveState() {
  try { localStorage.setItem(stateKey, JSON.stringify(state)); }
  catch { notify('Progress could only be saved for this session.'); }
}
const monday = Date.UTC(2026, 10, 23);
const weekMs = 7 * 24 * 60 * 60 * 1000;
const formatter = new Intl.DateTimeFormat('en', {month:'short',day:'numeric',timeZone:'Asia/Beirut'});
function weekLabel(index) {
  return 'Week ' + (index + 1);
}
function release(index) {
  if (!index) return null;
  const calendar = new Date(monday + (index - 1) * weekMs);
  const result = new Date(calendar);
  result.setUTCHours(18);
  const clock = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Beirut',hour:'2-digit',hourCycle:'h23'});
  const offset = Number(clock.format(result)) - 18;
  result.setUTCHours(18 - offset);
  return result;
}
function activeIndex() {
  return lessons.reduce((active, _, i) => !i || release(i) <= Date.now() ? i : active, 0);
}
function getRoute() {
  const [page, id] = location.hash.slice(1).split('/');
  if (!page || homeAnchors.has(page)) return {page:'home', section:page || 'home'};
  if (page === 'roadmap' || page === 'standards') return {page};
  const index = lessons.findIndex(l => l.id === id);
  return {page:'lesson', index:index < 0 ? activeIndex() : index};
}
function renderTrack(route) {
  const current = activeIndex();
  const continueLink = document.querySelector('.workspace [data-view="lesson"]');
  continueLink.href = '#lesson/' + lessons[current].id;
  document.querySelectorAll('.workspace a').forEach(link => {
    if (link.dataset.view === route.page) {
      link.setAttribute('aria-current','page');
      byId('breadcrumb-icon').setAttribute('href', link.querySelector('use').getAttribute('href'));
    } else {
      link.removeAttribute('aria-current');
    }
  });
  byId('track').innerHTML = lessons.map((l,i) => {
    const done = state.done.includes(l.id);
    const selected = route.page === 'lesson' && route.index === i;
    const featured = i === current;
    const status = [done && 'Completed', featured && 'Current week'].filter(Boolean);
    return `<a class="${featured ? 'track-current' : ''}" href="#lesson/${l.id}" ${selected ? 'aria-current="step"' : ''}>
      <span class="track-node ${done ? 'is-done' : ''}" aria-hidden="true">${done ? icon('check') : ''}</span>
      <span>${l.short}</span>${status.length ? `<span class="sr-only">, ${status.join(', ')}</span>` : ''}
    </a>`;
  }).join('');
  byId('progress-count').textContent = state.done.length + ' / ' + lessons.length;
  byId('progress-fill').style.width = (state.done.length / lessons.length * 100) + '%';
  byId('progress-bar').setAttribute('aria-valuenow', state.done.length);
  byId('profile-level').textContent = levels[state.level] + ' track';
}
function refLink(id) {
  const [title,,url] = standards[id];
  return `<a target="_blank" rel="noopener" class="ref-link" href="${url}">${icon('book')}${escape(title)}${icon('link')}</a>`;
}
function sectionLabel(symbol, label) {
  return `<div class="section-label"><span class="tile-icon">${icon(symbol)}</span><span>${label}</span></div>`;
}
function dart(lesson, solution) {
  const body = solution ? lesson.source : "// TODO: Implement the exercise.\n  return 'TODO';";
  const args = lesson.cases[0][0].replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\$/g,'\\$');
  return `${lesson.imports ? lesson.imports+'\n\n' : ''}${lesson.signature} {\n  ${body}\n}\n\nvoid main() {\n  print(${lesson.entry}('${args}'));\n}`;
}
function highlight(line) {
  return line.split(/(\/\/.*$|'[^']*'|"[^"]*"|\b(?:final|const|var|return|if|else|switch|is|on|try|catch|void|String|Map|null|int)\b)/g).map((token,i) => i%2===0 ? escape(token) : `<span class="${token.startsWith('//')?'comment':/^["']/.test(token)?'string':'keyword'}">${escape(token)}</span>`).join('');
}
function renderCode(lesson, solution=false) {
  byId('code-content').innerHTML = dart(lesson,solution).split('\n').map(line => `<span class="code-line">${highlight(line)||' '}</span>`).join('');
  byId('starter-tab').setAttribute('aria-pressed', !solution);
  byId('solution-tab').setAttribute('aria-pressed', solution);
  byId('code-why').hidden = !solution && state.level !== 'guided';
}
function renderLesson(index) {
  const lesson = lessons[index], done = state.done.includes(lesson.id);
  const current = activeIndex();
  const status = index===current ? 'Current lesson' : index>current ? 'Early preview' : 'Available lesson';
  const next = lessons[index + 1];
  byId('crumb').textContent = 'Learning lab';
  byId('subcrumb').textContent = status;
  const shape = lesson.shape ? `<div class="did-parts" aria-label="Parts of an example DID">${lesson.shape.map((p,i) => `<div class="did-part part-${i}"><code>${p}</code><small>${lesson.shapeLabels[i]}</small></div>`).join('')}</div>` : '';
  byId('main').innerHTML = `
  <section class="hero glass">
    <div class="hero-glow"></div><div class="hero-grid"></div><img class="hero-art" src="identity-glass.svg" alt="">
    <div class="hero-content">
      <div class="hero-eyebrow"><span class="week-chip"><span></span>${weekLabel(index)}${index>current?' · Preview':''}</span><span class="spec">${lesson.tag}</span></div>
      <h1>${lesson.title}</h1><p>${lesson.intro}</p>
      <div class="hero-meta"><span>${icon('clock')}${lesson.time} min</span><span>${icon('track-level')}${levels[state.level]} track</span><span>${icon('terminal')}Hands-on lab</span></div>
    </div>
  </section>
  <div class="lesson-heading"><h2>Lesson workspace</h2><span>${icon('wallet')} Identity wallet series</span></div>
  <div class="lesson-grid">
    <section class="glass card concept">
      ${sectionLabel(lesson.icon,'Technical concept')}
      <h3>${lesson.concept}</h3><p>${lesson.explain}</p>
      ${shape}
      <div class="insight"><span>${icon('lab-note')}</span><p>${lesson.detail}</p></div>
      ${refLink(lesson.ref)}
    </section>
    <section class="glass card exercise">
      ${sectionLabel('code','Dart exercise')}
      <h3>${lesson.exercise}</h3><p>${lesson.task}</p>
      <div class="editor">
        <div class="editor-head"><span class="file">${icon('terminal')}${lesson.file}</span><button id="copy" aria-label="Copy Dart code" title="Copy Dart code" type="button">${icon('copy')}</button></div>
        <div class="code-tabs" aria-label="Code examples"><button id="starter-tab" type="button" aria-pressed="true">Starter</button><button id="solution-tab" type="button" aria-pressed="false">Solution</button></div>
        <pre tabindex="0" aria-label="Dart code"><code id="code-content"></code></pre>
      </div>
      <p class="explanation" id="code-why" hidden>${lesson.why}</p>
      <details class="fixtures" ${state.level==='guided'?'open':''}><summary>Try test fixtures</summary>
        <p>This browser preview runs the reference logic. Use DartPad or your Flutter project to run the Dart code.</p>
        <div class="fixture-buttons">${lesson.cases.map(([input],i)=>`<button type="button" data-case="${i}" aria-label="Load test case ${i+1}">Case ${i+1}</button>`).join('')}</div>
        <form class="fixture-form"><div><label for="fixture-input">Fixture input</label><input id="fixture-input" type="text" value="${escape(lesson.cases[0][0])}" autocomplete="off" spellcheck="false"></div><button type="submit" class="primary">${icon('play')}Run preview</button></form>
        <output id="fixture-output" for="fixture-input" hidden></output>
      </details>
      <div class="exercise-actions"><a class="text-link" href="https://dartpad.dev/" target="_blank" rel="noopener">${icon('link')}Open DartPad</a></div>
    </section>
  </div>
  <section class="glass next-card">
    <div class="tile-icon next-icon">${icon('target')}</div>
    <div class="next-copy"><div class="section-label">Next step</div><h3>${lesson.next}</h3><p>${lesson.action}</p>${state.level==='advanced'?`<p class="stretch"><strong>Advanced extension</strong> ${lesson.stretch}</p>`:''}</div>
    <button id="complete" class="primary complete ${done?'completed':''}" aria-pressed="${done}" type="button">${icon('check')}${done?'Completed':'Mark complete'}</button>
  </section>
  <div class="pager">${index ? `<a href="#lesson/${lessons[index-1].id}">Previous lesson</a>`: '<a href="#roadmap">View roadmap</a>'}${next?`<a href="#lesson/${next.id}">Next lesson · ${next.short}</a>`:'<a href="#roadmap">Review roadmap</a>'}</div>`;
  let solution = false;
  renderCode(lesson);
  byId('starter-tab').onclick = () => {solution=false;renderCode(lesson);};
  byId('solution-tab').onclick = () => {solution=true;renderCode(lesson,true);};
  byId('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(dart(lesson,solution)); notify('Dart code copied.'); }
    catch { notify('Select the code to copy it manually.'); }
  };
  const input = byId('fixture-input'), output = byId('fixture-output');
  document.querySelectorAll('[data-case]').forEach(button => button.onclick = () => {
    input.value = lesson.cases[Number(button.dataset.case)][0]; output.hidden=true; input.focus();
  });
  document.querySelector('.fixture-form').onsubmit = event => {
    event.preventDefault();
    const result = lesson.check(input.value);
    output.textContent = result || '(empty string)';
    output.hidden = false;
  };
  byId('complete').onclick = event => {
    const button = event.currentTarget;
    const wasDone = state.done.includes(lesson.id);
    state.done = wasDone ? state.done.filter(id=>id!==lesson.id) : [...state.done,lesson.id];
    saveState();
    renderTrack({page:'lesson',index});
    button.innerHTML = icon('check') + (wasDone?'Mark complete':'Completed');
    button.setAttribute('aria-pressed',!wasDone);
    button.classList.toggle('completed',!wasDone);
    notify(wasDone?'Lesson marked incomplete.':'Lesson completed.');
  };
}
function renderOverview(page) {
  const roadmap = page==='roadmap';
  const name = roadmap?'Roadmap':'Standards';
  byId('crumb').textContent = name;
  byId('subcrumb').textContent = roadmap?'Wallet build track':'Reference library';
  const rows = roadmap ? lessons.map((lesson,i) => {
    const date = release(i);
    const timing = state.done.includes(lesson.id)?'Completed':i===activeIndex()?'Current week':date&&i>activeIndex()?formatter.format(date):'Available';
    return `<a class="glass overview-item" href="#lesson/${lesson.id}"><span class="tile-icon">${icon(lesson.icon)}</span><div><small>${weekLabel(i)} · ${lesson.time} min</small><h2>${lesson.title}</h2><p>${lesson.intro}</p></div><span class="item-status">${timing}</span></a>`;
  }) : Object.values(standards).map(([title,kind,url,description],i) =>
    `<a class="glass overview-item" href="${url}" target="_blank" rel="noopener"><span class="standard-volume" aria-hidden="true">${icon('standard-volume')}<span>${i+1}</span></span><div><small>${kind}</small><h2>${title}</h2><p>${description}</p></div><span class="item-status">${icon('link')}</span></a>`);
  byId('main').innerHTML = `<section class="glass overview-hero"><div>${sectionLabel(roadmap?'route':'book',roadmap?'Wallet build track':'Reference library')}<h1>${name}</h1><p>${roadmap?'Build a Flutter wallet in eight labs. Follow the weekly cadence or preview any lesson.':'Read the specifications behind the labs and check their publication status.'}</p></div></section><div class="overview-list">${rows.join('')}</div>`;
}
function render({focus=false}={}) {
  const route = getRoute();
  const home = route.page === 'home';
  byId('site-home').hidden = !home;
  byId('workspace-shell').hidden = home;
  byId('companion').hidden = home;
  byId('skip-link').href = home ? '#home-title' : '#main';
  if (home) {
    renderHome(route.section, focus);
    return;
  }
  renderTrack(route);
  if (route.page==='lesson') renderLesson(route.index);
  else renderOverview(route.page);
  if (focus) {window.scrollTo(0,0);byId('main').focus({preventScroll:true});}
}
let toastTimer;
function notify(message) {
  const toast = byId('toast'); toast.textContent = message; toast.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{toast.hidden=true;},3500);
}
function showDialog(title,body) {
  byId('dialog-title').textContent=title; byId('dialog-body').innerHTML=body;
  if (!byId('dialog').open) byId('dialog').showModal();
}
function preferences() {
  showDialog('Learning preferences', `<p>Choose how much guidance you want in each lab. Your selection and completion history are saved in this browser.</p>
  <form id="preferences-form"><fieldset><legend>Difficulty</legend>
  ${Object.entries({guided:'Fixture tests open with the explanation visible.',builder:'Work through the starter and reveal the solution when you want it.',advanced:'Add an architecture or testing challenge to each lab.'}).map(([key,copy])=>
    `<label class="level-option"><input type="radio" name="level" value="${key}" ${state.level===key?'checked':''}><span><strong>${levels[key]}</strong><small>${copy}</small></span></label>`).join('')}</fieldset><button class="primary" type="submit">Save preferences</button></form>`);
  byId('preferences-form').onsubmit=event=>{
    event.preventDefault();
    state.level=new FormData(event.currentTarget).get('level');
    saveState();byId('dialog').close();render();notify('Learning preferences saved.');
  };
}
function schedule() {
  const next = activeIndex() + 1;
  showDialog('Weekly cadence', `<p>The track advances on Mondays at 6:00 p.m. Beirut time. You can preview every lab from the roadmap.</p>
    ${next<lessons.length?`<p class="schedule-next"><strong>Next scheduled lab</strong><br>${weekLabel(next)} · ${lessons[next].short} · ${formatter.format(release(next))}</p>`:''}
    <a href="#roadmap" class="primary" id="dialog-roadmap">View roadmap</a>`);
  byId('dialog-roadmap').onclick=()=>byId('dialog').close();
}
function setMenu(open) {
  document.body.classList.toggle('nav-open',open);
  byId('scrim').hidden = !open;
  byId('menu').setAttribute('aria-expanded',open);
  byId('menu').setAttribute('aria-label',open?'Close navigation':'Open navigation');
}
function dismissMenu() {
  setMenu(false);
  byId('menu').focus();
}
byId('menu').onclick = () => {
  if (document.body.classList.contains('nav-open')) {
    dismissMenu();
    return;
  }
  setMenu(true);
  byId('menu-close').focus();
};
byId('menu-close').onclick = dismissMenu;
byId('scrim').onclick = dismissMenu;
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.body.classList.contains('nav-open')&&!byId('dialog').open) dismissMenu();
});
window.addEventListener('hashchange',()=>{setMenu(false);render({focus:true});});
byId('skip-link').addEventListener('click',event=>{
  event.preventDefault();
  const target = byId(getRoute().page === 'home' ? 'home-title' : 'main');
  target.focus({preventScroll:true});
  target.scrollIntoView();
});
byId('sidebar').addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
byId('profile').onclick=preferences;
byId('settings').onclick=preferences;
byId('schedule').onclick=schedule;
render();
