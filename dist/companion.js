(() => {
  const trigger = byId('companion-trigger');
  const panel = byId('companion-panel');
  const nudge = byId('companion-nudge');
  const log = byId('companion-log');
  const input = byId('companion-input');
  const close = byId('companion-close');
  const conversations = new Map();
  let currentLesson;

  function contextLesson() {
    const route = getRoute();
    return lessons[route.page === 'lesson' ? route.index : activeIndex()];
  }

  function lessonTopic(question) {
    const topics = [
      [/\b(revocation|suspension|status list|credential status)\b/, 'status'],
      [/\b(issuer metadata|issuance|credential offer|openid4vci)\b/, 'issuance'],
      [/\b(presentation|consent|nonce|openid4vp|dcql)\b/, 'presentation'],
      [/\b(resolve|resolver|resolution|did documents?)\b/, 'resolution'],
      [/\b(repository|wallet architecture|storage)\b/, 'wallet'],
      [/\b(verifiable credentials?|vc data model)\b/, 'credentials'],
      [/\b(capstone|end to end)\b/, 'capstone'],
      [/\b(dids?|decentralized identifiers?)\b/, 'did'],
    ];
    const match = topics.find(([pattern]) => pattern.test(question));
    return match ? lessons.find(lesson => lesson.id === match[1]) : null;
  }

  function reply(question, intent) {
    const normalized = question.toLowerCase();
    const topic = lessonTopic(normalized);
    const lesson = topic ?? currentLesson;
    if (intent === 'hint' || /\b(hint|exercise|stuck|starter|fixture|coding)\b/.test(normalized)) {
      return lesson.task + ' Start with this input: ' + lesson.cases[0][0];
    }
    if (intent === 'next' || /\b(next|after this|stretch|advanced)\b/.test(normalized)) {
      return /\b(stretch|advanced)\b/.test(normalized) ? lesson.stretch : lesson.action;
    }
    if (intent === 'explain' || topic || /\b(explain|concept|summari[sz]e|recap|overview)\b/.test(normalized)) {
      return lesson.explain;
    }
    if (/^(hey|hi|hello|thanks|thank you)[!.\s]*$/.test(normalized)) {
      return 'I’m here for ' + currentLesson.short + '. Ask for a recap, a coding hint, or a next step.';
    }
    return 'I can help with the course topics. Try “How does DID resolution work?” or ask for a hint on ' + currentLesson.short + '.';
  }

  function drawMessage({author,text}) {
    const message = document.createElement('p');
    message.className = 'companion-message';
    message.dataset.author = author;
    const speaker = document.createElement('span');
    speaker.className = 'sr-only';
    speaker.textContent = author === 'user' ? 'You: ' : 'Companion: ';
    message.append(speaker, text);
    log.append(message);
  }

  function refreshContext() {
    const lesson = contextLesson();
    if (lesson === currentLesson) return;
    currentLesson = lesson;
    byId('companion-topic').textContent = lesson.short;
    if (!conversations.has(lesson.id)) {
      conversations.set(lesson.id, [{
        author: 'bot',
        text: 'I can explain “' + lesson.short + '”, give you a coding hint, or help you pick your next step.',
      }]);
    }
    log.replaceChildren();
    conversations.get(lesson.id).forEach(drawMessage);
    log.scrollTop = log.scrollHeight;
  }

  function send(question, intent) {
    const value = question.trim();
    if (!value) return;
    const history = conversations.get(currentLesson.id);
    const messages = [{author:'user',text:value}, {author:'bot',text:reply(value,intent)}];
    history.push(...messages);
    messages.forEach(drawMessage);
    if (history.length > 61) {
      history.splice(1,2);
      log.children[1].remove();
      log.children[1].remove();
    }
    log.scrollTop = log.scrollHeight;
  }

  function setChat(open) {
    nudge.hidden = true;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', open);
    trigger.setAttribute('aria-label', open ? 'Close lesson chat' : 'Open lesson chat');
    if (open) {
      refreshContext();
      log.scrollTop = log.scrollHeight;
      close.focus({preventScroll:true});
    } else {
      trigger.focus({preventScroll:true});
    }
  }

  trigger.onclick = () => setChat(panel.hidden);
  close.onclick = () => setChat(false);
  byId('companion-invite').onclick = () => setChat(true);
  byId('companion-dismiss').onclick = () => {
    nudge.hidden = true;
    trigger.focus({preventScroll:true});
  };
  byId('companion-actions').onclick = event => {
    const prompt = event.target.closest('button[data-intent]');
    if (prompt) send(prompt.textContent,prompt.dataset.intent);
  };
  byId('companion-form').onsubmit = event => {
    event.preventDefault();
    send(input.value);
    input.value = '';
  };
  byId('companion').addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.stopPropagation();
      setChat(false);
    }
  });
  window.addEventListener('hashchange', () => {
    if (!panel.hidden) refreshContext();
  });

  let greetingQueued = false;
  function queueGreeting() {
    if (greetingQueued || byId('companion').hidden) return;
    greetingQueued = true;
    try {
      if (sessionStorage.getItem('identity-studio.companion-greeted')) return;
    } catch {
      // The welcome bubble can appear once on this page.
    }
    window.setTimeout(() => {
      if (byId('companion').hidden) {
        greetingQueued = false;
        return;
      }
      if (currentLesson || !panel.hidden || document.body.classList.contains('nav-open')) return;
      try {
        sessionStorage.setItem('identity-studio.companion-greeted', 'yes');
      } catch {
        // The page retains the queued state even without session storage.
      }
      nudge.hidden = false;
      window.setTimeout(() => {
        if (!nudge.contains(document.activeElement)) nudge.hidden = true;
      }, 8000);
    }, 1200);
  }
  window.addEventListener('hashchange',queueGreeting);
  queueGreeting();
})();
