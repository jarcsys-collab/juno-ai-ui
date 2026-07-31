// Controller: applies and toggles the persisted light/dark theme
window.ThemeController = {
  key: 'juno-theme',

  getSavedTheme() {
    return localStorage.getItem(this.key) || 'light';
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.key, theme);
    this.updateSettingsButton(theme);
  },

  toggle() {
    const currentTheme = this.getSavedTheme();
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.apply(nextTheme);
  },

  updateSettingsButton(theme) {
    const button = document.getElementById('theme-toggle');
    const label = document.getElementById('theme-toggle-label');

    if (!button || !label) return;

    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    button.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );

    label.textContent = theme === 'dark' ? 'Settings: Dark mode' : 'Settings: Light mode';
  },

  wireToggle() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    button.addEventListener('click', () => {
      this.toggle();
    });

    this.updateSettingsButton(this.getSavedTheme());
  },

  init() {
    this.apply(this.getSavedTheme());

    document.addEventListener('DOMContentLoaded', () => {
      this.wireToggle();
    });
  }
};

window.ThemeController.init();
