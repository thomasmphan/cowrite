import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DocumentListPage from './pages/DocumentListPage';

function AppContent(): ReactNode {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-100'>
        <p className='text-gray-500'>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <DocumentListPage />;
}

export default function App(): ReactNode {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
