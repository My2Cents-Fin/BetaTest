import { AuthProvider } from './providers/AuthProvider';
import { HouseholdProvider } from './providers/HouseholdProvider';
import { BudgetProvider } from './providers/BudgetProvider';
import { AppRouter } from './Router';
import { NoiseOverlay } from '../shared/components/NoiseOverlay';

export function App() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <BudgetProvider>
          <NoiseOverlay />
          <AppRouter />
        </BudgetProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}
