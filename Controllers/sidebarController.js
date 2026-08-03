// Controller: renders sidebar recents + wires the profile menu (shared by every view)
window.SidebarController = {
  collapseKey: 'juno-sidebar-collapsed',
  languageKey: 'juno-language',
  recentChatsKey: 'juno-recent-chats',
  pendingChatKey: 'juno-open-chat-id',
  settingsKey: 'juno-settings',
  folders: ['Work', 'Personal', 'Research', 'Procurement', 'Support'],
  languages: ['English', 'Filipino', 'Cebuano'],
  defaultSettings: {
    defaultModel: 'Juno 2.5',
    voiceEnabled: true,
    voiceThreshold: '0.035',
    startCollapsed: false
  },

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
    this.applySavedSettings();
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

  updateRecentChat(chatId, updates) {
    const chats = this.getRecentChats();
    const nextChats = chats.map(chat => chat.id === chatId ? { ...chat, ...updates } : chat);
    this.setRecentChats(nextChats);
    this.renderRecents();
    this.renderConversationSearchResults?.();
  },

  renameRecentChat(chatId) {
    const chat = this.getRecentChats().find(item => item.id === chatId);
    if (!chat) return;

    const nextTitle = window.prompt('Rename conversation', chat.title);
    if (!nextTitle || !nextTitle.trim()) return;

    this.updateRecentChat(chatId, { title: nextTitle.trim().slice(0, 64) });
    this.showNotice('Conversation renamed.');
  },

  togglePinnedChat(chatId) {
    const chat = this.getRecentChats().find(item => item.id === chatId);
    if (!chat) return;

    this.updateRecentChat(chatId, { pinned: !chat.pinned });
    this.showNotice(chat.pinned ? 'Conversation unpinned.' : 'Conversation pinned.');
  },

  assignChatFolder(chatId) {
    const chat = this.getRecentChats().find(item => item.id === chatId);
    if (!chat) return;

    const folder = window.prompt(
      `Move to folder: ${this.folders.join(', ')}. Leave blank to remove folder.`,
      chat.folder || ''
    );
    if (folder === null) return;

    const cleanFolder = folder.trim().slice(0, 32);
    this.updateRecentChat(chatId, { folder: cleanFolder || '' });
    this.showNotice(cleanFolder ? `Moved to ${cleanFolder}.` : 'Folder removed.');
  },

  deleteRecentChat(chatId) {
    if (!chatId) return;

    const chats = this.getRecentChats();
    const deletedIndex = chats.findIndex(item => item.id === chatId);
    const deletedChat = chats[deletedIndex];
    if (!deletedChat) return;

    const nextChats = chats.filter(item => item.id !== chatId);
    this.setRecentChats(nextChats);
    this.renderRecents();
    this.renderConversationSearchResults?.();
    this.showNotice('Conversation deleted.', {
      label: 'Undo',
      onClick: () => {
        const restored = this.getRecentChats().filter(item => item.id !== deletedChat.id);
        restored.splice(Math.max(0, deletedIndex), 0, deletedChat);
        this.setRecentChats(restored);
        this.renderRecents();
        this.renderConversationSearchResults?.();
        this.showNotice('Conversation restored.');
      }
    });
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
      flatWrap.innerHTML = '';
      return;
    }

    const pinned = chats.filter(chat => chat.pinned);
    const folders = [...new Set(chats.filter(chat => !chat.pinned && chat.folder).map(chat => chat.folder))];
    const unfiled = chats.filter(chat => !chat.pinned && !chat.folder);
    const renderGroup = (list, label = '') => list.length ? `
      ${label ? `<div class="sidebar-sub-label">${label}</div>` : ''}
      ${list.map(chat => `
      <div class="sidebar-chat-row">
        <button class="sidebar-flat-item" type="button" data-chat-id="${chat.id}" title="${this.escapeHtml(chat.title)}">
          <span>${this.escapeHtml(chat.title)}</span>
          <small>${this.getChatMetaText(chat)}</small>
        </button>
        <button class="sidebar-pin-chat ${chat.pinned ? 'active' : ''}" type="button" data-pin-chat-id="${chat.id}" aria-label="${chat.pinned ? 'Unpin' : 'Pin'} ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 4l6 6-3 1-4 7-2-2-5 5-2-2 5-5-2-2 7-4 1-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
        <button class="sidebar-export-chat" type="button" data-export-chat-id="${chat.id}" aria-label="Export ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3v11M7 9l5 5 5-5M5 20h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="sidebar-folder-chat" type="button" data-folder-chat-id="${chat.id}" aria-label="Move ${this.escapeHtml(chat.title)} to folder">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
        <button class="sidebar-rename-chat" type="button" data-rename-chat-id="${chat.id}" aria-label="Rename ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
        <button class="sidebar-delete-chat" type="button" data-delete-chat-id="${chat.id}" aria-label="Delete ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6M14 11v6M9 7l1-2h4l1 2M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `).join('')}
    ` : '';

    flatWrap.innerHTML = [
      renderGroup(pinned, 'PINNED'),
      ...folders.map(folder => renderGroup(chats.filter(chat => !chat.pinned && chat.folder === folder), folder.toUpperCase())),
      renderGroup(unfiled)
    ].join('');

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

    flatWrap.querySelectorAll('[data-rename-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.renameRecentChat(button.dataset.renameChatId);
      });
    });

    flatWrap.querySelectorAll('[data-pin-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.togglePinnedChat(button.dataset.pinChatId);
      });
    });

    flatWrap.querySelectorAll('[data-export-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.exportRecentChat(button.dataset.exportChatId);
      });
    });

    flatWrap.querySelectorAll('[data-folder-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.assignChatFolder(button.dataset.folderChatId);
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
    const matches = chats.filter(chat => {
      const pinnedFileNames = (chat.pinnedFiles || []).map(file => file.shortName || file.name || '').join(' ');
      const haystack = `${chat.title} ${chat.folder || ''} ${pinnedFileNames} ${this.getChatPreview(chat)}`.toLowerCase();
      return haystack.includes(normalized);
    });

    if (!chats.length) {
      results.innerHTML = '<div class="sidebar-search-empty">No recent conversations yet.<button type="button" data-search-new-chat>Start chat</button></div>';
      this.wireSearchEmptyActions(results);
      return;
    }

    if (!matches.length) {
      results.innerHTML = '<div class="sidebar-search-empty">No conversations found.<button type="button" data-search-new-chat>Start chat</button></div>';
      this.wireSearchEmptyActions(results);
      return;
    }

    results.innerHTML = matches.map(chat => `
      <div class="sidebar-search-result-row">
        <button class="sidebar-search-result" type="button" data-search-chat-id="${chat.id}">
          <span>${this.highlightMatch(chat.title, query)}</span>
          <small>${chat.pinned ? 'Pinned' : chat.folder || this.getChatMetaText(chat)}</small>
          <em>${this.highlightMatch(this.getChatPreview(chat), query)}</em>
        </button>
        <button class="sidebar-pin-chat ${chat.pinned ? 'active' : ''}" type="button" data-search-pin-chat-id="${chat.id}" aria-label="${chat.pinned ? 'Unpin' : 'Pin'} ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 4l6 6-3 1-4 7-2-2-5 5-2-2 5-5-2-2 7-4 1-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
        <button class="sidebar-export-chat" type="button" data-search-export-chat-id="${chat.id}" aria-label="Export ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3v11M7 9l5 5 5-5M5 20h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="sidebar-folder-chat" type="button" data-search-folder-chat-id="${chat.id}" aria-label="Move ${this.escapeHtml(chat.title)} to folder">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
        <button class="sidebar-rename-chat" type="button" data-search-rename-chat-id="${chat.id}" aria-label="Rename ${this.escapeHtml(chat.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
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

    results.querySelectorAll('[data-search-rename-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.renameRecentChat(button.dataset.searchRenameChatId);
      });
    });

    results.querySelectorAll('[data-search-pin-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.togglePinnedChat(button.dataset.searchPinChatId);
      });
    });

    results.querySelectorAll('[data-search-export-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.exportRecentChat(button.dataset.searchExportChatId);
      });
    });

    results.querySelectorAll('[data-search-folder-chat-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.assignChatFolder(button.dataset.searchFolderChatId);
      });
    });
  },

  wireSearchEmptyActions(results) {
    results.querySelector('[data-search-new-chat]')?.addEventListener('click', event => {
      event.stopPropagation();
      if (window.HomeController?.startNewChat) {
        window.HomeController.startNewChat();
        return;
      }
      window.location.href = '../Home/index.html';
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
    const settingsBtn = document.getElementById('settings-btn');
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

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        document.getElementById('profile-menu')?.classList.remove('open');
        this.openSettingsPanel();
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

  getSettings() {
    try {
      return { ...this.defaultSettings, ...JSON.parse(localStorage.getItem(this.settingsKey) || '{}') };
    } catch (error) {
      return { ...this.defaultSettings };
    }
  },

  saveSettings(settings) {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    localStorage.setItem(this.languageKey, settings.language || localStorage.getItem(this.languageKey) || this.languages[0]);
    localStorage.setItem(this.collapseKey, settings.startCollapsed ? 'true' : 'false');
    window.HomeController?.applySettings?.(settings);
    this.updateLanguageLabel();
    this.showNotice('Settings saved.');
  },

  applySavedSettings() {
    const settings = this.getSettings();
    window.HomeController?.applySettings?.(settings);
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse');
    if (sidebar && collapseBtn && settings.startCollapsed) {
      sidebar.classList.add('is-collapsed');
      collapseBtn.setAttribute('aria-pressed', 'true');
      collapseBtn.setAttribute('aria-label', 'Expand sidebar');
    }
  },

  openSettingsPanel() {
    const currentTheme = window.ThemeController?.getSavedTheme?.() || document.documentElement.getAttribute('data-theme') || 'light';
    const settings = {
      ...this.getSettings(),
      theme: currentTheme,
      language: localStorage.getItem(this.languageKey) || this.languages[0]
    };
    let modal = document.getElementById('settings-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settings-modal';
      modal.className = 'settings-modal';
      modal.innerHTML = `
        <div class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div class="settings-header">
            <div>
              <h2 id="settings-title">Settings</h2>
              <p>Saved for this browser.</p>
            </div>
            <button class="settings-close" type="button" aria-label="Close settings">&times;</button>
          </div>
          <div class="settings-grid">
            <label>Theme<select id="settings-theme"><option value="light">Light</option><option value="dark">Dark</option></select></label>
            <label>Language<select id="settings-language"><option>English</option><option>Filipino</option><option>Cebuano</option></select></label>
            <label>Default model<select id="settings-model"><option>Juno 2.5</option><option>Research Analyst</option><option>Procurement Assistant</option><option>Customer Support Agent</option><option>Data Interpreter</option><option>Document Writer</option><option>Workflow Planner</option></select></label>
            <label>Voice input<select id="settings-voice"><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
            <label>Voice sensitivity<input id="settings-threshold" type="range" min="0.015" max="0.08" step="0.005"></label>
            <label>Start collapsed<select id="settings-collapsed"><option value="false">No</option><option value="true">Yes</option></select></label>
          </div>
          <div class="settings-actions">
            <button class="settings-secondary" type="button">Cancel</button>
            <button class="settings-primary" type="button">Save settings</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('.settings-close').addEventListener('click', () => modal.classList.remove('open'));
      modal.querySelector('.settings-secondary').addEventListener('click', () => modal.classList.remove('open'));
      modal.addEventListener('click', event => {
        if (event.target === modal) modal.classList.remove('open');
      });
      modal.querySelector('.settings-primary').addEventListener('click', () => {
        const nextSettings = {
          theme: modal.querySelector('#settings-theme').value,
          language: modal.querySelector('#settings-language').value,
          defaultModel: modal.querySelector('#settings-model').value,
          voiceEnabled: modal.querySelector('#settings-voice').value === 'true',
          voiceThreshold: modal.querySelector('#settings-threshold').value,
          startCollapsed: modal.querySelector('#settings-collapsed').value === 'true'
        };
        window.ThemeController?.apply?.(nextSettings.theme);
        this.saveSettings(nextSettings);
        modal.classList.remove('open');
      });
    }

    modal.querySelector('#settings-theme').value = settings.theme || 'light';
    modal.querySelector('#settings-language').value = settings.language || 'English';
    modal.querySelector('#settings-model').value = settings.defaultModel || 'Juno 2.5';
    modal.querySelector('#settings-voice').value = String(settings.voiceEnabled !== false);
    modal.querySelector('#settings-threshold').value = settings.voiceThreshold || this.defaultSettings.voiceThreshold;
    modal.querySelector('#settings-collapsed').value = String(Boolean(settings.startCollapsed));
    modal.classList.add('open');
  },

  getChatPreview(chat) {
    const source = document.createElement('div');
    source.innerHTML = chat.html || '';
    return source.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) || 'No preview available';
  },

  getChatMetaText(chat) {
    const messageCount = Number(chat.messageCount || 0);
    const attachmentCount = Number(chat.attachmentCount || 0);
    const pinnedFileCount = Array.isArray(chat.pinnedFiles) ? chat.pinnedFiles.length : 0;
    const agent = chat.agent || 'Juno 2.5';
    const updated = chat.updatedAt || chat.savedAt;
    const date = updated ? new Date(updated) : null;
    const dateLabel = date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'Recent';
    const parts = [
      chat.folder || '',
      `${messageCount || 1} msg`,
      attachmentCount ? `${attachmentCount} file${attachmentCount === 1 ? '' : 's'}` : '',
      pinnedFileCount ? `${pinnedFileCount} pinned` : '',
      agent,
      dateLabel
    ].filter(Boolean);
    return parts.join(' · ');
  },

  exportRecentChat(chatId) {
    const chat = this.getRecentChats().find(item => item.id === chatId);
    if (!chat) return;

    const format = (window.prompt('Export as: md, txt, or pdf', 'md') || 'md').trim().toLowerCase();
    if (!['md', 'txt', 'pdf'].includes(format)) {
      this.showNotice('Choose md, txt, or pdf.');
      return;
    }

    const plainText = this.getExportPlainText(chat);
    const fileBase = this.slugify(chat.title || 'juno-conversation');

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank', 'width=760,height=900');
      if (!printWindow) {
        this.showNotice('Allow popups to export as PDF.');
        return;
      }
      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${this.escapeHtml(chat.title)} - Juno export</title>
            <style>
              body{font-family:Inter,Arial,sans-serif;line-height:1.55;color:#1f1f1f;padding:32px}
              h1{font-size:24px;margin:0 0 8px}
              .meta{color:#667085;font-size:12px;margin-bottom:24px}
              pre{white-space:pre-wrap;font-family:inherit;font-size:13px}
            </style>
          </head>
          <body>
            <h1>${this.escapeHtml(chat.title)}</h1>
            <div class="meta">${this.escapeHtml(this.getChatMetaText(chat))}</div>
            <pre>${this.escapeHtml(plainText)}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      this.showNotice('PDF export opened.');
      return;
    }

    const content = format === 'md'
      ? `# ${chat.title}\n\n_${this.getChatMetaText(chat)}_\n\n${plainText}\n`
      : `${chat.title}\n${this.getChatMetaText(chat)}\n\n${plainText}\n`;
    const blob = new Blob([content], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileBase}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.showNotice(`Conversation exported as .${format}.`);
  },

  getExportPlainText(chat) {
    const source = document.createElement('div');
    source.innerHTML = chat.html || '';
    source.querySelectorAll('.message-actions').forEach(node => node.remove());
    const rows = Array.from(source.querySelectorAll('.chat-row'));
    if (rows.length) {
      return rows.map(row => {
        const role = row.classList.contains('user') ? 'You' : 'Juno';
        const text = row.textContent.replace(/\s+/g, ' ').trim();
        return text ? `## ${role}\n${text}` : '';
      }).filter(Boolean).join('\n\n');
    }

    return source.textContent.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  },

  slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 56) || 'juno-conversation';
  },

  highlightMatch(value, query) {
    const escaped = this.escapeHtml(value);
    const cleanQuery = query.trim();
    if (!cleanQuery) return escaped;

    const pattern = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(pattern, 'ig'), match => `<mark>${match}</mark>`);
  },

  addAssistantMessage(message) {
    if (window.HomeController && typeof window.HomeController.addAssistantMessage === 'function') {
      window.HomeController.setWelcomeVisible?.(false);
      window.HomeController.addAssistantMessage(message);
    }
  },

  showNotice(message, action = null) {
    let notice = document.getElementById('app-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'app-notice';
      notice.className = 'app-notice';
      notice.setAttribute('role', 'status');
      document.body.appendChild(notice);
    }

    notice.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
    if (action?.label && typeof action.onClick === 'function') {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        window.clearTimeout(this.noticeTimer);
        notice.classList.remove('show');
        action.onClick();
      }, { once: true });
      notice.appendChild(button);
    }
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
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mobileBackdrop = document.getElementById('mobile-sidebar-backdrop');
    if (!sidebar || !collapseBtn) return;

    const mobileQuery = window.matchMedia('(max-width: 760px)');

    const setMobileOpen = (isOpen) => {
      sidebar.classList.toggle('is-mobile-open', isOpen);
      mobileBackdrop?.classList.toggle('is-visible', isOpen);
      mobileToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      mobileToggle?.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      document.body.classList.toggle('has-mobile-drawer', isOpen);
    };

    const applyCollapsed = (isCollapsed) => {
      sidebar.classList.toggle('is-collapsed', isCollapsed);
      collapseBtn.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
      collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
      localStorage.setItem(this.collapseKey, isCollapsed ? 'true' : 'false');
    };

    applyCollapsed(localStorage.getItem(this.collapseKey) === 'true');

    collapseBtn.addEventListener('click', () => {
      if (mobileQuery.matches) {
        setMobileOpen(false);
        return;
      }
      applyCollapsed(!sidebar.classList.contains('is-collapsed'));
    });

    mobileToggle?.addEventListener('click', () => {
      setMobileOpen(!sidebar.classList.contains('is-mobile-open'));
    });
    mobileBackdrop?.addEventListener('click', () => setMobileOpen(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('is-mobile-open')) setMobileOpen(false);
    });
    sidebar.addEventListener('click', (event) => {
      if (!mobileQuery.matches) return;
      if (event.target.closest('[data-chat-id], #new-chat-btn, a.sidebar-item')) setMobileOpen(false);
    });
    mobileQuery.addEventListener('change', () => setMobileOpen(false));

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
