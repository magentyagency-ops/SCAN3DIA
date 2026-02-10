import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-lg px-6 animate-fade-in-up">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-8 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-3">
          MenuFlow
        </h1>
        <p className="text-lg text-text-secondary mb-12 leading-relaxed">
          L&apos;expérience restaurant réinventée.<br />
          Scannez, choisissez, commandez.
        </p>

        {/* Quick links */}
        <div className="space-y-3">
          <Link
            href="/r/le-jardin/t/T1"
            className="block w-full py-4 px-6 rounded-2xl bg-accent text-white font-semibold text-lg 
                       hover:bg-accent-hover transition-all duration-200 shadow-lg shadow-accent/20
                       active:scale-[0.98]"
          >
            🍽️ Voir le Menu — Table 1
          </Link>

          <Link
            href="/kitchen"
            className="block w-full py-4 px-6 rounded-2xl bg-surface text-text-primary font-medium text-lg
                       border border-border hover:bg-surface-hover transition-all duration-200
                       active:scale-[0.98]"
          >
            👨‍🍳 Kitchen Screen
          </Link>

          <Link
            href="/admin"
            className="block w-full py-4 px-6 rounded-2xl bg-surface text-text-primary font-medium text-lg
                       border border-border hover:bg-surface-hover transition-all duration-200
                       active:scale-[0.98]"
          >
            ⚙️ Back Office
          </Link>
        </div>

        <p className="text-sm text-text-tertiary mt-12">
          Demo mode — Le Jardin Restaurant
        </p>
      </div>
    </div>
  );
}
