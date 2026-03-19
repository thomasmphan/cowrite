import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DocumentListPage from './pages/DocumentListPage';
import EditorPage from './pages/EditorPage';

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
    <Routes>
      <Route path='/' element={<DocumentListPage />} />
      <Route path='/documents/:id' element={<EditorPage />} />
      <Route path='/*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

export default function App(): ReactNode {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
