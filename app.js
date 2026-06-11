/**
 * Productivity Dashboard — Unified Application Script
 * Modules: StateManager, ClockModule, SearchModule, ModalController,
 *          AIAssistantsModule, FavoriteLinksModule, TodoModule,
 *          NotepadModule, PomodoroModule
 */

/* ================================================================
   STATE MANAGER
   ================================================================ */
const StateManager = {
  storageKey: 'productivityDashboard',

  defaults: {
    todos: [],
    notepad: '',
    preferredSearchEngine: 'google',
    favoriteLinks: [],
    pomodoro: {
      timeRemaining: 25 * 60,
      isRunning: false,
      isWork: true,
      endTime: null
    }
  },

  async load() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const data = result[this.storageKey];
      if (data && typeof data === 'object') {
        return this.mergeDefaults(data);
      }
    } catch (e) {
      console.error('[StateManager] Failed to load:', e);
    }
    return structuredClone(this.defaults);
  },

  async save(state) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: state });
    } catch (e) {
      console.error('[StateManager] Failed to save:', e);
    }
  },

  mergeDefaults(data) {
    return {
      todos: Array.isArray(data.todos) ? data.todos : [...this.defaults.todos],
      notepad: typeof data.notepad === 'string' ? data.notepad : this.defaults.notepad,
      preferredSearchEngine: typeof data.preferredSearchEngine === 'string'
        ? data.preferredSearchEngine
        : this.defaults.preferredSearchEngine,
      favoriteLinks: Array.isArray(data.favoriteLinks) ? data.favoriteLinks : [...this.defaults.favoriteLinks],
      pomodoro: {
        timeRemaining: typeof data.pomodoro?.timeRemaining === 'number'
          ? data.pomodoro.timeRemaining
          : this.defaults.pomodoro.timeRemaining,
        isRunning: Boolean(data.pomodoro?.isRunning),
        isWork: typeof data.pomodoro?.isWork === 'boolean'
          ? data.pomodoro.isWork
          : this.defaults.pomodoro.isWork,
        endTime: data.pomodoro?.endTime ?? null
      }
    };
  }
};

/* ================================================================
   CLOCK MODULE
   ================================================================ */
