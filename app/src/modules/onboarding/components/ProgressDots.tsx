interface ProgressDotsProps {
  currentStep: number;
  totalSteps?: number;
}

export function ProgressDots({ currentStep, totalSteps = 4 }: ProgressDotsProps) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <span
            key={step}
            className={`
              h-2 rounded-full transition-all duration-300
              ${isActive ? 'w-6 bg-purple-800' : 'w-2'}
              ${isCompleted ? 'bg-green-600' : ''}
              ${!isActive && !isCompleted ? 'bg-gray-200' : ''}
            `}
          />
        );
      })}
    </div>
  );
}
