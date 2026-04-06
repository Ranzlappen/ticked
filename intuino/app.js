/* ══════════════════════════════════════════════════════════
   IntuiNO — "Intuitively Wrong."
   Complete Anti-UX Satirical Experience
   ══════════════════════════════════════════════════════════ */

const IntuiNO = {
  // ─── STATE ───
  state: {
    chaosScore: 0,
    currentScreen: 'hero',
    levelsCompleted: [],
    achievements: [],
    levelProgress: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    runawayAttempts: 0,
    gKeyPresses: [],
    l4ProgressValue: 100,
    l5ApplyInterval: null,
    l5ApplyValue: 0,
    swipeCardIndex: 0,
    pinchScale: 1,
    menuOpen: false,
  },

  // ─── LEVEL DEFINITIONS ───
  levels: [
    { id: 1, name: 'Navigation Hell', icon: '🧭', color: 'cyan', desc: 'Links lie. Menus mislead.', required: 6 },
    { id: 2, name: 'Form Fiasco', icon: '📝', color: 'magenta', desc: 'Forms that fight back.', required: 7 },
    { id: 3, name: 'Gesture Gauntlet', icon: '🤌', color: 'purple', desc: 'Swipes, pinches & long-press — all wrong.', required: 6 },
    { id: 4, name: 'Button & CTA Chaos', icon: '🎯', color: 'blue', desc: 'Buttons that flee from your cursor.', required: 7 },
    { id: 5, name: 'Settings Sabotage', icon: '⚙️', color: 'magenta', desc: 'Every toggle does the opposite.', required: 8 },
  ],

  // ─── REVEAL DATA ───
  reveals: {
    1: {
      wrongs: ['Links navigated to wrong destinations', 'Search returned unrelated results', 'Breadcrumbs were unreliable and misleading'],
      rights: ['Navigation should be predictable and consistent', 'Search results must match user queries', 'Breadcrumbs should accurately reflect page hierarchy'],
      lesson: "Jakob's Law states users spend most of their time on other sites, so they expect yours to work the same way. Consistent navigation patterns reduce cognitive load and help users find what they need efficiently."
    },
    2: {
      wrongs: ['Valid input showed error styling (red)', 'Invalid input showed success styling (green)', 'Password visibility toggle worked backwards', 'Terms of Service buttons had swapped colors/meanings', 'Age slider displayed inverted values'],
      rights: ['Green = success/valid, Red = error/invalid universally', 'Password toggle: eye-open = visible, eye-closed = hidden', 'Confirm actions should use primary/positive styling', 'Form controls should respond predictably to input'],
      lesson: "Color carries semantic meaning in UI design. Users have deeply ingrained associations: green means go/success, red means stop/error. Violating these conventions causes confusion and erodes trust. The principle of least surprise means interfaces should behave as users expect."
    },
    3: {
      wrongs: ['Swipe directions were inverted (right=skip, left=like)', 'Pinch-to-zoom worked backwards', 'Long-press triggered visual chaos instead of a context menu'],
      rights: ['Gesture directions should match platform conventions', 'Pinch-out = zoom in, pinch-in = zoom out (natural mapping)', 'Long-press should reveal contextual options, not chaos'],
      lesson: "Gestural interfaces rely on natural mapping — the relationship between controls and their effects should feel intuitive. When gestures violate platform conventions, users feel disoriented. Fitts's Law and direct manipulation principles demand that interactions feel physically natural."
    },
    4: {
      wrongs: ['Buttons fled from the cursor on hover', 'Progress bar went backwards', 'Loading only completed when the "wrong" action was taken', 'Button labels were opposite to their actual function'],
      rights: ['Interactive elements must be easy to target (Fitts\'s Law)', 'Progress indicators should advance toward completion', 'Primary actions should complete expected workflows', 'Labels must accurately describe their action'],
      lesson: "Fitts's Law tells us that the time to reach a target depends on its distance and size. Buttons should be easy to click, not evasive. Progress indicators create trust by showing predictable advancement. Labels are promises — breaking them breaks user trust."
    },
    5: {
      wrongs: ['Toggles performed the opposite action', 'Save/Cancel buttons were functionally swapped', 'Loading stalled until the "abort" button was pressed', 'Delete Account button was harmless, Cancel button saved'],
      rights: ['Toggle states should clearly reflect the current setting', 'Destructive actions need clear, honest labeling and confirmation', 'Loading should complete automatically without requiring workarounds', 'Settings changes should be transparent and predictable'],
      lesson: "The principle of transparency means users should always understand the system's current state. Settings are trust-critical — users rely on them to control their experience. Deceptive patterns (dark patterns) in settings erode user confidence and can violate ethical design principles."
    }
  },

  // ─── ACHIEVEMENTS ───
  achievementDefs: {
    firstChaos:   { icon: '⚡', text: 'First Chaos — Earned 10 chaos points' },
    navNightmare: { icon: '🧭', text: 'Navigation Nightmare — Survived Level 1' },
    formFiller:   { icon: '📝', text: 'Form Filler — Survived Level 2' },
    gestureMaster:{ icon: '🤌', text: 'Gesture Master — Survived Level 3' },
    buttonBasher: { icon: '🎯', text: 'Button Basher — Survived Level 4' },
    settingsSurvivor: { icon: '⚙️', text: 'Settings Survivor — Survived Level 5' },
    chaosChampion: { icon: '👑', text: 'Chaos Champion — Completed all 5 levels' },
    shakeItOff:   { icon: '📱', text: 'Shake It Off — Triggered Good UX Mode' },
  },

  swipeCards: [
    { emoji: '🎨', title: 'Creative Post #1' },
    { emoji: '📸', title: 'Travel Photo #2' },
    { emoji: '🎵', title: 'Music Share #3' },
    { emoji: '🍕', title: 'Food Review #4' },
    { emoji: '🐱', title: 'Cat Video #5' },
  ],

  // ─── PERSISTENCE ───
  save() {
    const d = { chaosScore: this.state.chaosScore, levelsCompleted: this.state.levelsCompleted, achievements: this.state.achievements, levelProgress: this.state.levelProgress };
    localStorage.setItem('intuino', JSON.stringify(d));
  },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('intuino'));
      if (d) {
        this.state.chaosScore = d.chaosScore || 0;
        this.state.levelsCompleted = d.levelsCompleted || [];
        this.state.achievements = d.achievements || [];
        this.state.levelProgress = d.levelProgress || { 1:0, 2:0, 3:0, 4:0, 5:0 };
      }
    } catch(e) {}
  },

  // ─── CHAOS SCORE ───
  addChaos(n) {
    this.state.chaosScore += n;
    this.save();
    const el = document.getElementById('chaos-score-val');
    if (el) {
      el.textContent = this.state.chaosScore;
      gsap.fromTo(el, { scale: 1.4, color: '#ff00e5' }, { scale: 1, color: '#a855f7', duration: 0.4, ease: 'back.out(2)' });
    }
    if (this.state.chaosScore >= 10) this.unlockAchievement('firstChaos');
    this.updateHubStats();
  },

  // ─── LEVEL PROGRESS ───
  levelProg(lvl) {
    this.state.levelProgress[lvl] = (this.state.levelProgress[lvl] || 0) + 1;
    this.save();
    const req = this.levels[lvl - 1].required;
    const cur = this.state.levelProgress[lvl];
    const bar = document.getElementById(`l${lvl}-progress-bar`);
    const txt = document.getElementById(`l${lvl}-progress-text`);
    const btn = document.getElementById(`l${lvl}-complete`);
    if (bar) bar.style.width = Math.min(100, (cur / req) * 100) + '%';
    if (txt) txt.textContent = `${Math.min(cur, req)} / ${req} chaos events`;
    if (cur >= req && btn) {
      btn.classList.remove('hidden');
      gsap.fromTo(btn, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
    }
  },

  completeLevel(lvl) {
    if (!this.state.levelsCompleted.includes(lvl)) {
      this.state.levelsCompleted.push(lvl);
      this.save();
    }
    const achMap = { 1: 'navNightmare', 2: 'formFiller', 3: 'gestureMaster', 4: 'buttonBasher', 5: 'settingsSurvivor' };
    this.unlockAchievement(achMap[lvl]);
    if (this.state.levelsCompleted.length >= 5) this.unlockAchievement('chaosChampion');
    this.showReveal(lvl);
  },

  // ─── TOAST ───
  toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    c.appendChild(t);
    gsap.fromTo(t, { opacity: 0, x: 60, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' });
    setTimeout(() => {
      gsap.to(t, { opacity: 0, x: 60, duration: 0.3, onComplete: () => t.remove() });
    }, 3000);
  },

  // ─── ACHIEVEMENTS ───
  unlockAchievement(id) {
    if (this.state.achievements.includes(id)) return;
    this.state.achievements.push(id);
    this.save();
    const def = this.achievementDefs[id];
    if (!def) return;
    document.getElementById('ach-icon').textContent = def.icon;
    document.getElementById('ach-text').textContent = def.text;
    const popup = document.getElementById('achievement-popup');
    gsap.timeline()
      .to(popup, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' })
      .to(popup, { opacity: 0, y: -20, duration: 0.4, delay: 2.5 });
    this.updateHubStats();
  },

  // ─── NAVIGATION ───
  navigate(screen) {
    const cur = document.getElementById(`screen-${this.state.currentScreen}`);
    const nxt = document.getElementById(`screen-${screen}`);
    if (!nxt || screen === this.state.currentScreen) return;

    const topbar = document.getElementById('topbar');
    if (screen !== 'hero') {
      gsap.to(topbar, { y: 0, duration: 0.4, ease: 'power2.out' });
    }

    gsap.to(cur, { opacity: 0, y: -30, duration: 0.3, ease: 'power2.in', onComplete: () => {
      cur.classList.add('hidden');
      nxt.classList.remove('hidden');
      gsap.fromTo(nxt, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      this.state.currentScreen = screen;

      if (screen === 'hub') this.renderHub();
      if (screen === 'level4') this.startLevel4();
      if (screen === 'level5') this.startLevel5();
    }});
  },

  // ─── HUB ───
  renderHub() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    const colors = { cyan: ['rgba(0,240,255,.08)', 'rgba(0,240,255,.3)'], magenta: ['rgba(255,0,229,.08)', 'rgba(255,0,229,.3)'], purple: ['rgba(168,85,247,.08)', 'rgba(168,85,247,.3)'], blue: ['rgba(59,130,246,.08)', 'rgba(59,130,246,.3)'] };
    this.levels.forEach(lv => {
      const done = this.state.levelsCompleted.includes(lv.id);
      const c = colors[lv.color] || colors.cyan;
      const card = document.createElement('div');
      card.className = 'level-card glass-card p-6 cursor-pointer';
      card.style.setProperty('--card-glow', c[0]);
      card.style.setProperty('--card-border', c[1]);
      card.innerHTML = `
        <span class="text-4xl block mb-3">${lv.icon}</span>
        <h3 class="text-lg font-bold mb-1">${lv.name}</h3>
        <p class="text-xs text-white/40 mb-3">${lv.desc}</p>
        <div class="flex items-center gap-2">
          <span class="text-xs px-2 py-0.5 rounded-full ${done ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'}">${done ? '✓ Complete' : 'Level ' + lv.id}</span>
          <span class="text-xs text-white/20">${this.state.levelProgress[lv.id] || 0} / ${lv.required}</span>
        </div>`;
      card.addEventListener('click', () => this.navigate('level' + lv.id));
      grid.appendChild(card);
      gsap.fromTo(card, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, delay: lv.id * 0.08, ease: 'power2.out' });
    });
    this.updateHubStats();
  },

  updateHubStats() {
    const el1 = document.getElementById('hub-chaos');
    const el2 = document.getElementById('hub-levels');
    const el3 = document.getElementById('hub-achievements');
    if (el1) el1.textContent = this.state.chaosScore;
    if (el2) el2.textContent = this.state.levelsCompleted.length + '/5';
    if (el3) el3.textContent = this.state.achievements.length;
  },

  // ─── REVEAL SCREEN ───
  showReveal(lvl) {
    const data = this.reveals[lvl];
    const lv = this.levels[lvl - 1];
    document.getElementById('reveal-icon').textContent = lv.icon;
    document.getElementById('reveal-title').textContent = lv.name + ' — Complete!';
    document.getElementById('reveal-subtitle').textContent = 'You survived the chaos.';
    const wrongs = document.getElementById('reveal-wrongs');
    wrongs.innerHTML = data.wrongs.map(w => `<li class="flex gap-2"><span class="text-red-400 shrink-0">✗</span>${w}</li>`).join('');
    const rights = document.getElementById('reveal-rights');
    rights.innerHTML = data.rights.map(r => `<li class="flex gap-2"><span class="text-green-400 shrink-0">✓</span>${r}</li>`).join('');
    document.getElementById('reveal-lesson').textContent = data.lesson;
    const earned = this.state.levelProgress[lvl] * 5;
    document.getElementById('reveal-chaos').textContent = '+' + earned;
    this.navigate('reveal');
  },

  // ─── THEME TOGGLE (OPPOSITE) ───
  initTheme() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const html = document.documentElement;
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        document.getElementById('theme-toggle').textContent = '☀️';
        this.toast('You wanted dark mode? Here\'s light mode.', 'warn');
      } else {
        html.classList.add('dark');
        document.getElementById('theme-toggle').textContent = '🌙';
        this.toast('You wanted light mode? Back to dark.', 'warn');
      }
      this.addChaos(3);
    });
  },

  // ─── SABOTAGED MENU ───
  initMenu() {
    const menu = document.getElementById('sabotaged-menu');
    const panel = menu.querySelector('.absolute.right-0');
    let closeAttempts = 0;

    document.getElementById('menu-btn').addEventListener('click', () => {
      if (this.state.menuOpen) return;
      this.state.menuOpen = true;
      menu.classList.remove('pointer-events-none');
      gsap.to(menu, { opacity: 1, duration: 0.3 });
      gsap.to(panel, { x: 0, duration: 0.4, ease: 'power2.out' });
      closeAttempts = 0;
    });

    const closeMenu = () => {
      closeAttempts++;
      if (closeAttempts === 1 && Math.random() < 0.3) {
        this.toast('Close button didn\'t work. Try again?', 'warn');
        this.addChaos(2);
        return;
      }
      this.state.menuOpen = false;
      gsap.to(panel, { x: '100%', duration: 0.3, ease: 'power2.in' });
      gsap.to(menu, { opacity: 0, duration: 0.3, delay: 0.1, onComplete: () => menu.classList.add('pointer-events-none') });
    };
    document.getElementById('menu-close').addEventListener('click', closeMenu);
    menu.querySelector('.absolute.inset-0').addEventListener('click', closeMenu);

    menu.querySelectorAll('.menu-link[data-nav]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targets = ['hub', 'hero', 'level1', 'level3'];
        const target = targets[Math.floor(Math.random() * targets.length)];
        closeMenu();
        setTimeout(() => {
          this.navigate(target);
          this.addChaos(3);
          this.toast('Menu sent you somewhere unexpected.', 'warn');
        }, 400);
      });
    });
  },

  // ─── HERO ───
  initHero() {
    gsap.fromTo('.orb-1', { x: 0, y: 0 }, { x: 30, y: -20, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.fromTo('.orb-2', { x: 0, y: 0 }, { x: -25, y: 15, duration: 8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.fromTo('.orb-3', { x: 0, y: 0 }, { x: 15, y: 25, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo('#screen-hero h1', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .fromTo('#screen-hero p', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out' }, '-=0.3')
      .fromTo('#hero-cta', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, '-=0.2');

    document.getElementById('hero-cta').addEventListener('click', () => {
      this.addChaos(5);
      this.toast('You didn\'t skip anything. Welcome to IntuiNO.', 'info');
      this.navigate('hub');
    });
  },

  // ─── LEVEL 1: NAVIGATION HELL ───
  initLevel1() {
    const searchMap = {
      'profile': 'Here\'s the weather forecast for Mars.',
      'settings': 'Top 10 cat memes of 2024.',
      'messages': 'A recipe for invisible soup.',
      'home': 'Directions to the nearest black hole.',
      'help': 'A documentary about confused penguins.',
      'search': 'Did you mean: "don\'t search"?',
      'discover': 'Your horoscope says: try again.',
      'notifications': 'A live stream of paint drying.',
    };
    const defaultResults = ['A random Wikipedia article about turnips', 'How to unboil an egg (impossible)', 'The sound of one hand clapping'];

    document.getElementById('l1-search').addEventListener('input', (e) => {
      const v = e.target.value.toLowerCase().trim();
      const results = document.getElementById('l1-search-results');
      if (!v) { results.classList.add('hidden'); return; }
      results.classList.remove('hidden');
      let items = [];
      Object.keys(searchMap).forEach(k => {
        if (v.includes(k) || k.includes(v)) items.push(searchMap[k]);
      });
      if (items.length === 0) items = defaultResults;
      results.innerHTML = items.map(i => `<div class="glass-card p-3 mb-2 text-sm text-white/60 cursor-pointer hover:border-neon-cyan/30 transition">${i}</div>`).join('');
      results.querySelectorAll('.glass-card').forEach(el => {
        el.addEventListener('click', () => {
          this.addChaos(3);
          this.levelProg(1);
          this.toast('That wasn\'t what you searched for.', 'warn');
        });
      });
    });

    const navTargets = { profile: 'Settings', messages: 'Discover', settings: 'Messages', discover: 'Profile' };
    document.querySelectorAll('.nav-hell-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const wrong = navTargets[target] || 'Nowhere';
        this.addChaos(4);
        this.levelProg(1);
        this.toast(`Clicked ${target} — you\'ve been taken to ${wrong}!`, 'warn');
        gsap.fromTo(btn, { scale: 0.95, borderColor: 'rgba(255,0,229,.5)' }, { scale: 1, borderColor: 'rgba(255,255,255,.06)', duration: 0.4 });
      });
    });

    document.getElementById('l1-complete').addEventListener('click', () => this.completeLevel(1));
  },

  // ─── LEVEL 2: FORM FIASCO ───
  initLevel2() {
    const uname = document.getElementById('l2-username');
    const email = document.getElementById('l2-email');
    const pw = document.getElementById('l2-password');
    const eye = document.getElementById('l2-eye');
    const age = document.getElementById('l2-age');
    let eyeTriggered = false, unameTriggered = false, emailTriggered = false, ageTriggered = false;

    // Reversed username validation
    uname.addEventListener('input', () => {
      const v = uname.value;
      if (v.length > 2 && /^[a-zA-Z0-9_]+$/.test(v)) {
        uname.classList.add('input-valid'); uname.classList.remove('input-invalid');
        document.getElementById('l2-username-hint').textContent = 'Invalid username format.';
        document.getElementById('l2-username-hint').className = 'text-xs mt-1 text-red-400';
      } else if (v.length > 0) {
        uname.classList.add('input-invalid'); uname.classList.remove('input-valid');
        document.getElementById('l2-username-hint').textContent = 'Perfect username!';
        document.getElementById('l2-username-hint').className = 'text-xs mt-1 text-green-400';
      } else {
        uname.classList.remove('input-valid', 'input-invalid');
        document.getElementById('l2-username-hint').textContent = 'Choose something memorable.';
        document.getElementById('l2-username-hint').className = 'text-xs mt-1 text-white/30';
      }
      if (!unameTriggered && v.length > 2) { unameTriggered = true; this.addChaos(2); this.levelProg(2); }
    });

    // Reversed email validation
    email.addEventListener('input', () => {
      const v = email.value;
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (valid) {
        email.classList.add('input-valid'); email.classList.remove('input-invalid');
        document.getElementById('l2-email-hint').textContent = 'That doesn\'t look like an email.';
        document.getElementById('l2-email-hint').className = 'text-xs mt-1 text-red-400';
      } else if (v.length > 0) {
        email.classList.add('input-invalid'); email.classList.remove('input-valid');
        document.getElementById('l2-email-hint').textContent = 'Excellent email address!';
        document.getElementById('l2-email-hint').className = 'text-xs mt-1 text-green-400';
      } else {
        email.classList.remove('input-valid', 'input-invalid');
        document.getElementById('l2-email-hint').textContent = 'We\'ll never share your email. Promise.';
        document.getElementById('l2-email-hint').className = 'text-xs mt-1 text-white/30';
      }
      if (!emailTriggered && v.length > 3) { emailTriggered = true; this.addChaos(2); this.levelProg(2); }
    });

    // Password eye (opposite)
    eye.addEventListener('click', () => {
      if (pw.type === 'text') {
        pw.type = 'password';
        document.getElementById('l2-pw-hint').textContent = 'Password hidden — click the eye to show it. (Still opposite.)';
        document.getElementById('l2-pw-hint').className = 'text-xs mt-1 text-neon-cyan';
      } else {
        pw.type = 'text';
        document.getElementById('l2-pw-hint').textContent = 'Password is visible — click the eye to hide it. (The eye does the opposite.)';
        document.getElementById('l2-pw-hint').className = 'text-xs mt-1 text-green-400';
      }
      if (!eyeTriggered) { eyeTriggered = true; this.addChaos(3); this.levelProg(2); this.toast('The eye icon works backwards here.', 'info'); }
    });

    // Age slider (inverted display)
    age.addEventListener('input', () => {
      const inverted = 101 - parseInt(age.value);
      document.getElementById('l2-age-val').textContent = inverted;
      if (!ageTriggered) { ageTriggered = true; this.addChaos(2); this.levelProg(2); this.toast('The age slider moves in mysterious ways.', 'warn'); }
    });

    // Terms (swapped)
    document.getElementById('l2-agree-no').addEventListener('click', () => {
      this.addChaos(3); this.levelProg(2);
      this.toast('You clicked "No" but actually agreed! Green means no here.', 'info');
    });
    document.getElementById('l2-agree-yes').addEventListener('click', () => {
      this.addChaos(3); this.levelProg(2);
      this.toast('You clicked "Yes" but actually declined! Red means yes here.', 'info');
    });

    // Submit
    document.getElementById('l2-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addChaos(5); this.levelProg(2);
      this.toast('Form submitted! (Nothing was actually saved.)', 'success');
    });

    document.getElementById('l2-complete').addEventListener('click', () => this.completeLevel(2));
  },

  // ─── LEVEL 3: GESTURE GAUNTLET ───
  initLevel3() {
    const area = document.getElementById('l3-swipe-area');
    const card = document.getElementById('l3-swipe-card');
    let startX = 0, currentX = 0, dragging = false;

    const updateSwipeCard = () => {
      const sc = this.swipeCards[this.state.swipeCardIndex % this.swipeCards.length];
      document.getElementById('l3-card-emoji').textContent = sc.emoji;
      document.getElementById('l3-card-title').textContent = sc.title;
    };

    const onStart = (x) => { startX = x; currentX = x; dragging = true; };
    const onMove = (x) => {
      if (!dragging) return;
      currentX = x;
      const diff = currentX - startX;
      gsap.set(card, { x: diff, rotation: diff * 0.05 });
      const likeLabel = document.getElementById('l3-label-like');
      const skipLabel = document.getElementById('l3-label-skip');
      // INVERTED: moving right shows SKIP, moving left shows LIKE
      gsap.set(skipLabel, { opacity: Math.max(0, diff / 100) });
      gsap.set(likeLabel, { opacity: Math.max(0, -diff / 100) });
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const diff = currentX - startX;
      if (Math.abs(diff) > 80) {
        // INVERTED: right swipe = skip, left swipe = like
        const action = diff > 0 ? 'skipped' : 'liked';
        this.addChaos(3); this.levelProg(3);
        this.toast(`You ${action} it! (Directions are inverted.)`, 'info');
        gsap.to(card, { x: diff > 0 ? 300 : -300, opacity: 0, duration: 0.3, onComplete: () => {
          this.state.swipeCardIndex++;
          updateSwipeCard();
          gsap.set(card, { x: 0, opacity: 1, rotation: 0 });
          gsap.set('#l3-label-like', { opacity: 0 });
          gsap.set('#l3-label-skip', { opacity: 0 });
        }});
      } else {
        gsap.to(card, { x: 0, rotation: 0, duration: 0.3, ease: 'back.out(2)' });
        gsap.to('#l3-label-like', { opacity: 0, duration: 0.2 });
        gsap.to('#l3-label-skip', { opacity: 0, duration: 0.2 });
      }
    };

    card.addEventListener('mousedown', (e) => onStart(e.clientX));
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('mouseup', onEnd);
    card.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchend', onEnd);

    // Pinch-to-zoom (inverted) - scroll wheel for desktop
    const pinchArea = document.getElementById('l3-pinch-area');
    const pinchContent = document.getElementById('l3-pinch-content');
    let pinchTriggered = false;

    pinchArea.addEventListener('wheel', (e) => {
      e.preventDefault();
      // INVERTED: scroll up (negative deltaY) = zoom OUT, scroll down = zoom IN
      this.state.pinchScale += e.deltaY * 0.003;
      this.state.pinchScale = Math.max(0.3, Math.min(3, this.state.pinchScale));
      gsap.to(pinchContent, { scale: this.state.pinchScale, duration: 0.2 });
      if (!pinchTriggered) { pinchTriggered = true; this.addChaos(3); this.levelProg(3); this.toast('Zoom is inverted. Naturally.', 'info'); }
    }, { passive: false });

    // Touch pinch (inverted)
    let lastPinchDist = 0;
    pinchArea.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    pinchArea.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = dist - lastPinchDist;
        // INVERTED: fingers apart (positive delta) = zoom OUT, fingers together = zoom IN
        this.state.pinchScale -= delta * 0.005;
        this.state.pinchScale = Math.max(0.3, Math.min(3, this.state.pinchScale));
        gsap.to(pinchContent, { scale: this.state.pinchScale, duration: 0.1 });
        lastPinchDist = dist;
        if (!pinchTriggered) { pinchTriggered = true; this.addChaos(3); this.levelProg(3); this.toast('Pinch zoom is inverted!', 'info'); }
      }
    }, { passive: true });

    // Long press
    const lpBtn = document.getElementById('l3-longpress');
    let lpTimer = null, lpTriggered = false;
    const startLP = () => {
      lpTimer = setTimeout(() => {
        const section = document.getElementById('screen-level3');
        section.classList.add('chaos-shake', 'chaos-invert');
        this.addChaos(5); this.levelProg(3);
        this.toast('Long-press triggered visual chaos!', 'error');
        if (!lpTriggered) lpTriggered = true;
        setTimeout(() => section.classList.remove('chaos-shake', 'chaos-invert'), 2000);
      }, 800);
    };
    const cancelLP = () => clearTimeout(lpTimer);
    lpBtn.addEventListener('mousedown', startLP);
    lpBtn.addEventListener('mouseup', cancelLP);
    lpBtn.addEventListener('mouseleave', cancelLP);
    lpBtn.addEventListener('touchstart', startLP, { passive: true });
    lpBtn.addEventListener('touchend', cancelLP);

    document.getElementById('l3-complete').addEventListener('click', () => this.completeLevel(3));
  },

  // ─── LEVEL 4: BUTTON & CTA CHAOS ───
  initLevel4() {
    // Runaway button
    const chaseArea = document.getElementById('l4-chase-area');
    const runBtn = document.getElementById('l4-runaway-btn');

    const flee = () => {
      this.state.runawayAttempts++;
      if (this.state.runawayAttempts >= 5) return; // Let it be caught after 5 tries
      const rect = chaseArea.getBoundingClientRect();
      const maxX = rect.width - runBtn.offsetWidth - 10;
      const maxY = rect.height - runBtn.offsetHeight - 10;
      const nx = Math.random() * maxX;
      const ny = Math.random() * maxY;
      gsap.to(runBtn, { left: nx, top: ny, transform: 'none', duration: 0.25, ease: 'power2.out' });
    };

    runBtn.addEventListener('mouseenter', flee);
    runBtn.addEventListener('touchstart', (e) => {
      if (this.state.runawayAttempts < 5) { e.preventDefault(); flee(); }
    }, { passive: false });
    runBtn.addEventListener('click', () => {
      this.addChaos(5); this.levelProg(4);
      this.toast('You caught the button! It took ' + this.state.runawayAttempts + ' attempts.', 'success');
      gsap.to(runBtn, { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1 });
    });

    // Opposite label buttons
    const realActions = { delete: 'Actually deleted your data!', save: 'Actually saved it (you clicked Delete)!', unmute: 'Actually unmuted (you clicked Mute)!', mute: 'Actually muted (you clicked Unmute)!' };
    document.querySelectorAll('.opposite-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const real = btn.dataset.real;
        this.addChaos(3); this.levelProg(4);
        this.toast(realActions[real] || 'Opposite action triggered!', 'warn');
        gsap.fromTo(btn, { scale: 0.93 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
      });
    });

    document.getElementById('l4-complete').addEventListener('click', () => this.completeLevel(4));
  },

  startLevel4() {
    this.state.runawayAttempts = 0;
    this.state.l4ProgressValue = 100;
    const bar = document.getElementById('l4-fake-progress');
    const txt = document.getElementById('l4-loading-text');
    bar.style.width = '100%';

    // Backwards progress bar
    const interval = setInterval(() => {
      if (this.state.currentScreen !== 'level4') { clearInterval(interval); return; }
      this.state.l4ProgressValue -= Math.random() * 3;
      if (this.state.l4ProgressValue < 5) this.state.l4ProgressValue = 5;
      bar.style.width = this.state.l4ProgressValue + '%';
      txt.textContent = Math.round(this.state.l4ProgressValue) + '% — Going backwards...';
    }, 200);

    // Wrong action completes loading
    document.getElementById('l4-wrong-action').onclick = () => {
      clearInterval(interval);
      this.state.l4ProgressValue = 100;
      bar.style.width = '100%';
      bar.style.background = 'linear-gradient(to right, #22c55e, #00f0ff)';
      txt.textContent = '100% — Complete! (Canceling finished the download.)';
      this.addChaos(5); this.levelProg(4);
      this.toast('Pressing "Cancel" completed the download!', 'info');
    };
  },

  // ─── LEVEL 5: SETTINGS SABOTAGE ───
  initLevel5() {
    const settingNames = { dark: 'Dark Mode', notif: 'Notifications', sound: 'Sound Effects', autosave: 'Auto-Save', privacy: 'Privacy Mode' };
    document.querySelectorAll('.sab-check').forEach(chk => {
      chk.addEventListener('change', () => {
        const name = settingNames[chk.dataset.setting] || chk.dataset.setting;
        const msg = chk.checked ? `${name} has been disabled.` : `${name} has been enabled.`;
        this.addChaos(2); this.levelProg(5);
        this.toast(msg, 'warn');
      });
    });

    // Swapped save/cancel
    document.getElementById('l5-save-cancel').addEventListener('click', () => {
      this.addChaos(4); this.levelProg(5);
      this.toast('Settings saved! (You clicked Cancel.)', 'success');
    });
    document.getElementById('l5-save-confirm').addEventListener('click', () => {
      this.addChaos(4); this.levelProg(5);
      this.toast('Nothing was deleted. Settings unchanged. (You clicked Delete Account.)', 'info');
    });

    document.getElementById('l5-complete').addEventListener('click', () => this.completeLevel(5));
  },

  startLevel5() {
    this.state.l5ApplyValue = 0;
    const bar = document.getElementById('l5-apply-bar');
    const txt = document.getElementById('l5-apply-text');
    bar.style.width = '0%';

    if (this.state.l5ApplyInterval) clearInterval(this.state.l5ApplyInterval);
    this.state.l5ApplyInterval = setInterval(() => {
      if (this.state.currentScreen !== 'level5') { clearInterval(this.state.l5ApplyInterval); return; }
      if (this.state.l5ApplyValue < 78) {
        this.state.l5ApplyValue += Math.random() * 2;
        bar.style.width = this.state.l5ApplyValue + '%';
        txt.textContent = Math.round(this.state.l5ApplyValue) + '% — Applying settings...';
      } else {
        txt.textContent = '78% — Stalled. Something seems wrong...';
      }
    }, 150);

    document.getElementById('l5-apply-wait').onclick = () => {
      this.addChaos(2); this.levelProg(5);
      this.toast('Still waiting... Nothing happened.', 'warn');
    };
    document.getElementById('l5-apply-abort').onclick = () => {
      clearInterval(this.state.l5ApplyInterval);
      this.state.l5ApplyValue = 100;
      bar.style.width = '100%';
      bar.style.background = 'linear-gradient(to right, #22c55e, #a855f7)';
      txt.textContent = '100% — Settings applied! Aborting was the right wrong choice.';
      this.addChaos(5); this.levelProg(5);
      this.toast('Aborting completed the settings! Of course.', 'info');
    };
  },

  // ─── DEVICE SHAKE / GOOD UX MODE ───
  initShake() {
    let lastShake = 0;
    const triggerGoodUX = () => {
      if (Date.now() - lastShake < 6000) return;
      lastShake = Date.now();
      this.addChaos(5);
      this.unlockAchievement('shakeItOff');
      const overlay = document.getElementById('good-ux-overlay');
      gsap.to(overlay, { opacity: 1, duration: 0.4, onComplete: () => {
        setTimeout(() => {
          gsap.to(overlay, { opacity: 0, duration: 0.4 });
        }, 4000);
      }});
      this.toast('Good UX Mode activated for 4 seconds!', 'success');
    };

    // Device motion
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (e) => {
        const acc = e.accelerationIncludingGravity;
        if (acc && (Math.abs(acc.x) > 15 || Math.abs(acc.y) > 15 || Math.abs(acc.z) > 25)) {
          triggerGoodUX();
        }
      });
    }

    // Desktop: press 'g' 3 times quickly
    document.addEventListener('keydown', (e) => {
      if (e.key === 'g' || e.key === 'G') {
        this.state.gKeyPresses.push(Date.now());
        this.state.gKeyPresses = this.state.gKeyPresses.filter(t => Date.now() - t < 1000);
        if (this.state.gKeyPresses.length >= 3) {
          this.state.gKeyPresses = [];
          triggerGoodUX();
        }
      }
    });
  },

  // ─── GLOBAL LISTENERS ───
  initGlobalListeners() {
    // All back buttons and data-nav links
    document.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-nav]');
      if (navEl) {
        e.preventDefault();
        this.navigate(navEl.dataset.nav);
      }
    });
  },

  // ─── INIT ───
  init() {
    this.load();
    document.getElementById('chaos-score-val').textContent = this.state.chaosScore;

    this.initHero();
    this.initTheme();
    this.initMenu();
    this.initLevel1();
    this.initLevel2();
    this.initLevel3();
    this.initLevel4();
    this.initLevel5();
    this.initShake();
    this.initGlobalListeners();
  }
};

document.addEventListener('DOMContentLoaded', () => IntuiNO.init());