const ClockModule = {
  elements: {},

  init() {
    this.elements = {
      clock: document.getElementById('clock'),
      date: document.getElementById('date')
    };

    this.update();
    setInterval(() => this.update(), 1000);
  },

  update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    this.elements.clock.textContent = `${hours}:${minutes}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.elements.date.textContent = now.toLocaleDateString(undefined, options);
  }
};

/* ================================================================
   SEARCH MODULE
   ================================================================ */
const SearchModule = {
  engines: {
    google: { name: 'Google', url: 'https://www.google.com/search?q=' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
    duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    perplexity: { name: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' },
    brave: { name: 'Brave', url: 'https://search.brave.com/search?q=' }
  },

  elements: {},

  init(preferredEngine = 'google') {
    this.elements = {
      form: document.getElementById('search-form'),
      input: document.getElementById('search-input'),
      select: document.getElementById('search-engine')
    };

    this.elements.select.value = this.engines[preferredEngine] ? preferredEngine : 'google';
    this.bindEvents();
  },

  bindEvents() {
    this.elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.performSearch();
    });

    this.elements.select.addEventListener('change', () => {
      this.persistEngine();
    });
  },

  performSearch() {
    const query = this.elements.input.value.trim();
    if (!query) {
      this.elements.input.focus();
      return;
    }

    const engineKey = this.elements.select.value;
    const engine = this.engines[engineKey] || this.engines.google;
    const searchUrl = engine.url + encodeURIComponent(query);

    window.open(searchUrl, '_blank');
    this.elements.input.value = '';
  },

  persistEngine() {
    const engineKey = this.elements.select.value;
    StateManager.load().then((state) => {
      state.preferredSearchEngine = engineKey;
      StateManager.save(state);
    });
  }
};

/* ================================================================
   MODAL CONTROLLER
   ================================================================ */
const ModalController = {
  activeModal: null,

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal);
      }
    });

    document.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        const modal = el.closest('.modal');
        if (modal) this.close(modal);
      });
    });
  },

  open(modal) {
    if (typeof modal === 'string') {
      modal = document.getElementById(modal);
    }
    if (!modal) return;

    this.activeModal = modal;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  },

  close(modal) {
    if (typeof modal === 'string') {
      modal = document.getElementById(modal);
    }
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    this.activeModal = null;
  }
};

/* ================================================================
   AI ASSISTANTS MODULE
   ================================================================ */
const AIAssistantsModule = {
  assistants: [
    { label: 'ChatGPT', url: 'https://chat.openai.com', color: '#10a37f', initial: 'C' },
    { label: 'Claude', url: 'https://claude.ai', color: '#cc785c', initial: 'Cl' },
    { label: 'Copilot', url: 'https://copilot.microsoft.com', color: '#0ea5e9', initial: 'Co' },
    { label: 'DeepSeek', url: 'https://chat.deepseek.com', color: '#4f46e5', initial: 'D' },
    { label: 'Doubao', url: 'https://www.doubao.com', color: '#3b82f6', initial: 'Db' },
    { label: 'Ernie Bot', url: 'https://yiyan.baidu.com', color: '#6366f1', initial: 'E' },
    { label: 'Gemini', url: 'https://gemini.google.com', color: '#4285f4', initial: 'G' },
    { label: 'GigaChat', url: 'https://giga.chat', color: '#8b5cf6', initial: 'Gc' },
    { label: 'Grok', url: 'https://grok.x.ai', color: '#ef4444', initial: 'Gr' },
    { label: 'HKChat', url: 'https://hkchat.ai', color: '#14b8a6', initial: 'H' },
    { label: 'Leo', url: 'https://brave.com/leo', color: '#f59e0b', initial: 'L' },
    { label: 'Meta AI', url: 'https://www.meta.ai', color: '#0668e1', initial: 'M' },
    { label: 'Perplexity AI', url: 'https://www.perplexity.ai', color: '#22d3ee', initial: 'P' },
    { label: 'Qwen', url: 'https://qwenlm.ai', color: '#7c3aed', initial: 'Q' }
  ],

  elements: {},

  init() {
    this.elements = {
      grid: document.getElementById('ai-grid'),
      trigger: document.getElementById('btn-ai-assistants')
    };

    this.render();
    this.bindEvents();
  },

  bindEvents() {
    this.elements.trigger.addEventListener('click', () => {
      ModalController.open('modal-ai');
    });
  },

  render() {
    const { grid } = this.elements;
    grid.innerHTML = '';

    this.assistants.forEach((ai) => {
      const a = document.createElement('a');
      a.className = 'ai-item';
      a.href = ai.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', ai.label);

      const icon = document.createElement('div');
      icon.className = 'ai-icon';
      icon.style.backgroundColor = ai.color;
      icon.textContent = ai.initial;

      const label = document.createElement('span');
      label.className = 'ai-label';
      label.textContent = ai.label;

      a.appendChild(icon);
      a.appendChild(label);
      grid.appendChild(a);
    });
  }
};

/* ================================================================
   FAVORITE LINKS MODULE
   ================================================================ */
const FavoriteLinksModule = {
  links: [],

  elements: {},

  init(links = []) {
    this.links = links.map((link) => ({
      ...link,
      showOnHomepage: typeof link.showOnHomepage === 'boolean' ? link.showOnHomepage : false
    }));
    this.elements = {
      list: document.getElementById('links-list'),
      form: document.getElementById('add-link-form'),
      labelInput: document.getElementById('link-label'),
      urlInput: document.getElementById('link-url'),
      homepageCheckbox: document.getElementById('link-homepage'),
      trigger: document.getElementById('btn-my-links'),
      strip: document.getElementById('links-strip')
    };

    this.render();
    this.renderStrip();
    this.bindEvents();
  },

  bindEvents() {
    this.elements.trigger.addEventListener('click', () => {
      ModalController.open('modal-links');
    });

    this.elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.add();
    });
  },

  add() {
    const label = this.elements.labelInput.value.trim();
    let url = this.elements.urlInput.value.trim();
    const showOnHomepage = this.elements.homepageCheckbox.checked;
    
    if (!label || !url) return;

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const link = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      url,
      showOnHomepage,
      createdAt: Date.now()
    };

    this.links.unshift(link);
    this.elements.labelInput.value = '';
    this.elements.urlInput.value = '';
    this.elements.homepageCheckbox.checked = false;
    this.elements.labelInput.focus();
    this.render();
    this.renderStrip();
    this.persist();
  },

  delete(id) {
    this.links = this.links.filter((l) => l.id !== id);
    this.render();
    this.renderStrip();
    this.persist();
  },

  persist() {
    StateManager.load().then((state) => {
      state.favoriteLinks = this.links;
      StateManager.save(state);
    });
  },

  toggleHomepage(id) {
    const link = this.links.find((l) => l.id === id);
    if (link) {
      link.showOnHomepage = !link.showOnHomepage;
      this.render();
      this.renderStrip();
      this.persist();
    }
  },

  render() {
    const { list } = this.elements;
    list.innerHTML = '';

    if (this.links.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'links-empty';
      empty.textContent = 'No saved links yet. Add one above!';
      list.appendChild(empty);
      return;
    }

    this.links.forEach((link) => {
      const li = document.createElement('li');
      li.className = 'link-item';

      const anchor = document.createElement('a');
      anchor.className = 'link-anchor';
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = link.label;
      anchor.title = link.url;

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = `link-toggle${link.showOnHomepage ? ' active' : ''}`;
      toggleBtn.setAttribute('aria-label', `${link.showOnHomepage ? 'Remove from' : 'Add to'} home page`);
      toggleBtn.setAttribute('title', link.showOnHomepage ? 'Remove from home page' : 'Add to home page');
      toggleBtn.innerHTML = link.showOnHomepage ? '★' : '☆';
      toggleBtn.addEventListener('click', () => this.toggleHomepage(link.id));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'link-delete';
      delBtn.setAttribute('aria-label', `Delete "${link.label}"`);
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', () => this.delete(link.id));

      li.appendChild(anchor);
      li.appendChild(toggleBtn);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  },

  renderStrip() {
    const { strip } = this.elements;
    const homepageLinks = this.links.filter((l) => l.showOnHomepage);

    strip.innerHTML = '';

    if (homepageLinks.length === 0) {
      strip.classList.remove('active');
      return;
    }

    strip.classList.add('active');

    homepageLinks.forEach((link) => {
      const a = document.createElement('a');
      a.className = 'strip-link';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = link.url;
      a.textContent = link.label;
      strip.appendChild(a);
    });
  }
};

/* ================================================================
   TODO MODULE
   ================================================================ */
const TodoModule = {
  todos: [],

  elements: {},

  init(todos = []) {
    this.todos = todos;
    this.elements = {
      input: document.getElementById('todo-input'),
      addBtn: document.getElementById('todo-add'),
      list: document.getElementById('todo-list')
    };

    this.bindEvents();
    this.render();
  },

  bindEvents() {
    this.elements.addBtn.addEventListener('click', () => this.add());
    this.elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.add();
    });
  },

  add() {
    const text = this.elements.input.value.trim();
    if (!text) return;

    const task = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      completed: false,
      createdAt: Date.now()
    };

    this.todos.unshift(task);
    this.elements.input.value = '';
    this.render();
    this.persist();
  },

  toggle(id) {
    const task = this.todos.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.render();
      this.persist();
    }
  },

  delete(id) {
    this.todos = this.todos.filter((t) => t.id !== id);
    this.render();
    this.renderStrip();
    this.persist();
  },

  toggleHomepage(id) {
    const link = this.links.find((l) => l.id === id);
    if (link) {
      link.showOnHomepage = !link.showOnHomepage;
      this.render();
      this.renderStrip();
      this.persist();
    }
  },

  persist() {
    StateManager.load().then((state) => {
      state.todos = this.todos;
      StateManager.save(state);
    });
  },

  render() {
    const { list } = this.elements;
    list.innerHTML = '';

    if (this.todos.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'todo-empty';
      empty.textContent = 'No tasks yet. Add one above!';
      list.appendChild(empty);
      return;
    }

    const sorted = [
      ...this.todos.filter((t) => !t.completed),
      ...this.todos.filter((t) => t.completed)
    ];

    sorted.forEach((task) => {
      const li = document.createElement('li');
      li.className = `todo-item${task.completed ? ' completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`);
      checkbox.addEventListener('change', () => this.toggle(task.id));

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = task.text;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'todo-delete';
      delBtn.setAttribute('aria-label', `Delete "${task.text}"`);
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', () => this.delete(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }
};

/* ================================================================
   NOTEPAD MODULE
   ================================================================ */
const NotepadModule = {
  content: '',
  debounceTimer: null,

  elements: {},

  init(content = '') {
    this.content = content;
    this.elements = {
      textarea: document.getElementById('notepad-textarea'),
      indicator: document.getElementById('save-indicator')
    };

    this.elements.textarea.value = this.content;
    this.bindEvents();
  },

  bindEvents() {
    this.elements.textarea.addEventListener('input', () => this.handleInput());
  },

  handleInput() {
    this.content = this.elements.textarea.value;
    this.showIndicator('saving');

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.persist();
      this.showIndicator('saved');
    }, 300);
  },

  showIndicator(state) {
    const el = this.elements.indicator;
    el.className = 'save-indicator';
    if (state === 'saving') {
      el.classList.add('saving');
      el.textContent = 'Saving…';
    } else if (state === 'saved') {
      el.classList.add('saved');
      el.textContent = 'Saved';
      setTimeout(() => {
        if (el.textContent === 'Saved') {
          el.textContent = '';
          el.className = 'save-indicator';
        }
      }, 2000);
    }
  },

  persist() {
    StateManager.load().then((state) => {
      state.notepad = this.content;
      StateManager.save(state);
    });
  }
};

