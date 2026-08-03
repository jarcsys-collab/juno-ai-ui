// Controller: handles the login screen
window.LoginController = {
  validUsername: 'medtek',
  validPassword: '123',

  init() {
    if (localStorage.getItem('juno-authenticated') === 'true') {
      window.location.href = '../Home/index.html';
      return;
    }

    const form = document.getElementById('login-form');
    const username = document.getElementById('login-username');
    const password = document.getElementById('login-password');
    const eye = document.getElementById('login-eye');
    const error = document.getElementById('login-error');
    const forgotPassword = document.querySelector('.login-link');
    const signup = document.querySelector('.login-signup a');

    if (!form || !username || !password || !error) return;

    if (eye) {
      eye.addEventListener('click', () => {
        const isHidden = password.type === 'password';
        password.type = isHidden ? 'text' : 'password';
        eye.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      });
    }

    if (forgotPassword) {
      forgotPassword.addEventListener('click', () => {
        error.textContent = 'Password recovery is not connected yet. Please contact your workspace administrator.';
        error.style.display = 'block';
      });
    }

    if (signup) {
      signup.addEventListener('click', (event) => {
        event.preventDefault();
        error.textContent = 'Sign up is not connected yet. Please contact your workspace administrator.';
        error.style.display = 'block';
      });
    }

    document.querySelectorAll('[data-provider]').forEach(button => {
      button.addEventListener('click', () => {
        const provider = button.dataset.provider;
        localStorage.setItem('juno-authenticated', 'true');
        localStorage.setItem('juno-username', `${provider} user`);
        localStorage.setItem('juno-login-provider', provider);
        window.location.href = '../Home/index.html';
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const usernameValue = username.value.trim();
      const passwordValue = password.value.trim();

      if (usernameValue === this.validUsername && passwordValue === this.validPassword) {
        localStorage.setItem('juno-authenticated', 'true');
        localStorage.setItem('juno-username', usernameValue);
        window.location.href = '../Home/index.html';
        return;
      }

      error.textContent = 'Incorrect username or password.';
      error.style.display = 'block';
      password.value = '';
      password.focus();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => LoginController.init());
