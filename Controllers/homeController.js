// Controller: Home view — agent tiles, composer, send-button states, PDF/Files panels
window.HomeController = {
  sendTimers: [],
 
  init() {
    this.renderTiles();
    this.wireComposer();
    this.wireFilesPanel();
  },
 
  renderTiles() {
    const grid = document.getElementById('agent-tiles');
    if (!grid) return;
    grid.innerHTML = AgentsModel.map(a => `
      <button class="tile" type="button">
        <div class="tile-icon" style="background:${a.color}1a;color:${a.color}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">${a.icon}</svg>
        </div>
        <div class="tile-body">
          <div class="tile-title">${a.title}</div>
          <div class="tile-desc">${a.desc}</div>
        </div>
      </button>`).join('');
  },
 
  wireComposer() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
 
  if (!input || !sendBtn) return;
 
  sendBtn.addEventListener('click', async () => {
 
    if (
      sendBtn.classList.contains('is-busy') ||
      sendBtn.classList.contains('is-sending')
    ) return;
 
    const message = input.value.trim();
 
    if (!message) return;
 
    const wantsPdf = message.toLowerCase().includes('pdf');
 
    // Show the user's message
    this.addUserMessage(message);
 
    input.value = '';
 
    sendBtn.setAttribute('aria-label', 'Generating response');
    sendBtn.classList.add('is-sending');
 
    try {
 
      const response = await fetch(
        "https://jarctech-ai-n8n-rnd.onrender.com/webhook/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: message
          })
        }
      );
 
      const data = await response.json();
 
      console.log("Webhook Response:", data);
 
      this.addAssistantMessage(
        data.output ||
        data.response ||
        data.text ||
        JSON.stringify(data)
      );
 
    } catch (error) {
 
      console.error(error);
 
      this.addAssistantMessage(
        "Unable to contact Juno."
      );
 
    }
 
    this.sendTimers.push(setTimeout(() => {
      sendBtn.classList.remove('is-sending');
      sendBtn.classList.add('is-busy', 'is-thinking');
    }, 180));
 
    this.sendTimers.push(setTimeout(() => {
      sendBtn.classList.remove('is-busy', 'is-thinking');
      sendBtn.setAttribute('aria-label', 'Send message');
 
      if (wantsPdf) {
        this.openPdfPanel();
      }
 
    }, 180 + 2200));
 
  });
 
  input.addEventListener('keydown', (e) => {
 
    if (e.key === 'Enter' && !e.shiftKey) {
 
      e.preventDefault();
 
      sendBtn.click();
 
    }
 
  });
 
},
 
    addUserMessage(message) {
 
    const history = document.getElementById("chat-history");
    if (!history) return;
 
    history.innerHTML += `
      <div class="chat-row user">
        <div class="chat-bubble user">
          ${marked.parse(message)}
        </div>
      </div>
    `;
 
    history.scrollTop = history.scrollHeight;
 
  },
 
  addAssistantMessage(message) {
 
    const history = document.getElementById("chat-history");
    if (!history) return;
 
    history.innerHTML += `
      <div class="chat-row assistant">
        <div class="chat-bubble assistant">
          ${message}
        </div>
      </div>
    `;
 
    history.scrollTop = history.scrollHeight;
 
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
 
  openPdfPanel() {
    const pdfPanel = document.getElementById('pdf-panel');
    if (pdfPanel) pdfPanel.style.display = 'flex';
  },
 
  closePdfPanel() {
    const pdfPanel = document.getElementById('pdf-panel');
    if (pdfPanel) pdfPanel.style.display = 'none';
  }
};
document.addEventListener('DOMContentLoaded', () => HomeController.init());
