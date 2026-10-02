import { AppLink } from './AppLink.jsx';
import { text } from '../i18n/en.js';

function isActive(path, href) {
  if (href === '/') return path === '/';
  if (href === '/officer') return path.startsWith('/officer');
  if (href === '/verifier') return path.startsWith('/verifier');
  return path === href;
}

function PortalNavigation({ path }) {
  const staffRoute = path.startsWith('/officer') || path.startsWith('/verifier');
  const links = staffRoute
    ? [
        { href: path.startsWith('/officer') ? '/officer' : '/verifier', label: path.startsWith('/officer') ? text.officer.title : text.verifier.queueTitle },
        { href: '/dashboard', label: text.dashboard.title },
        { href: '/', label: text.portal.publicPortal }
      ]
    : [
        { href: '/', label: text.portal.report },
        { href: '/track', label: text.track.homeLink },
        { href: '/dashboard', label: text.dashboard.homeLink },
        { href: '/login', label: text.auth.staffLogin }
      ];

  return (
    <nav aria-label={text.portal.navigation} className="portal-nav">
      {links.map((link) => (
        <AppLink
          aria-current={isActive(path, link.href) ? 'page' : undefined}
          className="portal-nav__link"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </AppLink>
      ))}
    </nav>
  );
}

export function PortalChrome({ children, path }) {
  return (
    <div className="portal-root">
      <a className="skip-link" href="#main-content">{text.portal.skipToContent}</a>
      <header className="portal-header">
        <div className="portal-header__inner">
          <AppLink aria-label={`${text.app.title} home`} className="portal-brand" href="/">
            <span aria-hidden="true" className="portal-brand__mark">
              <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path d="M4 5.5h6.5V12H4zM13.5 5.5H20V12h-6.5zM4 14h6.5v4.5H4zM13.5 14H20v4.5h-6.5z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </span>
            <span>
              <span className="portal-brand__name">{text.app.title}</span>
              <span className="portal-brand__descriptor">{text.app.eyebrow}</span>
            </span>
          </AppLink>
          <PortalNavigation path={path} />
          <span className="portal-header__tag">{text.portal.prototypeTag}</span>
        </div>
      </header>
      <div className="portal-content" id="main-content" tabIndex="-1">
        {children}
      </div>
      <footer className="portal-footer">
        <p>{text.app.title} · {text.portal.footerNote}</p>
      </footer>
    </div>
  );
}
