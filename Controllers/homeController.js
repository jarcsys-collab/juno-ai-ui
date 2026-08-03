// Controller: Home view - welcome transition, composer, attachments, voice input, PDF/Files panels
window.HomeController = {
  sendTimers: [],
  attachedFiles: [],
  uploadedFiles: [],
  currentPinnedFiles: [],
  recognition: null,
  activeVoiceTarget: null,
  activeVoiceButton: null,
  activeVoiceContainer: null,
  voiceStream: null,
  voiceAudioContext: null,
  voiceAnalyser: null,
  voiceAnimationFrame: null,
  voiceBaseText: '',
  voiceFinalText: '',
  voiceShouldListen: false,
  voiceRestartTimer: null,
  voiceLastError: '',
  voiceSpeakingThreshold: 0.035,
  voiceEnabled: true,
  voiceSetupKey: 'juno-voice-setup-complete',
  draftKey: 'juno-chat-draft',
  welcomeActive: true,
  activeAgent: 'Juno 2.5',
  currentChatId: null,
  currentChatTitle: '',
  agentRoutes: [
    { name: 'Research Analyst', color: '#2F80ED', keywords: ['research analyst', 'research', 'source', 'sources', 'market', 'study', 'findings', 'literature', 'evidence'] },
    { name: 'Procurement Assistant', color: '#00AFA5', keywords: ['procurement assistant', 'procurement', 'vendor', 'vendors', 'supplier', 'purchase', 'quote', 'rfq', 'request for proposal'] },
    { name: 'Customer Support Agent', color: '#27AE60', keywords: ['customer support agent', 'customer support', 'support', 'ticket', 'customer', 'knowledge base', 'faq', 'help desk'] },
    { name: 'Data Interpreter', color: '#D49A00', keywords: ['data interpreter', 'data', 'spreadsheet', 'excel', 'csv', 'analysis', 'analyze', 'trend', 'chart', 'table'] },
    { name: 'Document Writer', color: '#8E6CEF', keywords: ['document writer', 'document', 'write', 'draft', 'edit', 'proposal', 'report', 'memo', 'letter'] },
    { name: 'Workflow Planner', color: '#EB5757', keywords: ['workflow planner', 'workflow', 'plan', 'steps', 'task', 'timeline', 'project plan', 'process', 'roadmap'] }
  ],

  init() {
    this.updateActiveAgent();
    this.wireWelcome();
    this.wireComposer();
    this.wireFilesPanel();
    this.wireMessageActions();
    this.wireChatToolbar();
    this.wireConversationLink();
    this.wireQuickPrompts();
    this.restoreDrafts();
    this.openPendingRecentChat();
    this.updateChatHeader();
  },

  wireWelcome() {
    const welcomeLayer = document.getElementById('welcome-layer');
    if (!welcomeLayer) return;

    const welcomeInput = document.getElementById('welcome-input');
    const welcomeSend = document.getElementById('welcome-send-btn');
    const welcomeAdd = document.getElementById('welcome-add-btn');
    const welcomeVoice = document.getElementById('welcome-voice-btn');
    const welcomePhotoInput = document.getElementById('welcome-photo-input');
    const welcomeFileInput = document.getElementById('welcome-file-input');
    const welcomeFolderInput = document.getElementById('welcome-folder-input');
    const welcomeMenu = document.getElementById('welcome-attach-menu');

    this.setWelcomeVisible(true);
    this.wireAttachMenu(welcomeAdd, welcomeMenu, {
      image: welcomePhotoInput,
      file: welcomeFileInput,
      folder: welcomeFolderInput
    });
    this.wireFileInput(welcomePhotoInput);
    this.wireFileInput(welcomeFileInput);
    this.wireFileInput(welcomeFolderInput);
    this.wireDropZone(welcomeLayer);
    this.wirePasteUpload(welcomeInput);

    if (welcomeVoice) {
      welcomeVoice.addEventListener('click', () => this.toggleVoiceInput(welcomeInput, welcomeVoice));
    }

    if (welcomeSend) {
      welcomeSend.addEventListener('click', async () => {
        const message = welcomeInput ? welcomeInput.value.trim() : '';
        if (!message && this.attachedFiles.length === 0) return;
        this.updateActiveAgent(message);
        await this.transitionWelcomeToChat();
        this.submitMessage(message);
        if (welcomeInput) welcomeInput.value = '';
        this.clearDraft();
      });
    }

    if (welcomeInput) {
      welcomeInput.addEventListener('input', () => {
        this.updateActiveAgent(welcomeInput.value);
        this.saveDraft('welcome', welcomeInput.value);
      });
      welcomeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          welcomeSend.click();
        }
      });
    }
  },

  wireComposer() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const photoInput = document.getElementById('photo-input');
    const fileInput = document.getElementById('file-input');
    const folderInput = document.getElementById('folder-input');
    const addBtn = document.getElementById('photo-add-btn');
    const attachMenu = document.getElementById('attach-menu');
    const voiceBtn = document.getElementById('voice-btn');

    if (!input || !sendBtn) return;

    this.wireAttachMenu(addBtn, attachMenu, {
      image: photoInput,
      file: fileInput,
      folder: folderInput
    });
    this.wireFileInput(photoInput);
    this.wireFileInput(fileInput);
    this.wireFileInput(folderInput);
    this.wireDropZone(document.querySelector('.composer'));
    this.wirePasteUpload(input);

    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => this.toggleVoiceInput(input, voiceBtn));
    }

    input.addEventListener('input', () => {
      this.updateActiveAgent(input.value);
      this.saveDraft('chat', input.value);
    });

    sendBtn.addEventListener('click', () => {
      if (sendBtn.classList.contains('is-busy')) return;
      this.updateActiveAgent(input.value);
      this.submitMessage(input.value.trim());
      input.value = '';
      this.clearDraft();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendBtn.click();
      }
    });
  },

  wireAttachMenu(button, menu, inputs) {
    if (!button || !menu) return;

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    menu.querySelectorAll('[data-attach-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.attachAction;
        const input = inputs[action];
        menu.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
        if (input) input.click();
      });
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && event.target !== button) {
        menu.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });
  },

  wireFileInput(input) {
    if (!input) return;

    input.addEventListener('change', async () => {
      await this.addFiles(Array.from(input.files || []));
      input.value = '';
    });
  },

  wireDropZone(zone) {
    if (!zone) return;

    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('is-dragging');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('is-dragging');
    });

    zone.addEventListener('drop', async (event) => {
      event.preventDefault();
      zone.classList.remove('is-dragging');
      await this.addFiles(Array.from(event.dataTransfer.files || []));
    });
  },

  wirePasteUpload(input) {
    if (!input) return;

    input.addEventListener('paste', async (event) => {
      const files = Array.from(event.clipboardData?.files || []);
      if (!files.length) return;
      event.preventDefault();
      await this.addFiles(files);
    });
  },

  async addFiles(files) {
    const readableFiles = files.filter(file => file && file.name);
    if (!readableFiles.length) return;

    try {
      const attachments = await Promise.all(readableFiles.map(file => this.readAttachment(file)));
      this.attachedFiles = this.attachedFiles.concat(attachments).slice(0, 12);
      this.renderAttachmentPreviews();

      attachments.forEach(file => {
        this.upsertUploadedFile(file);
        if (this.isPdf(file)) this.openPdfPreview(file);
      });
      this.renderFilesPanel();
    } catch (error) {
      console.error(error);
      window.SidebarController?.showNotice?.('Upload failed. Please try a smaller or supported file.');
    }
  },

  readAttachment(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.webkitRelativePath || file.name,
        shortName: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result,
        objectUrl: URL.createObjectURL(file)
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  renderAttachmentPreviews() {
    this.renderAttachmentTray(document.getElementById('photo-preview-tray'));
    this.renderAttachmentTray(document.getElementById('welcome-preview-tray'));
  },

  renderAttachmentTray(tray) {
    if (!tray) return;

    tray.classList.toggle('has-photos', this.attachedFiles.length > 0);
    tray.innerHTML = this.attachedFiles.map((file, index) => {
      const preview = this.isImage(file)
        ? `<img src="${file.dataUrl}" alt="${this.escapeHtml(file.shortName)}">`
        : `<div class="file-chip-icon">${this.isPdf(file) ? 'PDF' : 'FILE'}</div>`;

      return `
        <div class="photo-chip file-chip" title="${this.escapeHtml(file.name)}" draggable="true" data-file-id="${file.id}" data-file-index="${index}">
          ${preview}
          <span>${this.escapeHtml(file.shortName)}</span>
          <div class="file-chip-actions">
            <button class="photo-preview-open" type="button" aria-label="Preview ${this.escapeHtml(file.shortName)}" data-file-id="${file.id}">View</button>
            <button class="photo-rename" type="button" aria-label="Rename ${this.escapeHtml(file.shortName)}" data-file-id="${file.id}">Rename</button>
          </div>
          <div class="file-chip-order" aria-label="Reorder ${this.escapeHtml(file.shortName)}">
            <button type="button" data-move-file-id="${file.id}" data-move-direction="-1" aria-label="Move ${this.escapeHtml(file.shortName)} left">&lsaquo;</button>
            <button type="button" data-move-file-id="${file.id}" data-move-direction="1" aria-label="Move ${this.escapeHtml(file.shortName)} right">&rsaquo;</button>
          </div>
          <button class="photo-remove" type="button" aria-label="Remove ${this.escapeHtml(file.shortName)}" data-file-id="${file.id}">&times;</button>
        </div>
      `;
    }).join('') + (this.attachedFiles.length ? `
      <div class="photo-tray-actions">
        <div class="photo-count">${this.attachedFiles.length}/12</div>
        <button class="attachment-clear-all" type="button">Clear all</button>
      </div>
    ` : '');

    tray.querySelectorAll('.photo-remove').forEach(button => {
      button.addEventListener('click', () => {
        this.attachedFiles = this.attachedFiles.filter(file => file.id !== button.dataset.fileId);
        this.renderAttachmentPreviews();
      });
    });

    tray.querySelectorAll('[data-move-file-id]').forEach(button => {
      button.addEventListener('click', () => {
        this.moveAttachedFile(button.dataset.moveFileId, Number(button.dataset.moveDirection));
      });
    });

    tray.querySelectorAll('.photo-chip[draggable="true"]').forEach(chip => {
      chip.addEventListener('dragstart', event => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', chip.dataset.fileId);
        chip.classList.add('is-dragging');
      });

      chip.addEventListener('dragend', () => {
        tray.querySelectorAll('.photo-chip').forEach(item => item.classList.remove('is-dragging', 'is-drop-target'));
      });

      chip.addEventListener('dragover', event => {
        event.preventDefault();
        chip.classList.add('is-drop-target');
      });

      chip.addEventListener('dragleave', () => chip.classList.remove('is-drop-target'));

      chip.addEventListener('drop', event => {
        event.preventDefault();
        chip.classList.remove('is-drop-target');
        this.reorderAttachedFile(event.dataTransfer.getData('text/plain'), chip.dataset.fileId);
      });
    });

    tray.querySelectorAll('.photo-rename').forEach(button => {
      button.addEventListener('click', () => {
        const file = this.attachedFiles.find(item => item.id === button.dataset.fileId);
        if (!file) return;

        const nextName = window.prompt('Rename attachment', file.shortName);
        if (!nextName || !nextName.trim()) return;

        file.shortName = nextName.trim().slice(0, 72);
        file.name = file.name.includes('/') ? file.name.replace(/[^/]+$/, file.shortName) : file.shortName;
        this.renderAttachmentPreviews();
        window.SidebarController?.showNotice?.('Attachment renamed.');
      });
    });

    tray.querySelectorAll('.photo-preview-open').forEach(button => {
      button.addEventListener('click', () => {
        const file = this.attachedFiles.find(item => item.id === button.dataset.fileId);
        if (!file) return;

        if (this.isPdf(file)) {
          this.openPdfPreview(file);
          return;
        }

        if (file.objectUrl) {
          window.open(file.objectUrl, '_blank', 'noopener');
          return;
        }

        window.SidebarController?.showNotice?.('Preview unavailable for this file.');
      });
    });

    tray.querySelector('.attachment-clear-all')?.addEventListener('click', () => {
      const removedFiles = [...this.attachedFiles];
      this.attachedFiles = [];
      this.renderAttachmentPreviews();
      window.SidebarController?.showNotice?.('Attachments cleared.', {
        label: 'Undo',
        onClick: () => {
          this.attachedFiles = removedFiles;
          this.renderAttachmentPreviews();
        }
      });
    });
  },

  moveAttachedFile(fileId, direction) {
    const index = this.attachedFiles.findIndex(file => file.id === fileId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.attachedFiles.length) return;

    const nextFiles = [...this.attachedFiles];
    const [file] = nextFiles.splice(index, 1);
    nextFiles.splice(nextIndex, 0, file);
    this.attachedFiles = nextFiles;
    this.renderAttachmentPreviews();
  },

  reorderAttachedFile(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = this.attachedFiles.findIndex(file => file.id === sourceId);
    const targetIndex = this.attachedFiles.findIndex(file => file.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextFiles = [...this.attachedFiles];
    const [file] = nextFiles.splice(sourceIndex, 1);
    nextFiles.splice(targetIndex, 0, file);
    this.attachedFiles = nextFiles;
    this.renderAttachmentPreviews();
  },

  async submitMessage(message) {
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn && sendBtn.classList.contains('is-busy')) return;

    const files = [...this.attachedFiles];
    if (!message && files.length === 0) return;
    if (!this.confirmLargeUpload(files)) return;

    const wantsPdf = message.toLowerCase().includes('pdf');
    const hasUpload = files.length > 0;
    const agent = this.updateActiveAgent(message);

    this.setWelcomeVisible(false);
    this.addUserMessage(message, files);
    if (message) this.currentChatTitle = this.getChatTitle(message);
    this.updateChatHeader();
    const thinkingId = this.addThinkingMessage({
      message,
      agent,
      type: hasUpload ? 'file-upload' : 'default',
      imageCount: files.filter(file => this.isImage(file)).length,
      fileCount: files.length
    });

    this.attachedFiles = [];
    this.renderAttachmentPreviews();
    this.setLoading(true);

    try {
      const response = await fetch(
        "https://jarctech-ai-n8n-rnd.onrender.com/webhook/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message,
            agent,
            attachments: files.map(file => ({
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: file.dataUrl
            })),
            images: files
              .filter(file => this.isImage(file))
              .map(file => ({
                name: file.name,
                type: file.type,
                dataUrl: file.dataUrl
              }))
          })
        }
      );

      const data = await response.json();
      const replyContent = this.getReplyContent(data);
      const hasImageReply = this.hasImageReply(data, replyContent);

      if (hasImageReply) {
        this.updateThinkingMessage(thinkingId, 'Preparing image output');
        await this.wait(650);
      }

      this.removeThinkingMessage(thinkingId);
      this.addAssistantMessage(replyContent);

      if (wantsPdf) this.openPdfPanel();

    } catch (error) {
      console.error(error);
      this.removeThinkingMessage(thinkingId);
      this.addAssistantMessage("Unable to contact Juno. Please check your connection and try again.");
    } finally {
      this.setLoading(false);
      this.saveCurrentChatToRecents();
      this.updateChatHeader();
    }
  },

  confirmLargeUpload(files = []) {
    if (!files.length) return true;

    const totalSize = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
    const shouldConfirm = files.length >= 5 || totalSize >= 10 * 1024 * 1024;
    if (!shouldConfirm) return true;

    return window.confirm(`Send ${files.length} files totaling ${this.formatFileSize(totalSize)}?`);
  },

  setLoading(isLoading) {
    const sendBtn = document.getElementById('send-btn');
    if (!sendBtn) return;

    sendBtn.classList.toggle('is-busy', isLoading);
    sendBtn.classList.toggle('is-thinking', isLoading);
    sendBtn.disabled = isLoading;
    sendBtn.setAttribute('aria-label', isLoading ? 'Juno is preparing a reply' : 'Send message');
  },

  setWelcomeVisible(isVisible) {
    const welcomeLayer = document.getElementById('welcome-layer');
    const chatHistory = document.getElementById('chat-history');
    const composerWrap = document.getElementById('main-composer-wrap');

    this.welcomeActive = isVisible;
    if (welcomeLayer) welcomeLayer.style.display = isVisible ? 'flex' : 'none';
    if (welcomeLayer && isVisible) welcomeLayer.classList.remove('is-moving-to-chat');
    if (chatHistory) chatHistory.classList.toggle('is-active-chat', !isVisible);
    if (composerWrap) composerWrap.style.display = isVisible ? 'none' : 'block';
    this.updateChatHeader();
  },

  transitionWelcomeToChat() {
    const welcomeLayer = document.getElementById('welcome-layer');
    const composerWrap = document.getElementById('main-composer-wrap');

    if (!welcomeLayer) {
      this.setWelcomeVisible(false);
      return Promise.resolve();
    }

    if (composerWrap) composerWrap.style.display = 'block';
    welcomeLayer.classList.add('is-moving-to-chat');

    return this.wait(320).then(() => {
      this.setWelcomeVisible(false);
    });
  },

  addUserMessage(message, files = []) {
    const history = document.getElementById("chat-history");
    if (!history) return;

    const attachmentHtml = files.length ? `
      <div class="chat-attachments">
        ${files.map(file => this.getChatAttachmentHtml(file)).join('')}
      </div>
    ` : '';
    const messageHtml = message ? `<div>${this.escapeHtml(message)}</div>` : '';

    history.insertAdjacentHTML('beforeend', `
      <div class="chat-row user" data-message-role="user">
        <div class="chat-bubble user">
          ${attachmentHtml}
          <div class="message-content">${messageHtml}</div>
          ${this.getMessageActionsHtml('user')}
        </div>
      </div>
    `);

    history.scrollTop = history.scrollHeight;
    this.updateJumpToLatestVisibility();
  },

  startNewChat() {
    this.saveCurrentChatToRecents();
    this.currentChatId = null;
    this.currentChatTitle = '';
    this.attachedFiles = [];
    this.uploadedFiles = [];
    this.currentPinnedFiles = [];
    this.renderAttachmentPreviews();
    this.renderFilesPanel();
    this.clearDraft();

    const history = document.getElementById('chat-history');
    const input = document.getElementById('chat-input');
    const welcomeInput = document.getElementById('welcome-input');

    if (history) history.innerHTML = '';
    if (input) input.value = '';
    if (welcomeInput) welcomeInput.value = '';

    this.updateActiveAgent('reset');
    this.setWelcomeVisible(true);
    this.updateChatHeader();
  },

  saveCurrentChatToRecents() {
    const history = document.getElementById('chat-history');
    if (!history || !history.innerHTML.trim()) return;

    const text = history.textContent.trim();
    if (!text) return;

    const existing = window.SidebarController?.getRecentChats?.().find(item => item.id === this.currentChatId);
    const messageRows = Array.from(history.querySelectorAll('.chat-row[data-message-role]'));
    const attachmentCount = history.querySelectorAll('.chat-photo, .chat-file').length;
    const chat = {
      id: this.currentChatId || `chat-${Date.now()}`,
      title: this.currentChatTitle || this.getChatTitle(text),
      html: history.innerHTML,
      savedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: messageRows.length,
      attachmentCount,
      agent: this.activeAgent || 'Juno 2.5',
      folder: existing?.folder || '',
      pinned: Boolean(existing?.pinned),
      pinnedFiles: this.currentPinnedFiles.map(file => this.serializeFile(file))
    };

    this.currentChatId = chat.id;
    if (window.SidebarController && typeof window.SidebarController.addRecentChat === 'function') {
      window.SidebarController.addRecentChat(chat);
    }
  },

  loadRecentChat(chatId) {
    const chats = window.SidebarController
      ? window.SidebarController.getRecentChats()
      : JSON.parse(localStorage.getItem('juno-recent-chats') || '[]');
    const chat = chats.find(item => item.id === chatId);
    const history = document.getElementById('chat-history');
    if (!chat || !history) return;

    this.currentChatId = chat.id;
    this.currentChatTitle = chat.title;
    this.currentPinnedFiles = (chat.pinnedFiles || []).map(file => this.hydrateFile(file));
    this.uploadedFiles = [...this.currentPinnedFiles];
    this.updateActiveAgent(chat.agent || 'Juno 2.5');
    history.innerHTML = chat.html;
    this.setWelcomeVisible(false);
    this.clearChatSearch();
    this.renderFilesPanel();
    this.updateChatHeader();
    history.scrollTop = history.scrollHeight;
  },

  openPendingRecentChat() {
    const pendingKey = window.SidebarController?.pendingChatKey || 'juno-open-chat-id';
    const urlChatId = new URLSearchParams(window.location.search).get('chat');
    const pendingChatId = urlChatId || localStorage.getItem(pendingKey);
    if (!pendingChatId) return;

    localStorage.removeItem(pendingKey);
    this.loadRecentChat(pendingChatId);
  },

  getChatTitle(value) {
    const cleaned = String(value)
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = cleaned.split(' ').filter(Boolean).slice(0, 7).join(' ');
    return words ? words.slice(0, 48) : 'Untitled chat';
  },

  getChatAttachmentHtml(file) {
    if (this.isImage(file)) {
      return `<img class="chat-photo" src="${file.dataUrl}" alt="${this.escapeHtml(file.shortName)}">`;
    }

    const action = this.isPdf(file)
      ? `<button class="chat-file-open" type="button" onclick="HomeController.openPdfPreviewById('${file.id}')">Open preview</button>`
      : '';

    return `
      <div class="chat-file">
        <div class="chat-file-type">${this.isPdf(file) ? 'PDF' : 'FILE'}</div>
        <div class="chat-file-meta">
          <strong>${this.escapeHtml(file.shortName)}</strong>
          <span>${this.formatFileSize(file.size)}</span>
        </div>
        ${action}
      </div>
    `;
  },

  serializeFile(file) {
    return {
      id: file.id,
      name: file.name,
      shortName: file.shortName,
      type: file.type,
      size: file.size,
      dataUrl: file.dataUrl
    };
  },

  hydrateFile(file) {
    return {
      ...file,
      objectUrl: file.objectUrl || file.dataUrl || ''
    };
  },

  addThinkingMessage(options = {}) {
    const history = document.getElementById("chat-history");
    if (!history) return null;
    const shouldStickToLatest = this.isNearLatestMessage(history);

    const thinkingId = `thinking-${Date.now()}`;
    const message = options.message || '';
    const isImageRequest = /image|photo|picture|render|visual|logo|poster/i.test(message);
    const label = this.getThinkingLabel(options, isImageRequest);

    history.insertAdjacentHTML('beforeend', `
      <div class="chat-row assistant" id="${thinkingId}">
        <div class="chat-bubble assistant thinking-bubble" aria-live="polite">
          <span class="thinking-label">${label}</span>
          <span class="thinking-dots"><span></span><span></span><span></span></span>
        </div>
      </div>
    `);

    if (shouldStickToLatest) history.scrollTop = history.scrollHeight;
    this.updateJumpToLatestVisibility();
    return thinkingId;
  },

  getThinkingLabel(options, isImageRequest) {
    const agentPrefix = options.agent && options.agent !== 'Juno 2.5' ? `${options.agent} is ` : '';

    if (options.type === 'file-upload') {
      if (options.imageCount && options.imageCount === options.fileCount) {
        return `${agentPrefix}reviewing ${options.imageCount > 1 ? 'uploaded images' : 'uploaded image'}`;
      }
      return `${agentPrefix}reading ${options.fileCount > 1 ? 'uploaded files' : 'uploaded file'}`;
    }

    if (isImageRequest) return `${agentPrefix}preparing image response`;
    return options.agent && options.agent !== 'Juno 2.5' ? `${options.agent} is thinking` : 'Juno is thinking';
  },

  updateThinkingMessage(thinkingId, label) {
    if (!thinkingId) return;
    const thinkingLabel = document.querySelector(`#${thinkingId} .thinking-label`);
    if (thinkingLabel) thinkingLabel.textContent = label;
  },

  removeThinkingMessage(thinkingId) {
    if (!thinkingId) return;
    const thinkingMessage = document.getElementById(thinkingId);
    if (thinkingMessage) thinkingMessage.remove();
  },

  getReplyContent(data) {
    const imageValue = data.image || data.imageUrl || data.image_url || data.outputImage || data.output_image;
    const imageValues = data.images || data.imageUrls || data.image_urls || data.outputImages || data.output_images;

    if (Array.isArray(imageValues) && imageValues.length) {
      return imageValues
        .map((image, index) => `![Juno generated image ${index + 1}](${this.getImageSource(image)})`)
        .join('\n\n');
    }

    if (imageValue) {
      return `![Juno generated image](${this.getImageSource(imageValue)})`;
    }

    return (
      data.output ||
      data.response ||
      data.text ||
      JSON.stringify(data)
    );
  },

  hasImageReply(data, replyContent) {
    return Boolean(
      data.image ||
      data.imageUrl ||
      data.image_url ||
      data.outputImage ||
      data.output_image ||
      (Array.isArray(data.images) && data.images.length) ||
      (Array.isArray(data.imageUrls) && data.imageUrls.length) ||
      (Array.isArray(data.image_urls) && data.image_urls.length) ||
      (Array.isArray(data.outputImages) && data.outputImages.length) ||
      (Array.isArray(data.output_images) && data.output_images.length) ||
      /!\[[^\]]*\]\([^)]+\)/.test(replyContent || '')
    );
  },

  getImageSource(image) {
    if (typeof image === 'string') return image;
    return image.url || image.src || image.dataUrl || image.data_url || '';
  },

  addAssistantMessage(message) {
    const history = document.getElementById("chat-history");
    if (!history) return;
    const shouldStickToLatest = this.isNearLatestMessage(history);

    const html = marked.parse(message);

    history.insertAdjacentHTML('beforeend', `
      <div class="chat-row assistant" data-message-role="assistant">
        <div class="chat-bubble assistant markdown-body">
          <div class="message-content">${html}</div>
          ${this.getMessageActionsHtml('assistant')}
        </div>
      </div>
    `);

    if (shouldStickToLatest) history.scrollTop = history.scrollHeight;
    this.updateJumpToLatestVisibility();
  },

  getMessageActionsHtml(role) {
    const retryLabel = role === 'user' ? 'Retry' : 'Regenerate';
    return `
      <div class="message-actions">
        ${this.getMessageActionButton('star', 'Star message')}
        ${this.getMessageActionButton('copy', 'Copy message')}
        ${role === 'assistant' ? `${this.getMessageActionButton('feedback-up', 'Mark helpful')}${this.getMessageActionButton('feedback-down', 'Mark not helpful')}` : ''}
        ${role === 'user' ? this.getMessageActionButton('edit', 'Edit message') : ''}
        ${this.getMessageActionButton('retry', retryLabel)}
        ${this.getMessageActionButton('delete', 'Delete message')}
      </div>
    `;
  },

  getMessageActionButton(action, label) {
    return `
      <button class="message-action-btn" type="button" data-message-action="${action}" aria-label="${label}" title="${label}" data-tooltip="${label}">
        ${this.getMessageActionIcon(action)}
      </button>
    `;
  },

  getMessageActionIcon(action) {
    const icons = {
      star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.5-5-2.6-5 2.6.9-5.5-4-3.9 5.6-.8L12 3.8z"/></svg>',
      copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>',
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
      retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
      delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M9 7l1-2h4l1 2"/><path d="M6 7l1 14h10l1-14"/></svg>',
      'feedback-up': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3z"/><path d="M7 10l4-7a2 2 0 0 1 3 2l-.8 4H19a3 3 0 0 1 2.9 3.7l-1.2 5A4 4 0 0 1 16.8 21H7"/></svg>',
      'feedback-down': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14V3H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3z"/><path d="M7 14l4 7a2 2 0 0 0 3-2l-.8-4H19a3 3 0 0 0 2.9-3.7l-1.2-5A4 4 0 0 0 16.8 3H7"/></svg>'
    };
    return icons[action] || icons.copy;
  },

  wireMessageActions() {
    const history = document.getElementById('chat-history');
    if (!history) return;

    history.addEventListener('click', (event) => {
      const inlineAction = event.target.closest('[data-inline-edit-action]');
      if (inlineAction) {
        this.handleInlineEditAction(inlineAction);
        return;
      }

      const action = event.target.closest('[data-message-action]');
      if (!action) return;

      const row = action.closest('.chat-row');
      const content = row?.querySelector('.message-content');
      const text = content?.textContent.replace(/\s+/g, ' ').trim() || '';
      const actionType = action.dataset.messageAction;

      if (actionType === 'copy') {
        navigator.clipboard?.writeText(text);
        window.SidebarController?.showNotice?.('Message copied.');
      }

      if (actionType === 'star') {
        if (!row) return;
        const isStarred = row.classList.toggle('is-starred');
        row.dataset.starred = isStarred ? 'true' : 'false';
        action.classList.toggle('is-selected', isStarred);
        action.setAttribute('aria-label', isStarred ? 'Unstar message' : 'Star message');
        action.setAttribute('title', isStarred ? 'Unstar message' : 'Star message');
        action.dataset.tooltip = isStarred ? 'Unstar message' : 'Star message';
        window.SidebarController?.showNotice?.(isStarred ? 'Message starred.' : 'Message unstarred.');
        this.saveCurrentChatToRecents();
      }

      if (actionType === 'feedback-up' || actionType === 'feedback-down') {
        if (!row) return;
        const feedback = actionType === 'feedback-up' ? 'helpful' : 'not-helpful';
        const wasSelected = row.dataset.feedback === feedback;
        row.dataset.feedback = wasSelected ? '' : feedback;
        row.classList.toggle('is-helpful', row.dataset.feedback === 'helpful');
        row.classList.toggle('is-not-helpful', row.dataset.feedback === 'not-helpful');
        this.syncMessageActionStates();
        this.saveCurrentChatToRecents();
        window.SidebarController?.showNotice?.(wasSelected ? 'Feedback cleared.' : 'Feedback saved.');
      }

      if (actionType === 'delete') {
        if (!row) return;
        const parent = row.parentElement;
        const nextSibling = row.nextElementSibling;
        const removed = row;
        row.remove();
        window.SidebarController?.showNotice?.('Message deleted.', {
          label: 'Undo',
          onClick: () => {
            if (nextSibling?.parentElement === parent) {
              parent.insertBefore(removed, nextSibling);
            } else {
              parent.appendChild(removed);
            }
            this.saveCurrentChatToRecents();
          }
        });
        this.saveCurrentChatToRecents();
      }

      if (actionType === 'edit') {
        this.startInlineEdit(row);
      }

      if (actionType === 'retry') {
        const retryText = row?.dataset.messageRole === 'user'
          ? text
          : this.getPreviousUserMessageText(row);
        if (retryText) this.submitMessage(retryText);
      }
    });
  },

  startInlineEdit(row) {
    if (!row || row.classList.contains('is-editing-message')) return;

    const content = row.querySelector('.message-content');
    if (!content) return;

    const currentText = content.textContent.replace(/\s+/g, ' ').trim();
    row.dataset.originalMessage = currentText;
    row.classList.add('is-editing-message');
    content.innerHTML = `
      <textarea class="inline-edit-textarea" rows="3">${this.escapeHtml(currentText)}</textarea>
      <div class="inline-edit-actions">
        <button type="button" data-inline-edit-action="save">Save</button>
        <button type="button" data-inline-edit-action="resend">Save and resend</button>
        <button type="button" data-inline-edit-action="cancel">Cancel</button>
      </div>
    `;

    const textarea = content.querySelector('textarea');
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  },

  handleInlineEditAction(button) {
    const row = button.closest('.chat-row');
    const content = row?.querySelector('.message-content');
    const textarea = content?.querySelector('.inline-edit-textarea');
    if (!row || !content) return;

    const action = button.dataset.inlineEditAction;
    const original = row.dataset.originalMessage || '';
    const nextText = textarea?.value.trim() || '';

    if (action === 'cancel') {
      content.innerHTML = original ? `<div>${this.escapeHtml(original)}</div>` : '';
      row.classList.remove('is-editing-message');
      delete row.dataset.originalMessage;
      return;
    }

    if (!nextText) {
      window.SidebarController?.showNotice?.('Message cannot be empty.');
      return;
    }

    content.innerHTML = `<div>${this.escapeHtml(nextText)}</div>`;
    row.classList.remove('is-editing-message');
    delete row.dataset.originalMessage;
    this.saveCurrentChatToRecents();
    window.SidebarController?.showNotice?.(action === 'resend' ? 'Message updated and resent.' : 'Message updated.');

    if (action === 'resend') this.submitMessage(nextText);
  },

  getPreviousUserMessageText(row) {
    let current = row?.previousElementSibling;
    while (current) {
      if (current.dataset.messageRole === 'user') {
        return current.querySelector('.message-content')?.textContent.replace(/\s+/g, ' ').trim() || '';
      }
      current = current.previousElementSibling;
    }
    return '';
  },

  wireChatToolbar() {
    const titleButton = document.getElementById('chat-title-btn');
    const searchInput = document.getElementById('chat-search-input');
    const jumpLatest = document.getElementById('jump-latest');
    const history = document.getElementById('chat-history');

    titleButton?.addEventListener('click', () => this.renameActiveChat());
    searchInput?.addEventListener('input', () => this.searchCurrentChat(searchInput.value));
    searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchInput.value = '';
        this.clearChatSearch();
        searchInput.blur();
      }
    });
    jumpLatest?.addEventListener('click', () => this.scrollToLatestMessage());
    history?.addEventListener('scroll', () => this.updateJumpToLatestVisibility(), { passive: true });
    window.addEventListener('resize', () => this.updateJumpToLatestVisibility(), { passive: true });
    this.updateJumpToLatestVisibility();
  },

  wireConversationLink() {
    const copyButton = document.getElementById('copy-chat-link');
    copyButton?.addEventListener('click', () => this.copyConversationLink());
  },

  wireQuickPrompts() {
    document.querySelectorAll('[data-quick-prompt]').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById('welcome-input');
        if (!input) return;
        input.value = button.dataset.quickPrompt || '';
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  },

  renameActiveChat() {
    const history = document.getElementById('chat-history');
    if (this.welcomeActive && !history?.innerHTML.trim()) return;

    const nextTitle = window.prompt('Rename current conversation', this.currentChatTitle || 'New chat');
    if (!nextTitle || !nextTitle.trim()) return;

    this.currentChatTitle = nextTitle.trim().slice(0, 64);
    this.updateChatHeader();
    this.saveCurrentChatToRecents();
    window.SidebarController?.showNotice?.('Conversation renamed.');
  },

  updateChatHeader() {
    const titleGroup = document.getElementById('chat-title-group');
    const searchWrap = document.getElementById('chat-search-wrap');
    const title = document.getElementById('active-chat-title');
    const meta = document.getElementById('active-chat-meta');
    const history = document.getElementById('chat-history');
    const hasChat = Boolean(history?.innerHTML.trim()) && !this.welcomeActive;

    if (titleGroup) titleGroup.classList.toggle('is-hidden', !hasChat);
    if (searchWrap) searchWrap.classList.toggle('is-hidden', !hasChat);
    document.getElementById('copy-chat-link')?.classList.toggle('is-hidden', !hasChat);
    if (!hasChat) {
      document.getElementById('chat-jump-controls')?.classList.add('is-hidden');
      return;
    }

    this.syncMessageActionStates();
    const messageCount = history.querySelectorAll('.chat-row[data-message-role]').length;
    const starredCount = history.querySelectorAll('.chat-row.is-starred').length;
    const pinnedFileCount = this.currentPinnedFiles.length;
    if (title) title.textContent = this.currentChatTitle || this.getChatTitle(history.textContent) || 'Current chat';
    if (meta) {
      meta.textContent = [
        `${messageCount} message${messageCount === 1 ? '' : 's'}`,
        starredCount ? `${starredCount} starred` : '',
        pinnedFileCount ? `${pinnedFileCount} pinned file${pinnedFileCount === 1 ? '' : 's'}` : '',
        this.activeAgent || 'Juno 2.5'
      ].filter(Boolean).join(' · ');
    }
    requestAnimationFrame(() => this.updateJumpToLatestVisibility());
  },

  copyConversationLink() {
    const history = document.getElementById('chat-history');
    if (!history?.innerHTML.trim()) return;

    this.saveCurrentChatToRecents();
    const url = new URL(window.location.href);
    url.searchParams.set('chat', this.currentChatId);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url.toString());
    } else {
      window.prompt('Copy conversation link', url.toString());
    }
    window.SidebarController?.showNotice?.('Conversation link copied.');
  },

  searchCurrentChat(query) {
    const history = document.getElementById('chat-history');
    const count = document.getElementById('chat-search-count');
    if (!history) return;

    const normalized = query.trim().toLowerCase();
    const rows = Array.from(history.querySelectorAll('.chat-row[data-message-role]'));
    rows.forEach(row => row.classList.remove('chat-search-hit'));

    if (!normalized) {
      if (count) count.textContent = '0';
      return;
    }

    const matches = rows.filter(row => row.textContent.toLowerCase().includes(normalized));
    matches.forEach(row => row.classList.add('chat-search-hit'));
    if (count) count.textContent = String(matches.length);
    matches[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  scrollToLatestMessage() {
    const history = document.getElementById('chat-history');
    if (!history) return;
    history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' });
    document.getElementById('chat-jump-controls')?.classList.add('is-hidden');
  },

  updateJumpToLatestVisibility() {
    const history = document.getElementById('chat-history');
    const controls = document.getElementById('chat-jump-controls');
    if (!history || !controls) return;

    const hasChat = !this.welcomeActive && Boolean(history.querySelector('.chat-row[data-message-role]'));
    const distanceFromBottom = history.scrollHeight - history.scrollTop - history.clientHeight;
    controls.classList.toggle('is-hidden', !hasChat || distanceFromBottom < 72);
  },

  isNearLatestMessage(history = document.getElementById('chat-history')) {
    if (!history) return true;
    return history.scrollHeight - history.scrollTop - history.clientHeight < 72;
  },

  scrollToFirstSearchResult() {
    const firstResult = document.querySelector('.chat-search-hit');
    if (firstResult) {
      firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    this.scrollToLatestMessage();
  },

  clearChatSearch() {
    const input = document.getElementById('chat-search-input');
    const count = document.getElementById('chat-search-count');
    document.querySelectorAll('.chat-search-hit').forEach(row => row.classList.remove('chat-search-hit'));
    if (input) input.value = '';
    if (count) count.textContent = '0';
  },

  syncMessageActionStates() {
    document.querySelectorAll('.chat-row[data-starred="true"]').forEach(row => row.classList.add('is-starred'));
    document.querySelectorAll('.chat-row[data-feedback="helpful"]').forEach(row => row.classList.add('is-helpful'));
    document.querySelectorAll('.chat-row[data-feedback="not-helpful"]').forEach(row => row.classList.add('is-not-helpful'));

    document.querySelectorAll('.chat-row .message-actions [data-message-action]').forEach(button => {
      const action = button.dataset.messageAction;
      const row = button.closest('.chat-row');
      const role = row?.dataset.messageRole;
      const fallbackLabels = {
        star: row?.classList.contains('is-starred') ? 'Unstar message' : 'Star message',
        copy: 'Copy message',
        edit: 'Edit message',
        retry: role === 'user' ? 'Retry' : 'Regenerate',
        delete: 'Delete message',
        'feedback-up': row?.dataset.feedback === 'helpful' ? 'Helpful selected' : 'Mark helpful',
        'feedback-down': row?.dataset.feedback === 'not-helpful' ? 'Not helpful selected' : 'Mark not helpful'
      };

      const label = fallbackLabels[action] || 'Message action';
      button.classList.add('message-action-btn');
      button.innerHTML = this.getMessageActionIcon(action);
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.dataset.tooltip = label;
      button.classList.toggle('is-selected',
        (action === 'star' && row?.classList.contains('is-starred')) ||
        (action === 'feedback-up' && row?.dataset.feedback === 'helpful') ||
        (action === 'feedback-down' && row?.dataset.feedback === 'not-helpful')
      );
    });
  },

  applySettings(settings = {}) {
    this.voiceEnabled = settings.voiceEnabled !== false;
    this.voiceSpeakingThreshold = Number(settings.voiceThreshold || this.voiceSpeakingThreshold);
    if (settings.defaultModel) {
      this.activeAgent = settings.defaultModel;
      this.updateModelPills(settings.defaultModel);
    }
  },

  saveDraft(source, value) {
    const text = String(value || '');
    if (!text.trim()) {
      localStorage.removeItem(this.draftKey);
      return;
    }

    localStorage.setItem(this.draftKey, JSON.stringify({
      source,
      value: text,
      savedAt: new Date().toISOString()
    }));
  },

  restoreDrafts() {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(this.draftKey) || 'null');
    } catch (error) {
      draft = null;
    }

    if (!draft?.value) return;

    const input = document.getElementById('chat-input');
    const welcomeInput = document.getElementById('welcome-input');
    const target = draft.source === 'chat' ? input : welcomeInput;

    if (target) {
      target.value = draft.value;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },

  clearDraft() {
    localStorage.removeItem(this.draftKey);
  },

  showVoiceNotice(message) {
    if (window.SidebarController && typeof window.SidebarController.showNotice === 'function') {
      window.SidebarController.showNotice(message);
      return;
    }

    this.addAssistantMessage(message);
  },

  async openVoiceSetupPanel() {
    if (localStorage.getItem(this.voiceSetupKey) === 'true') return true;

    const supportsSpeech = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const supportsMic = Boolean(navigator.mediaDevices?.getUserMedia);
    let permissionText = 'Ask when microphone starts';

    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        permissionText = permission.state === 'granted' ? 'Allowed' : permission.state === 'denied' ? 'Blocked' : 'Ask on start';
      }
    } catch (error) {
      permissionText = 'Ask on start';
    }

    return new Promise(resolve => {
      let modal = document.getElementById('voice-setup-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'voice-setup-modal';
        modal.className = 'settings-modal';
        modal.innerHTML = `
          <div class="settings-dialog voice-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="voice-setup-title">
            <div class="settings-header">
              <div>
                <h2 id="voice-setup-title">Microphone check</h2>
                <p>Juno uses your browser microphone and speech recognition.</p>
              </div>
              <button class="settings-close" type="button" aria-label="Close microphone check">&times;</button>
            </div>
            <div class="voice-check-list">
              <div><span>Speech recognition</span><strong data-voice-support></strong></div>
              <div><span>Microphone API</span><strong data-mic-support></strong></div>
              <div><span>Permission</span><strong data-mic-permission></strong></div>
            </div>
            <div class="settings-actions">
              <button class="settings-secondary" type="button">Cancel</button>
              <button class="settings-primary" type="button">Start listening</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      modal.querySelector('[data-voice-support]').textContent = supportsSpeech ? 'Ready' : 'Unsupported';
      modal.querySelector('[data-mic-support]').textContent = supportsMic ? 'Ready' : 'Unsupported';
      modal.querySelector('[data-mic-permission]').textContent = permissionText;
      modal.classList.add('open');

      const close = (result) => {
        modal.classList.remove('open');
        modal.querySelector('.settings-primary').onclick = null;
        modal.querySelector('.settings-secondary').onclick = null;
        modal.querySelector('.settings-close').onclick = null;
        if (result) localStorage.setItem(this.voiceSetupKey, 'true');
        resolve(result);
      };

      modal.querySelector('.settings-primary').onclick = () => close(supportsSpeech && supportsMic);
      modal.querySelector('.settings-secondary').onclick = () => close(false);
      modal.querySelector('.settings-close').onclick = () => close(false);
    });
  },

  setVoiceListeningState(input, button, isListening) {
    const container = button?.closest('.composer, .welcome-composer');

    if (isListening) {
      this.activeVoiceContainer = container;
      container?.classList.add('is-voice-listening');
      button?.classList.add('is-listening');
      button?.setAttribute('aria-label', 'Stop voice input');
      button?.setAttribute('aria-pressed', 'true');

      const originalPlaceholder = input.getAttribute('placeholder') || '';
      if (input.dataset.voicePlaceholder === undefined) {
        input.dataset.voicePlaceholder = originalPlaceholder;
      }
      input.setAttribute('placeholder', 'Listening...');
      return;
    }

    container?.classList.remove('is-voice-listening');
    container?.classList.remove('is-user-speaking');
    container?.style.removeProperty('--voice-level');
    this.activeVoiceContainer?.classList.remove('is-voice-listening');
    this.activeVoiceContainer?.classList.remove('is-user-speaking');
    this.activeVoiceContainer?.style.removeProperty('--voice-level');
    button?.classList.remove('is-listening');
    button?.setAttribute('aria-label', 'Voice');
    button?.setAttribute('aria-pressed', 'false');

    if (input?.dataset.voicePlaceholder !== undefined) {
      input.setAttribute('placeholder', input.dataset.voicePlaceholder);
      delete input.dataset.voicePlaceholder;
    }

    this.activeVoiceContainer = null;
  },

  async startVoiceLevelMonitor(container) {
    this.stopVoiceLevelMonitor();

    if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      const sampleBuffer = new Uint8Array(analyser.fftSize);
      source.connect(analyser);

      this.voiceStream = stream;
      this.voiceAudioContext = audioContext;
      this.voiceAnalyser = analyser;

      const updateSpeakingState = () => {
        if (!this.voiceShouldListen || !this.voiceAnalyser) return;

        this.voiceAnalyser.getByteTimeDomainData(sampleBuffer);
        const rms = Math.sqrt(sampleBuffer.reduce((sum, value) => {
          const normalized = (value - 128) / 128;
          return sum + normalized * normalized;
        }, 0) / sampleBuffer.length);

        const isSpeaking = rms > this.voiceSpeakingThreshold;
        container?.classList.toggle('is-user-speaking', isSpeaking);
        container?.style.setProperty('--voice-level', String(Math.min(1, rms * 9)));
        this.voiceAnimationFrame = requestAnimationFrame(updateSpeakingState);
      };

      updateSpeakingState();
      return true;
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.showVoiceNotice('Microphone access was blocked. Allow microphone access in your browser to use voice input.');
        return false;
      }

      this.showVoiceNotice('Juno could not connect to your microphone. Check your browser audio input and try again.');
      return false;
    }
  },

  stopVoiceLevelMonitor() {
    window.cancelAnimationFrame(this.voiceAnimationFrame);
    this.voiceAnimationFrame = null;
    this.activeVoiceContainer?.classList.remove('is-user-speaking');
    this.activeVoiceContainer?.style.removeProperty('--voice-level');

    if (this.voiceStream) {
      this.voiceStream.getTracks().forEach(track => track.stop());
    }

    if (this.voiceAudioContext && this.voiceAudioContext.state !== 'closed') {
      this.voiceAudioContext.close();
    }

    this.voiceStream = null;
    this.voiceAudioContext = null;
    this.voiceAnalyser = null;
  },

  async toggleVoiceInput(input, button) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!this.voiceEnabled) {
      this.showVoiceNotice('Voice input is disabled in Settings.');
      return;
    }

    if (!SpeechRecognition) {
      this.showVoiceNotice('Voice input is not supported in this browser.');
      return;
    }

    if (this.recognition) {
      const shouldRestartForNewTarget = this.activeVoiceTarget !== input;
      this.voiceShouldListen = false;
      window.clearTimeout(this.voiceRestartTimer);
      this.stopVoiceLevelMonitor();
      this.recognition.stop();
      if (shouldRestartForNewTarget) {
        window.setTimeout(() => this.toggleVoiceInput(input, button), 180);
      }
      return;
    }

    const recognition = new SpeechRecognition();
    const wasAlreadyListening = button.classList.contains('is-listening');
    const voiceContainer = button?.closest('.composer, .welcome-composer');

    if (!wasAlreadyListening) {
      const setupReady = await this.openVoiceSetupPanel();
      if (!setupReady) return;
      const micReady = await this.startVoiceLevelMonitor(voiceContainer);
      if (!micReady) return;
    }

    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    this.recognition = recognition;
    this.activeVoiceTarget = input;
    this.activeVoiceButton = button;
    this.voiceBaseText = input.value.trim();
    this.voiceFinalText = '';
    this.voiceShouldListen = true;
    this.voiceLastError = '';
    this.setVoiceListeningState(input, button, true);
    if (!wasAlreadyListening) {
      this.showVoiceNotice('Listening. Speak now and Juno will transcribe it into chat.');
    }

    recognition.onresult = (event) => {
      const finalParts = [];
      const interimParts = [];

      Array.from(event.results).slice(event.resultIndex).forEach(result => {
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) return;

        if (result.isFinal) {
          finalParts.push(transcript);
        } else {
          interimParts.push(transcript);
        }
      });

      if (finalParts.length) {
        this.voiceFinalText = [this.voiceFinalText, finalParts.join(' ')]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const transcript = [this.voiceBaseText, this.voiceFinalText, interimParts.join(' ')]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trimStart();

      input.value = transcript;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      this.updateActiveAgent(transcript);
    };

    recognition.onerror = (event) => {
      this.voiceLastError = event.error || '';

      if (event.error === 'no-speech') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.voiceShouldListen = false;
        this.showVoiceNotice('Microphone access was blocked. Allow microphone access in your browser to use voice input.');
        return;
      }

      if (event.error === 'audio-capture') {
        this.voiceShouldListen = false;
        this.showVoiceNotice('No microphone was found. Connect a microphone and try again.');
        return;
      }

      this.showVoiceNotice('Voice input paused. Click the microphone if you want to try again.');
    };

    recognition.onend = () => {
      const activeButton = this.activeVoiceButton || button;
      const activeInput = this.activeVoiceTarget || input;

      if (this.voiceShouldListen && this.voiceLastError !== 'not-allowed' && this.voiceLastError !== 'service-not-allowed' && this.voiceLastError !== 'audio-capture') {
        this.recognition = null;
        this.voiceBaseText = activeInput.value.trim();
        this.voiceFinalText = '';
        this.voiceLastError = '';
        window.clearTimeout(this.voiceRestartTimer);
        this.voiceRestartTimer = window.setTimeout(() => {
          if (this.voiceShouldListen && this.activeVoiceTarget === activeInput) {
            this.toggleVoiceInput(activeInput, activeButton);
          }
        }, 350);
        return;
      }

      this.setVoiceListeningState(activeInput, activeButton, false);
      this.stopVoiceLevelMonitor();
      this.recognition = null;
      this.activeVoiceTarget = null;
      this.activeVoiceButton = null;
      this.voiceBaseText = '';
      this.voiceFinalText = '';
      this.voiceShouldListen = false;
      this.voiceLastError = '';
    };

    try {
      recognition.start();
    } catch (error) {
      this.voiceShouldListen = false;
      this.recognition = null;
      this.activeVoiceTarget = null;
      this.activeVoiceButton = null;
      this.setVoiceListeningState(input, button, false);
      this.stopVoiceLevelMonitor();
      this.showVoiceNotice('Voice input could not start. Please try again.');
    }
  },

  wireFilesPanel() {
    const filesToggle = document.getElementById('files-toggle');
    const filesPanel = document.getElementById('files-panel');
    const filesClose = document.getElementById('files-close');
    const filesEmptyUpload = document.getElementById('files-empty-upload');
    const fileInput = document.getElementById('file-input') || document.getElementById('welcome-file-input');

    if (filesToggle && filesPanel) {
      filesToggle.addEventListener('click', () => {
        filesPanel.style.display = 'flex';
        filesToggle.style.display = 'none';
        filesToggle.classList.add('active');
      });
    }

    if (filesClose && filesPanel && filesToggle) {
      filesClose.addEventListener('click', () => {
        filesPanel.style.display = 'none';
        filesToggle.style.display = 'flex';
      });
    }

    filesEmptyUpload?.addEventListener('click', () => fileInput?.click());
  },

  renderFilesPanel() {
    const filesList = document.getElementById('files-list');
    const filesEmpty = document.getElementById('files-empty');
    const pinnedFiles = document.getElementById('pinned-files');
    if (!filesList || !filesEmpty) return;

    const pinnedIds = new Set(this.currentPinnedFiles.map(file => file.id));
    const unpinnedFiles = this.uploadedFiles.filter(file => !pinnedIds.has(file.id));
    const hasFiles = this.currentPinnedFiles.length || unpinnedFiles.length;

    filesEmpty.style.display = hasFiles ? 'none' : 'flex';
    if (pinnedFiles) {
      pinnedFiles.innerHTML = this.currentPinnedFiles.length ? `
        <div class="file-section-label">Pinned to this chat</div>
        ${this.currentPinnedFiles.map(file => this.getFileListItemHtml(file, true)).join('')}
      ` : '';
    }
    filesList.innerHTML = unpinnedFiles.length ? `
      <div class="file-section-label">Recent uploads</div>
      ${unpinnedFiles.map(file => this.getFileListItemHtml(file, false)).join('')}
    ` : '';
  },

  getFileListItemHtml(file, isPinned) {
    return `
      <div class="file-list-item ${isPinned ? 'is-pinned-file' : ''}">
        <button class="file-list-open" type="button" onclick="HomeController.handleFilePanelClick('${file.id}', ${isPinned})">
          <span class="file-list-type">${this.isPdf(file) ? 'PDF' : this.isImage(file) ? 'IMG' : 'FILE'}</span>
          <span class="file-list-name">${this.escapeHtml(file.shortName)}</span>
          <span class="file-list-size">${this.formatFileSize(file.size)}</span>
        </button>
        <button class="file-pin-btn" type="button" onclick="HomeController.togglePinnedFile('${file.id}', ${isPinned})">${isPinned ? 'Unpin' : 'Pin'}</button>
      </div>
    `;
  },

  upsertUploadedFile(file) {
    this.uploadedFiles = [file, ...this.uploadedFiles.filter(item => item.id !== file.id)].slice(0, 30);
  },

  handleFilePanelClick(fileId, isPinned = false) {
    const file = (isPinned ? this.currentPinnedFiles : this.uploadedFiles).find(item => item.id === fileId);
    if (!file) return;
    if (this.isPdf(file)) this.openPdfPreview(file);
    else if (file.objectUrl || file.dataUrl) window.open(file.objectUrl || file.dataUrl, '_blank', 'noopener');
  },

  togglePinnedFile(fileId, isPinned = false) {
    const file = isPinned
      ? this.currentPinnedFiles.find(item => item.id === fileId)
      : this.uploadedFiles.find(item => item.id === fileId);
    if (!file) return;

    if (isPinned) {
      this.currentPinnedFiles = this.currentPinnedFiles.filter(item => item.id !== fileId);
      window.SidebarController?.showNotice?.('File unpinned.');
    } else {
      this.currentPinnedFiles = [
        this.serializeFile(file),
        ...this.currentPinnedFiles.filter(item => item.id !== file.id)
      ].slice(0, 8).map(item => this.hydrateFile(item));
      window.SidebarController?.showNotice?.('File pinned to this chat.');
    }

    this.saveCurrentChatToRecents();
    this.renderFilesPanel();
    this.updateChatHeader();
  },

  openPdfPreviewById(fileId) {
    const file = this.uploadedFiles.find(item => item.id === fileId) || this.currentPinnedFiles.find(item => item.id === fileId);
    if (file) this.openPdfPreview(file);
  },

  openPdfPreview(file) {
    const pdfPanel = document.getElementById('pdf-panel');
    const pdfBody = document.getElementById('pdf-body');
    if (!pdfPanel || !pdfBody) return;

    pdfPanel.style.display = 'flex';
    pdfBody.innerHTML = this.isPdf(file)
      ? `<iframe class="pdf-frame" src="${file.objectUrl || file.dataUrl}" title="${this.escapeHtml(file.shortName)}"></iframe>`
      : `<div class="pdf-answer">Preview unavailable</div>`;
  },

  openPdfPanel() {
    const pdfPanel = document.getElementById('pdf-panel');
    if (pdfPanel) pdfPanel.style.display = 'flex';
  },

  closePdfPanel() {
    const pdfPanel = document.getElementById('pdf-panel');
    if (pdfPanel) pdfPanel.style.display = 'none';
  },

  isImage(file) {
    return (file.type || '').startsWith('image/');
  },

  isPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  },

  updateActiveAgent(message = '') {
    const nextAgent = this.detectAgentForMessage(message);
    this.activeAgent = nextAgent;
    this.updateModelPills(nextAgent);

    return nextAgent;
  },

  updateModelPills(nextAgent) {
    document.querySelectorAll('.model-pill').forEach(pill => {
      pill.textContent = nextAgent;
      pill.classList.toggle('is-agent-selected', nextAgent !== 'Juno 2.5');
      pill.style.setProperty('--agent-color', this.getAgentColor(nextAgent));
    });
  },

  detectAgentForMessage(message = '') {
    const normalized = message.toLowerCase();
    if (normalized === 'reset') return 'Juno 2.5';
    if (!normalized.trim()) return this.activeAgent || 'Juno 2.5';

    const route = this.agentRoutes.find(agent =>
      agent.keywords.some(keyword => normalized.includes(keyword))
    );

    return route ? route.name : 'Juno 2.5';
  },

  getAgentColor(agentName) {
    const agent = this.agentRoutes.find(route => route.name === agentName);
    return agent ? agent.color : '#00ADA9';
  },

  formatFileSize(size) {
    if (!size && size !== 0) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  },

  wait(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }
};

document.addEventListener('DOMContentLoaded', () => HomeController.init());
