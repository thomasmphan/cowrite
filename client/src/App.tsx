import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';

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

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-100'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold text-gray-900'>Welcome, {user.displayName}</h1>
        <p className='mt-2 text-gray-600'>{user.email}</p>
      </div>
    </div>
  );
}

export default function App(): ReactNode {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
