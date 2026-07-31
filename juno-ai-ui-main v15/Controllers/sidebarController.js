// Controller: renders sidebar recents + wires the profile menu (shared by every view)
window.SidebarController = {
  collapseKey: 'juno-sidebar-collapsed',
  languageKey: 'juno-language',
  recentChatsKey: 'juno-recent-chats',
  pendingChatKey: 'juno-open-chat-id',
  languages: ['English', 'Filipino', 'Cebuano'],

  init() {
    this.renderRecents();
    const emailEls = document.querySelectorAll('.profile-email, .profile-menu-email');
    const displayName = window.AuthController ? window.AuthController.getUsername() : SidebarModel.profileEmail;
    emailEls.forEach(el => el.textContent = displayName);

    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!profileMenu.contains(e.target) && e.target !== profileBtn) {
          profileMenu.classList.remove('open');
        }
      });
    }

    this.wireCollapse();
    this.wireLogout();
    this.wireMenuActions();
    this.wireNewChat();
    this.wireConversationSearch();
  },

  getRecentChats() {
    try {
      return JSON.parse(localStorage.getItem(this.recentChatsKey) || '[]');
    } catch (error) {
      return [];
    }
  },

  setRecentChats(chats) {
    localStorage.setItem(this.recentChatsKey, JSON.stringify(chats.slice(0, 12)));
  },

  deleteRecentChat(chatId) {
    if (!chatId) return;

    const nextChats = this.getRecentChats().filter(item => item.id !== chatId);
    this.setRecentChats(nextChats);
    this.renderRecents();
    this.renderConversationSearchResults?.();
    this.showNotice('Recent conversation deleted.');
  },

  addRecentChat(chat) {
    if (!chat || !chat.html || !chat.title) return;
    const chats = this.getRecentChats().filter(item => item.id !== chat.id);
    chats.unshift(chat);
    this.setRecentChats(chats);
    this.renderRecents();
    this.renderConversationSearchResults?.();
  },

  renderRecents() {
    const recentsWrap = document.getElementById('sidebar-recents');
    const flatWrap = document.getElementById('sidebar-recent-chats');
    const chats = this.getRecentChats();

    if (recentsWrap) recentsWrap.innerHTML = '';
    if (!flatWrap) return;

    if (!chats.length) {
      flatWrap.innerHTML = `<div class="sidebar-empty-recents">No recent chats yet</div>`;
      return;
    }

    flatWrap.innerHTML = chats.map(chat => `
      <div class="sidebar-chat-row">
        <button class="sidebar-flat-item" type="button" data-chat-id="${chat.id}" title="${this.escapeHtml(chat.title)}">
          ${this.escapeHtml(chat.title)}
        </button>
        <button class="sidebar-delete-chat" type="button" data-delete-chat-id="${chat.id}" aria-label="Delete ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6M14 11v6M9 7l1-2h4l1 2M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `).join('');

    flatWrap.querySelectorAll('[data-chat-id]').forEach(button => {
      button.addEventListener('click', () => {
        this.openRecentChat(button.dataset.chatId);
      });
    });

    flatWrap.querySelectorAll('[data-delete-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.deleteRecentChat(button.dataset.deleteChatId);
      });
    });
  },

  openRecentChat(chatId) {
    if (!chatId) return;

    if (window.HomeController && typeof window.HomeController.loadRecentChat === 'function') {
      window.HomeController.loadRecentChat(chatId);
      return;
    }

    localStorage.setItem(this.pendingChatKey, chatId);
    window.location.href = '../Home/index.html';
  },

  renderConversationSearchResults(query = this.searchQuery || '') {
    const results = document.getElementById('sidebar-search-results');
    if (!results) return;

    this.searchQuery = query;

    const normalized = query.trim().toLowerCase();
    const chats = this.getRecentChats();
    const matches = chats.filter(chat => chat.title.toLowerCase().includes(normalized));

    if (!chats.length) {
      results.innerHTML = '<div class="sidebar-search-empty">No recent conversations yet.</div>';
      return;
    }

    if (!matches.length) {
      results.innerHTML = '<div class="sidebar-search-empty">No conversations found.</div>';
      return;
    }

    results.innerHTML = matches.map(chat => `
      <div class="sidebar-search-result-row">
        <button class="sidebar-search-result" type="button" data-search-chat-id="${chat.id}">
          <span>${this.escapeHtml(chat.title)}</span>
          <small>Conversation</small>
        </button>
        <button class="sidebar-delete-chat" type="button" data-search-delete-chat-id="${chat.id}" aria-label="Delete ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6M14 11v6M9 7l1-2h4l1 2M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `).join('');

    results.querySelectorAll('[data-search-chat-id]').forEach(button => {
      button.addEventListener('click', () => this.openRecentChat(button.dataset.searchChatId));
    });

    results.querySelectorAll('[data-search-delete-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.deleteRecentChat(button.dataset.searchDeleteChatId);
      });
    });
  },

  wireConversationSearch() {
    const toggle = document.querySelector('.sidebar-search-toggle');
    const panel = document.getElementById('sidebar-search-panel');
    const input = document.getElementById('sidebar-search-input');
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse');

    if (!toggle || !panel || !input) return;

    const openSearch = () => {
      if (sidebar?.classList.contains('is-collapsed')) {
        sidebar.classList.remove('is-collapsed');
        collapseBtn?.setAttribute('aria-pressed', 'false');
        collapseBtn?.setAttribute('aria-label', 'Collapse sidebar');
        localStorage.setItem(this.collapseKey, 'false');
      }

      panel.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      this.renderConversationSearchResults(input.value);
      requestAnimationFrame(() => input.focus());
    };

    const closeSearch = () => {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      panel.classList.contains('open') ? closeSearch() : openSearch();
    });

    panel.addEventListener('click', event => event.stopPropagation());
    input.addEventListener('input', () => this.renderConversationSearchResults(input.value));
    document.addEventListener('click', closeSearch);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSearch();
    });

    this.renderConversationSearchResults();
  },

  wireNewChat() {
    const newChatBtn = document.getElementById('new-chat-btn');
    if (!newChatBtn) return;

    newChatBtn.addEventListener('click', () => {
      if (window.HomeController && typeof window.HomeController.startNewChat === 'function') {
        window.HomeController.startNewChat();
        return;
      }

      window.location.href = '../Home/index.html';
    });
  },

  wireMenuActions() {
    const languageBtn = document.getElementById('language-btn');
    const helpBtn = document.getElementById('help-btn');
    const upgradeBtn = document.getElementById('upgrade-btn');
    const appsBtn = document.getElementById('apps-btn');
    const learnBtn = document.getElementById('learn-btn');

    this.updateLanguageLabel();

    if (languageBtn) {
      languageBtn.addEventListener('click', () => {
        const current = localStorage.getItem(this.languageKey) || this.languages[0];
        const nextIndex = (this.languages.indexOf(current) + 1) % this.languages.length;
        const next = this.languages[nextIndex];
        localStorage.setItem(this.languageKey, next);
        this.updateLanguageLabel();
        this.showNotice(`Language set to ${next}.`);
      });
    }

    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.showNotice('Help is ready. Ask Juno about uploads, PDFs, voice input, or projects.');
        this.addAssistantMessage('Need help? You can upload images, PDFs, files, or folders, use the microphone, and preview PDFs in the right panel.');
      });
    }

    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        this.showNotice('Upgrade options are not connected yet in this demo.');
      });
    }

    if (appsBtn) {
      appsBtn.addEventListener('click', () => {
        this.showNotice('Apps and extensions will be available here when integrations are connected.');
      });
    }

    if (learnBtn) {
      learnBtn.addEventListener('click', () => {
        this.showNotice('Learn more: Juno supports chat, uploads, PDF previews, and voice input.');
        this.addAssistantMessage('Juno can review uploaded files, preview PDFs, accept pasted screenshots, and use speech recognition when your browser supports it.');
      });
    }
  },

  updateLanguageLabel() {
    const label = document.getElementById('language-label');
    if (!label) return;

    const language = localStorage.getItem(this.languageKey) || this.languages[0];
    label.textContent = `Language: ${language}`;
  },

  addAssistantMessage(message) {
    if (window.HomeController && typeof window.HomeController.addAssistantMessage === 'function') {
      window.HomeController.setWelcomeVisible?.(false);
      window.HomeController.addAssistantMessage(message);
    }
  },

  showNotice(message) {
    let notice = document.getElementById('app-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'app-notice';
      notice.className = 'app-notice';
      notice.setAttribute('role', 'status');
      document.body.appendChild(notice);
    }

    notice.textContent = message;
    notice.classList.add('show');
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => {
      notice.classList.remove('show');
    }, 2600);
  },

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  },

  wireCollapse() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse');
    if (!sidebar || !collapseBtn) return;

    const applyCollapsed = (isCollapsed) => {
      sidebar.classList.toggle('is-collapsed', isCollapsed);
      collapseBtn.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
      collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
      localStorage.setItem(this.collapseKey, isCollapsed ? 'true' : 'false');
    };

    applyCollapsed(localStorage.getItem(this.collapseKey) === 'true');

    collapseBtn.addEventListener('click', () => {
      applyCollapsed(!sidebar.classList.contains('is-collapsed'));
    });

    const logo = sidebar.querySelector('.sidebar-logo');
    if (logo) {
      logo.setAttribute('role', 'button');
      logo.setAttribute('tabindex', '0');
      logo.setAttribute('aria-label', 'Expand sidebar');

      const expandSidebar = () => {
        if (sidebar.classList.contains('is-collapsed')) {
          applyCollapsed(false);
        }
      };

      logo.addEventListener('click', expandSidebar);
      logo.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          expandSidebar();
        }
      });
    }
  },

  wireLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
      if (window.AuthController) {
        window.AuthController.logout();
      }
    });
  }
};
document.addEventListener('DOMContentLoaded', () => SidebarController.init());
