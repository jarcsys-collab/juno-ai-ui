// Controller: Projects view - recommended placeholder cards
window.ProjectsController = {
  init() {
    this.renderProjects(ProjectsModel);
  },

  renderProjects(list) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = `
        <div class="projects-empty-state">
          <strong>No projects yet</strong>
          <span>Create a project from a chat when you are ready to organize business work.</span>
          <button type="button" onclick="window.location.href='../Home/index.html'">Start a chat</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(p => `
      <article class="recommended-card">
        <div class="recommended-card-header">
          <h3>${p.title}</h3>
          <p>${p.desc}</p>
        </div>
        <div class="recommended-preview recommended-${p.type}">
          ${this.getIcon(p.type)}
        </div>
        <div class="recommended-card-footer">
          <button type="button">${p.action}</button>
        </div>
      </article>`).join('');
  },

  getIcon(type) {
    const icons = {
      people: '<svg width="84" height="84" viewBox="0 0 84 84" fill="none"><circle cx="31" cy="28" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="53" cy="28" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="42" cy="45" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M20 39c0 13 13 13 22 13s22 0 22-13c0-4-4-7-11-7M31 32c-7 0-11 3-11 7M26 55c0 12 8 18 16 18s16-6 16-18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      chart: '<svg width="76" height="76" viewBox="0 0 76 76" fill="none"><rect x="11" y="8" width="54" height="60" rx="8" stroke="currentColor" stroke-width="1.5"/><path d="M29 50V25M39 50V18M49 50V34" stroke="#D49A00" stroke-width="2" stroke-linecap="round"/></svg>',
      dashboard: '<div class="dashboard-preview-icon"><svg width="62" height="62" viewBox="0 0 62 62" fill="none"><path d="M14 15h34v15H14V15zM14 33h15v14H14V33zM32 33h16v14H32V33z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg></div>'
    };

    return icons[type] || icons.dashboard;
  }
};
document.addEventListener('DOMContentLoaded', () => ProjectsController.init());
