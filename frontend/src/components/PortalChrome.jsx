import { useEffect, useState } from 'react';
import { AppLink } from './AppLink.jsx';
import { Icon } from './Icon.jsx';
import { ServiceStatus } from './ServiceStatus.jsx';
import { text } from '../i18n/en.js';

const publicLinks = [
  { href: '/', label: text.portal.report },
  { href: '/track', label: text.track.homeLink },
  { href: '/dashboard', label: text.dashboard.homeLink },
  { href: '/login', label: text.auth.staffLogin }
];

function isActive(path, href) {
  if (href === '/') return path === '/';
  if (href === '/officer') return path.startsWith('/officer');
  if (href === '/verifier') return path.startsWith('/verifier');
  return path === href;
}

function navigationLinks(path) {
  const isOfficer = path.startsWith('/officer');
  if (!isOfficer && !path.startsWith('/verifier')) return publicLinks;
  return [
    { href: isOfficer ? '/officer' : '/verifier', label: isOfficer ? text.officer.title : text.verifier.queueTitle },
    { href: '/dashboard', label: text.dashboard.title },
    { href: '/', label: text.portal.publicPortal }
  ];
}

function breadcrumbTrail(path) {
  if (path === '/') return [];
  if (path === '/track') return [{ label: text.track.homeLink }];
  if (path === '/dashboard') return [{ label: text.dashboard.homeLink }];
  if (path === '/login') return [{ label: text.auth.staffLogin }];
  const isOfficer = path.startsWith('/officer');
  if (!isOfficer && !path.startsWith('/verifier')) return [{ label: text.notFound.title }];
  const home = { href: isOfficer ? '/officer' : '/verifier', label: isOfficer ? text.officer.title : text.verifier.queueTitle };
  const isList = path === home.href;
  return isList ? [{ label: home.label }] : [home, { label: text.portal.ticketPage }];
}

function PortalNavigation({ path }) {
  const [open, setOpen] = useState(false);
  const links = navigationLinks(path);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <nav aria-label={text.portal.navigation} className="portal-nav">
      <button
        aria-controls="portal-nav-list"
        aria-expanded={open}
        className="portal-nav__toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Icon name={open ? 'close' : 'menu'} />
        {open ? text.portal.closeMenu : text.portal.menu}
      </button>
      <ul className="portal-nav__list" data-open={open} id="portal-nav-list">
        {links.map((link) => (
          <li key={link.href}>
            <AppLink
              aria-current={isActive(path, link.href) ? 'page' : undefined}
              className="portal-nav__link"
              href={link.href}
            >
              {link.label}
            </AppLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Breadcrumb({ path }) {
  const trail = breadcrumbTrail(path);
  if (trail.length === 0) return null;

  return (
    <nav aria-label={text.portal.breadcrumb} className="portal-breadcrumb">
      <ol>
        <li><AppLink href="/">{text.portal.home}</AppLink></li>
        {trail.map((item, index) => (
          <li aria-current={index === trail.length - 1 ? 'page' : undefined} key={item.label}>
            {item.href ? <AppLink href={item.href}>{item.label}</AppLink> : item.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function PortalFooter() {
  return (
    <footer className="portal-footer">
      <div className="portal-footer__grid">
        <section>
          <h2>{text.portal.footerAboutTitle}</h2>
          <p>{text.portal.footerAboutText}</p>
        </section>
        <nav aria-label={text.portal.footerServicesTitle}>
          <h2>{text.portal.footerServicesTitle}</h2>
          <ul>
            <li><AppLink href="/">{text.portal.report}</AppLink></li>
            <li><AppLink href="/track">{text.track.homeLink}</AppLink></li>
            <li><AppLink href="/dashboard">{text.dashboard.homeLink}</AppLink></li>
          </ul>
        </nav>
        <nav aria-label={text.portal.footerStaffTitle}>
          <h2>{text.portal.footerStaffTitle}</h2>
          <ul>
            <li><AppLink href="/login">{text.auth.staffLogin}</AppLink></li>
          </ul>
        </nav>
        <section>
          <h2>{text.portal.footerContactTitle}</h2>
          <p>{text.portal.footerContactText}</p>
        </section>
      </div>
      <div className="portal-footer__note">
        <p>{text.portal.organisation} · {text.portal.footerNote}</p>
        <ServiceStatus />
      </div>
    </footer>
  );
}

export function PortalChrome({ children, path }) {
  return (
    <div className="portal-root">
      <div className="portal-utility">
        <div className="portal-utility__inner">
          <a className="skip-link" href="#main-content">{text.portal.skipToContent}</a>
          <p role="note">{text.portal.pilotBanner}</p>
          <p className="portal-utility__help"><Icon name="phone" size={16} />{text.portal.helpline}</p>
        </div>
      </div>
      <header className="portal-header">
        <div className="portal-header__inner">
          <AppLink aria-label={`${text.app.title} home`} className="portal-brand" href="/">
            <span aria-hidden="true" className="portal-brand__crest">
              <svg fill="none" height="26" viewBox="0 0 24 24" width="26">
                <path d="M12 3 4 7v2h16V7zM6 11v6M10 11v6M14 11v6M18 11v6M4 19h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </span>
            <span>
              <span className="portal-brand__org">{text.portal.organisation}</span>
              <span className="portal-brand__name">{text.app.title}</span>
            </span>
          </AppLink>
          <PortalNavigation path={path} />
        </div>
      </header>
      <Breadcrumb path={path} />
      <div className="portal-content" id="main-content" tabIndex="-1">
        {children}
      </div>
      <PortalFooter />
    </div>
  );
}
