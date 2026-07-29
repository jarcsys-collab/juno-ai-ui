// Controller: Projects view — project cards, search filter, dismissible banner
window.ProjectsController = {
  init() {
    this.renderProjects(ProjectsModel);
    this.wireSearch();
    this.wireBanner();
  },

  renderProjects(list) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    grid.innerHTML = list.map(p => `
      <button class="project-card" type="button">
        <div class="project-title">${p.title}</div>
        <div class="project-desc">${p.desc}</div>
        <div class="project-date">${p.updated}</div>
      </button>`).join('');
  },

  wireSearch() {
    const input = document.getElementById('project-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      this.renderProjects(ProjectsModel.filter(p => p.title.toLowerCase().includes(q)));
    });
  },

  wireBanner() {
    const banner = document.getElementById('projects-banner');
    const closeBtn = document.getElementById('banner-close');
    if (banner && closeBtn) {
      closeBtn.addEventListener('click', () => { banner.style.display = 'none'; });
    }
  }
};
document.addEventListener('DOMContentLoaded', () => ProjectsController.init());
