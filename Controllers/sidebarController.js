// Controller: renders sidebar recents + wires the profile menu (shared by every view)
window.SidebarController = {
  init() {
    const recentsWrap = document.getElementById('sidebar-recents');
    if (recentsWrap) {
      recentsWrap.innerHTML = SidebarModel.recents.map(r => `
        <div class="sidebar-recent-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex:none;opacity:.85"><path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          <span>${r.title}</span>
        </div>`).join('');
    }
    const flatWrap = document.getElementById('sidebar-recent-chats');
    if (flatWrap) {
      flatWrap.innerHTML = SidebarModel.recentChats.map(t => `<div class="sidebar-flat-item">${t}</div>`).join('');
    }
    const emailEls = document.querySelectorAll('.profile-email, .profile-menu-email');
    emailEls.forEach(el => el.textContent = SidebarModel.profileEmail);

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
  }
};
document.addEventListener('DOMContentLoaded', () => SidebarController.init());
