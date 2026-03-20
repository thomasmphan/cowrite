import { useState, useEffect, ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '../components/editor/Editor';
import { getAccessToken } from '../api/client';
import * as documentsApi from '../api/documents';

export default function EditorPage(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const token = getAccessToken();

  useEffect(() => {
    if (!id) return;

    documentsApi
      .getDocument(id)
      .then((doc) => setTitle(doc.title))
      .catch(() => setError('Failed to load document'));
  }, [id]);

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-100'>
        <div className='text-center'>
          <p className='mb-4 text-red-600'>{error}</p>
          <Link to='/' className='text-blue-600 hover:underline'>
            Back to documents
          </Link>
        </div>
      </div>
    );
  }

  if (!id || !token) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-100'>
        <p className='text-gray-500'>Loading...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      <header className='flex items-center justify-between bg-white px-6 py-4 shadow'>
        <div className='flex items-center gap-4'>
          <Link to='/' className='text-gray-500 hover:text-gray-700'>
            &larr; Back
          </Link>
          <h1 className='text-xl font-bold text-gray-900'>{title}</h1>
        </div>
      </header>

      <main className='mx-auto max-w-3x1 p-6'>
        <Editor documentId={id} token={token} />
      </main>
    </div>
  );
}
