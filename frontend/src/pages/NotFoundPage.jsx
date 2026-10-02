import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';

export function NotFoundPage() {
  return (
    <main className="portal-page flex items-center justify-center px-4 sm:px-6">
      <section className="portal-card portal-card--padded w-full max-w-lg text-center">
        <p className="portal-kicker">{text.app.eyebrow}</p>
        <h1 className="portal-title mt-3">{text.notFound.title}</h1>
        <p className="portal-copy mt-2 text-sm">{text.notFound.description}</p>
        <AppLink className="portal-button mt-6" href="/">
          {text.notFound.backHome}
        </AppLink>
      </section>
    </main>
  );
}
