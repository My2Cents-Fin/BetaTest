import { AuthProvider } from './providers/AuthProvider';
import { BudgetProvider } from './providers/BudgetProvider';
import { AppRouter } from './Router';
import { NoiseOverlay } from '../shared/components/NoiseOverlay';

export function App() {
  return (
    <AuthProvider>
      <BudgetProvider>
        <NoiseOverlay />
        <AppRouter />
      </BudgetProvider>
    </AuthProvider>
  );
}