/* ================================================================
   POMODORO MODULE
   ================================================================ */
const PomodoroModule = {
  WORK_DURATION: 25 * 60,
  BREAK_DURATION: 5 * 60,

  timeRemaining: 0,
  isRunning: false,
  isWork: true,
  endTime: null,
  intervalId: null,

  elements: {},

  init(state = {}) {
    this.timeRemaining = typeof state.timeRemaining === 'number' ? state.timeRemaining : this.WORK_DURATION;
    this.isRunning = Boolean(state.isRunning);
    this.isWork = typeof state.isWork === 'boolean' ? state.isWork : true;
    this.endTime = state.endTime ?? null;

    this.elements = {
      display: document.getElementById('timer-display'),
      mode: document.getElementById('timer-mode'),
      toggleBtn: document.getElementById('timer-toggle'),
      resetBtn: document.getElementById('timer-reset')
    };

    this.bindEvents();

    if (this.isRunning && this.endTime) {
      const now = Date.now();
      if (this.endTime > now) {
        this.timeRemaining = Math.ceil((this.endTime - now) / 1000);
        this.startInterval();
      } else {
        this.timeRemaining = 0;
        this.isRunning = false;
        this.endTime = null;
        this.onComplete();
      }
    }

    this.updateDisplay();
  },

  bindEvents() {
    this.elements.toggleBtn.addEventListener('click', () => this.toggle());
    this.elements.resetBtn.addEventListener('click', () => this.reset());
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
  },

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  },

  start() {
    if (this.timeRemaining <= 0) {
      this.timeRemaining = this.isWork ? this.WORK_DURATION : this.BREAK_DURATION;
    }
    this.isRunning = true;
    this.endTime = Date.now() + this.timeRemaining * 1000;
    this.startInterval();
    this.updateDisplay();
    this.persist();
  },

  pause() {
    this.isRunning = false;
    this.endTime = null;
    this.clearInterval();
    this.updateDisplay();
    this.persist();
  },

  reset() {
    this.pause();
    this.timeRemaining = this.isWork ? this.WORK_DURATION : this.BREAK_DURATION;
    this.updateDisplay();
    this.persist();
  },

  startInterval() {
    this.clearInterval();
    this.intervalId = setInterval(() => this.tick(), 1000);
  },

  clearInterval() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  tick() {
    if (!this.isRunning || !this.endTime) return;

    const remaining = Math.ceil((this.endTime - Date.now()) / 1000);
    this.timeRemaining = Math.max(0, remaining);
    this.updateDisplay();

    if (this.timeRemaining <= 0) {
      this.pause();
      this.onComplete();
    }
  },

  handleVisibilityChange() {
    if (!this.isRunning || !this.endTime) return;

    if (document.hidden) return;

    const remaining = Math.ceil((this.endTime - Date.now()) / 1000);
    this.timeRemaining = Math.max(0, remaining);
    this.updateDisplay();

    if (this.timeRemaining <= 0) {
      this.pause();
      this.onComplete();
    }
  },

  onComplete() {
    this.isWork = !this.isWork;
    this.timeRemaining = this.isWork ? this.WORK_DURATION : this.BREAK_DURATION;
    this.updateDisplay();
    this.persist();
  },

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    this.elements.display.textContent = formatted;
    this.elements.mode.textContent = this.isWork ? 'Work' : 'Break';
    this.elements.toggleBtn.textContent = this.isRunning ? 'Pause' : 'Start';
    this.elements.toggleBtn.setAttribute('aria-label', this.isRunning ? 'Pause timer' : 'Start timer');
  },

  persist() {
    StateManager.load().then((state) => {
      state.pomodoro = {
        timeRemaining: this.timeRemaining,
        isRunning: this.isRunning,
        isWork: this.isWork,
        endTime: this.endTime
      };
      StateManager.save(state);
    });
  }
};

/* ================================================================
   APP BOOTSTRAP
   ================================================================ */
(async function bootstrap() {
  const state = await StateManager.load();

  ModalController.init();
  ClockModule.init();
  SearchModule.init(state.preferredSearchEngine);
  AIAssistantsModule.init();
  FavoriteLinksModule.init(state.favoriteLinks);
  TodoModule.init(state.todos);
  NotepadModule.init(state.notepad);
  PomodoroModule.init(state.pomodoro);
})();
