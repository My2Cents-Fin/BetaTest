import { AuthProvider } from './providers/AuthProvider';
import { BudgetProvider } from './providers/BudgetProvider';
import { AppRouter } from './Router';

export function App() {
  return (
    <AuthProvider>
      <BudgetProvider>
        <AppRouter />
      </BudgetProvider>
    </AuthProvider>
  );
}
