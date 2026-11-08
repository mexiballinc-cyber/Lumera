import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';

// On small screens, replace the fixed rail and full navigation with one drawer.
const style = document.createElement('style');
style.textContent = `
  .mobile-menu-trigger{display:none;align-items:center;justify-content:center;width:44px;height:44px;border:1px solid rgba(255,255,255,.14);border-radius:13px;background:rgba(20,20,20,.78);color:#fff;font-size:23px;cursor:pointer}
  .mobile-menu-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.62);backdrop-filter:blur(5px);opacity:0;visibility:hidden;transition:opacity .2s,visibility .2s}
  .mobile-menu-backdrop.is-open{opacity:1;visibility:visible}
  .mobile-menu-drawer{position:absolute;top:12px;left:12px;bottom:12px;width:min(330px,calc(100vw - 24px));padding:20px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:rgba(15,15,16,.97);box-shadow:0 24px 80px rgba(0,0,0,.55);transform:translateX(-110%);transition:transform .23s;overflow:auto}
  .mobile-menu-backdrop.is-open .mobile-menu-drawer{transform:translateX(0)}
  .mobile-menu-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;color:#f5f2ea;font-weight:750;letter-spacing:.08em}
  .mobile-menu-close{width:38px;height:38px;border:1px solid #444;border-radius:11px;background:#202020;color:#fff;font-size:20px;cursor:pointer}
  .mobile-menu-items{display:grid;gap:8px}
  .mobile-menu-item{display:flex;align-items:center;gap:12px;min-height:48px;padding:12px 14px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:#191919;color:#f5f2ea;text-decoration:none;font:600 15px inherit;text-align:left;cursor:pointer}
  .mobile-menu-item:hover,.mobile-menu-item:focus-visible{border-color:var(--accent-color);background:#222}
  .mobile-menu-divider{height:1px;margin:6px 0;background:rgba(255,255,255,.12)}
  @media(max-width:680px){.main-header{display:flex;justify-content:flex-start;gap:12px;padding:10px 16px}.mobile-menu-trigger{display:inline-flex;flex:none}.main-header .wordmark{margin-right:auto}.main-header .wordmark img{max-width:112px}.main-header .top-nav,.home-page .side-rail,.main-header .header-actions{display:none!important}.home-page .home-main{margin-left:0}.hero{margin:8px 12px 0;min-height:66vh}.catalog-area{padding:10px 16px 55px}}
  @media(min-width:681px){.mobile-menu-backdrop{display:none}}
`;
document.head.appendChild(style);

const header = document.querySelector('.main-header');
const desktopNav = document.querySelector('.top-nav');
if (header && desktopNav) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'mobile-menu-trigger';
  trigger.setAttribute('aria-label', 'Abrir menú de navegación');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  header.insertBefore(trigger, header.firstChild);

  const backdrop = document.createElement('div');
  backdrop.className = 'mobile-menu-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  const drawer = document.createElement('nav');
  drawer.className = 'mobile-menu-drawer';
  drawer.setAttribute('aria-label', 'Menú principal');
  drawer.innerHTML = '<div class="mobile-menu-heading"><span>LUMERA</span><button class="mobile-menu-close" type="button" aria-label="Cerrar menú">×</button></div><div class="mobile-menu-items" id="mobileMenuItems"></div>';
  backdrop.appendChild(drawer);
  document.body.appendChild(backdrop);
  const items = drawer.querySelector('#mobileMenuItems');

  const closeMenu = () => {
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
  };
  const openMenu = () => {
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
  };
  trigger.addEventListener('click', openMenu);
  drawer.querySelector('.mobile-menu-close').addEventListener('click', closeMenu);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeMenu(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  const addAction = (label, action, icon) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-menu-item';
    button.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
    button.addEventListener('click', () => { closeMenu(); action(); });
    items.appendChild(button);
  };
  const addFilter = (filter, label, icon) => addAction(label, () => {
    document.querySelector(`.top-nav [data-filter="${filter}"]`)?.click();
  }, icon);

  addFilter('all', 'Inicio', '⌂');
  addFilter('movie', 'Películas', '▣');
  addFilter('series', 'Series', '▶');
  addFilter('kids', 'Kids', '☺');
  const sparks = document.createElement('a');
  sparks.className = 'mobile-menu-item'; sparks.href = 'spark.html'; sparks.innerHTML = '<span aria-hidden="true">✦</span><span>Sparks</span>';
  sparks.addEventListener('click', closeMenu); items.appendChild(sparks);

  const divider = document.createElement('div'); divider.className = 'mobile-menu-divider'; items.appendChild(divider);
  addAction('Buscar', () => document.getElementById('searchOpen')?.click(), '⌕');
  addAction('Configuración', () => document.getElementById('settingsOpen')?.click(), '⚙');
  let adminButton;
  addAction('Panel de administración', () => { location.href = 'admin.html'; }, '✎');
  adminButton = items.lastElementChild;
  adminButton.hidden = true;
  addAction('Cuenta / perfiles', () => { location.href = 'auth.html'; }, '◉');

  onAuthStateChanged(auth, (user) => {
    const ownerKey = 'lumera_profile_owner';
    const activeProfileKey = 'lumera_active_profile';
    const priorOwner = localStorage.getItem(ownerKey);
    if (!user) {
      localStorage.removeItem(ownerKey);
      localStorage.removeItem(activeProfileKey);
      adminButton.hidden = true;
      return;
    }
    if (priorOwner !== user.uid) {
      // A stale Kids profile from another account can make the whole catalog look empty.
      localStorage.removeItem(activeProfileKey);
      localStorage.setItem(ownerKey, user.uid);
    }
    adminButton.hidden = user.email?.toLowerCase() !== 'jgonzalezgutierrez1@bcedu.mx';
  });
}
