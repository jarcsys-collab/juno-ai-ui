// Controller: Home view - welcome transition, composer, attachments, voice input, PDF/Files panels
window.HomeController = {
  sendTimers: [],
  attachedFiles: [],
  uploadedFiles: [],
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
    this.openPendingRecentChat();
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
      });
    }

    if (welcomeInput) {
      welcomeInput.addEventListener('input', () => this.updateActiveAgent(welcomeInput.value));
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

    input.addEventListener('input', () => this.updateActiveAgent(input.value));

    sendBtn.addEventListener('click', () => {
      if (sendBtn.classList.contains('is-busy')) return;
      this.updateActiveAgent(input.value);
      this.submitMessage(input.value.trim());
      input.value = '';
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

    const attachments = await Promise.all(readableFiles.map(file => this.readAttachment(file)));
    this.attachedFiles = this.attachedFiles.concat(attachments).slice(0, 12);
    this.renderAttachmentPreviews();

    attachments.forEach(file => {
      this.upsertUploadedFile(file);
      if (this.isPdf(file)) this.openPdfPreview(file);
    });
    this.renderFilesPanel();
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
    tray.innerHTML = this.attachedFiles.map(file => {
      const preview = this.isImage(file)
        ? `<img src="${file.dataUrl}" alt="${this.escapeHtml(file.shortName)}">`
        : `<div class="file-chip-icon">${this.isPdf(file) ? 'PDF' : 'FILE'}</div>`;

      return `
        <div class="photo-chip file-chip" title="${this.escapeHtml(file.name)}">
          ${preview}
          <span>${this.escapeHtml(file.shortName)}</span>
          <button class="photo-remove" type="button" aria-label="Remove ${this.escapeHtml(file.shortName)}" data-file-id="${file.id}">&times;</button>
        </div>
      `;
    }).join('') + (this.attachedFiles.length ? `<div class="photo-count">${this.attachedFiles.length}/12</div>` : '');

    tray.querySelectorAll('.photo-remove').forEach(button => {
      button.addEventListener('click', () => {
        this.attachedFiles = this.attachedFiles.filter(file => file.id !== button.dataset.fileId);
        this.renderAttachmentPreviews();
      });
    });
  },

  async submitMessage(message) {
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn && sendBtn.classList.contains('is-busy')) return;

    const files = [...this.attachedFiles];
    if (!message && files.length === 0) return;

    const wantsPdf = message.toLowerCase().includes('pdf');
    const hasUpload = files.length > 0;
    const agent = this.updateActiveAgent(message);

    this.setWelcomeVisible(false);
    this.addUserMessage(message, files);
    if (message) this.currentChatTitle = this.getChatTitle(message);
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
    }
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

    history.innerHTML += `
      <div class="chat-row user">
        <div class="chat-bubble user">
          ${attachmentHtml}
          ${messageHtml}
        </div>
      </div>
    `;

    history.scrollTop = history.scrollHeight;
  },

  startNewChat() {
    this.saveCurrentChatToRecents();
    this.currentChatId = null;
    this.currentChatTitle = '';
    this.attachedFiles = [];
    this.uploadedFiles = [];
    this.renderAttachmentPreviews();

    const history = document.getElementById('chat-history');
    const input = document.getElementById('chat-input');
    const welcomeInput = document.getElementById('welcome-input');

    if (history) history.innerHTML = '';
    if (input) input.value = '';
    if (welcomeInput) welcomeInput.value = '';

    this.updateActiveAgent('reset');
    this.setWelcomeVisible(true);
  },

  saveCurrentChatToRecents() {
    const history = document.getElementById('chat-history');
    if (!history || !history.innerHTML.trim()) return;

    const text = history.textContent.trim();
    if (!text) return;

    const chat = {
      id: this.currentChatId || `chat-${Date.now()}`,
      title: this.currentChatTitle || this.getChatTitle(text),
      html: history.innerHTML,
      savedAt: new Date().toISOString()
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
    history.innerHTML = chat.html;
    this.setWelcomeVisible(false);
    history.scrollTop = history.scrollHeight;
  },

  openPendingRecentChat() {
    const pendingKey = window.SidebarController?.pendingChatKey || 'juno-open-chat-id';
    const pendingChatId = localStorage.getItem(pendingKey);
    if (!pendingChatId) return;

    localStorage.removeItem(pendingKey);
    this.loadRecentChat(pendingChatId);
  },

  getChatTitle(value) {
    return String(value).replace(/\s+/g, ' ').trim().slice(0, 42) || 'Untitled chat';
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

  addThinkingMessage(options = {}) {
    const history = document.getElementById("chat-history");
    if (!history) return null;

    const thinkingId = `thinking-${Date.now()}`;
    const message = options.message || '';
    const isImageRequest = /image|photo|picture|render|visual|logo|poster/i.test(message);
    const label = this.getThinkingLabel(options, isImageRequest);

    history.innerHTML += `
      <div class="chat-row assistant" id="${thinkingId}">
        <div class="chat-bubble assistant thinking-bubble" aria-live="polite">
          <span class="thinking-label">${label}</span>
          <span class="thinking-dots"><span></span><span></span><span></span></span>
        </div>
      </div>
    `;

    history.scrollTop = history.scrollHeight;
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

    const html = marked.parse(message);

    history.innerHTML += `
      <div class="chat-row assistant">
        <div class="chat-bubble assistant markdown-body">
          ${html}
        </div>
      </div>
    `;

    history.scrollTop = history.scrollHeight;
  },

  showVoiceNotice(message) {
    if (window.SidebarController && typeof window.SidebarController.showNotice === 'function') {
      window.SidebarController.showNotice(message);
      return;
    }

    this.addAssistantMessage(message);
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
      const micReady = await this.startVoiceLevelMonitor(voiceContainer);
      if (!micReady) return;
    }

    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
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

      Array.from(event.results).forEach(result => {
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) return;

        if (result.isFinal) {
          finalParts.push(transcript);
        } else {
          interimParts.push(transcript);
        }
      });

      this.voiceFinalText = finalParts.join(' ');
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
  },

  renderFilesPanel() {
    const filesList = document.getElementById('files-list');
    const filesEmpty = document.getElementById('files-empty');
    if (!filesList || !filesEmpty) return;

    filesEmpty.style.display = this.uploadedFiles.length ? 'none' : 'flex';
    filesList.innerHTML = this.uploadedFiles.map(file => `
      <button class="file-list-item" type="button" onclick="HomeController.handleFilePanelClick('${file.id}')">
        <span class="file-list-type">${this.isPdf(file) ? 'PDF' : this.isImage(file) ? 'IMG' : 'FILE'}</span>
        <span class="file-list-name">${this.escapeHtml(file.shortName)}</span>
        <span class="file-list-size">${this.formatFileSize(file.size)}</span>
      </button>
    `).join('');
  },

  upsertUploadedFile(file) {
    this.uploadedFiles = [file, ...this.uploadedFiles.filter(item => item.id !== file.id)].slice(0, 30);
  },

  handleFilePanelClick(fileId) {
    const file = this.uploadedFiles.find(item => item.id === fileId);
    if (!file) return;
    if (this.isPdf(file)) this.openPdfPreview(file);
  },

  openPdfPreviewById(fileId) {
    const file = this.uploadedFiles.find(item => item.id === fileId);
    if (file) this.openPdfPreview(file);
  },

  openPdfPreview(file) {
    const pdfPanel = document.getElementById('pdf-panel');
    const pdfBody = document.getElementById('pdf-body');
    if (!pdfPanel || !pdfBody) return;

    pdfPanel.style.display = 'flex';
    pdfBody.innerHTML = this.isPdf(file)
      ? `<iframe class="pdf-frame" src="${file.objectUrl}" title="${this.escapeHtml(file.shortName)}"></iframe>`
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

    document.querySelectorAll('.model-pill').forEach(pill => {
      pill.textContent = nextAgent;
      pill.classList.toggle('is-agent-selected', nextAgent !== 'Juno 2.5');
      pill.style.setProperty('--agent-color', this.getAgentColor(nextAgent));
    });

    return nextAgent;
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
