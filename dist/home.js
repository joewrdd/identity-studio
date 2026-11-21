const homeAnchors = new Map([
  ['home','home-title'],['learn','learn-title'],['curriculum','curriculum-title'],
  ['guide','guide-title'],['start','start-title'],
]);
const homePhases = {
  identity: {first:0, end:2, detail:'Parse your first DID and resolve it through a method adapter.'},
  wallet: {first:2, end:4, detail:'Model verifiable credentials and build the repository that stores them.'},
  exchange: {first:4, end:8, detail:'Receive credentials, present them with consent, check their status, and put the wallet together.'},
};
let homeInitialized = false;

function showHomePhase(phase) {
  const {first,end,detail} = homePhases[phase];
  byId('home-phases').querySelectorAll('button').forEach(button=>{
    button.setAttribute('aria-pressed',button.dataset.phase===phase);
  });
  byId('home-phase-detail').innerHTML = `<p>${detail}</p><ul>${lessons.slice(first,end).map(lesson=>
    `<li><a href="#lesson/${lesson.id}">${escape(lesson.short)}</a></li>`
  ).join('')}</ul>`;
}

function initHome() {
  homeInitialized = true;
  showHomePhase('identity');
  byId('home-phases').onclick = event => {
    const button = event.target.closest('button[data-phase]');
    if (button) showHomePhase(button.dataset.phase);
  };
  byId('home-run').onclick = () => {
    const fixture = lessons[0].cases[0][0];
    byId('home-result').textContent = lessons[0].check(fixture);
  };
  byId('home-chat-options').onclick = event => {
    const button = event.target.closest('button[data-demo]');
    if (!button) return;
    const lesson = lessons[0];
    byId('home-chat-reply').textContent = button.dataset.demo === 'hint'
      ? 'Capture the method first. Keep everything after it together so alice:wallet stays intact.'
      : lesson.action;
  };

  const scenes = document.querySelectorAll('[data-tilt]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver(entries=>{
    entries.forEach(({isIntersecting,target})=>{
      if (!isIntersecting) return;
      target.classList.add('in-view');
      observer.unobserve(target);
    });
  },{threshold:.25});
  scenes.forEach(scene=>{
    observer.observe(scene);
    scene.addEventListener('pointermove',event=>{
      if (motion.matches || event.pointerType !== 'mouse') return;
      const rect = scene.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      scene.style.setProperty('--yaw', x * 14 + 'deg');
      scene.style.setProperty('--pitch', y * -12 + 'deg');
    });
    scene.addEventListener('pointerleave',()=>{
      scene.style.removeProperty('--pitch');
      scene.style.removeProperty('--yaw');
    });
  });
}

function renderHome(section, focus) {
  if (!homeInitialized) initHome();
  if (!focus && section === 'home') return;
  const title = byId(homeAnchors.get(section));
  requestAnimationFrame(()=>{
    if (getRoute().page !== 'home') return;
    if (section === 'home') window.scrollTo(0,0);
    else byId(section).scrollIntoView({block:'start'});
    if (focus) title.focus({preventScroll:true});
  });
}
