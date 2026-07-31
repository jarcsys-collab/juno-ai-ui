// Controller: simple frontend-only login guard for the Juno demo interface
window.AuthController = {
  key: 'juno-authenticated',
  userKey: 'juno-username',

  isLoggedIn() {
    return localStorage.getItem(this.key) === 'true';
  },

  getUsername() {
    return localStorage.getItem(this.userKey) || 'medtek';
  },

  login(username) {
    localStorage.setItem(this.key, 'true');
    localStorage.setItem(this.userKey, username);
  },

  logout() {
    localStorage.removeItem(this.key);
    localStorage.removeItem(this.userKey);
    window.location.href = '../Login/index.html';
  },

  protect() {
    if (!this.isLoggedIn()) {
      window.location.href = '../Login/index.html';
    }
  }
};

window.AuthController.protect();
