interface WelcomeCardProps {
  userName: string;
  onDismiss: () => void;
}

export function WelcomeCard({ userName, onDismiss }: WelcomeCardProps) {
  return (
    <div className="bg-gradient-to-br from-purple-800 to-purple-900 rounded-2xl p-6 text-white relative">
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-4">
        <span className="text-4xl">👋</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">
            Welcome, {userName}!
          </h2>
          <p className="text-white/80 text-sm mb-4">
            Let's set up your monthly budget. Start by adding your income sources, then adjust the expense targets we've added for you.
          </p>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tap any amount to edit it</span>
          </div>
        </div>
      </div>
    </div>
  );
}
