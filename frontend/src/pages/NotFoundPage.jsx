import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';
import { Icon } from '../components/Icon.jsx';

export function NotFoundPage() {
  return (
    <main className="portal-page flex items-center justify-center px-4 sm:px-6">
      <section className="portal-card portal-card--padded empty-page w-full max-w-lg">
        <span className="icon-chip"><Icon name="search" size={28} /></span>
        <h1 className="portal-title">{text.notFound.title}</h1>
        <p className="portal-copy mt-2">{text.notFound.description}</p>
        <AppLink className="portal-button mt-6" href="/">
          {text.notFound.backHome}
        </AppLink>
      </section>
    </main>
  );
}
