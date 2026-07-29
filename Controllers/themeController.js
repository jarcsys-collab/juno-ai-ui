// Controller: applies persisted light/dark theme (shared across all pages via localStorage)
window.ThemeController = {
  key: 'juno-theme',
  init() {
    const saved = localStorage.getItem(this.key) || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }
};
window.ThemeController.init();
