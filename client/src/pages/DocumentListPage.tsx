import { useState, useEffect, ReactNode, SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as documentsApi from '../api/documents';

interface Document {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentListPage(): ReactNode {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    documentsApi
      .listDocuments()
      .then((docs) => {
        setDocuments(docs);
        setError('');
      })
      .catch(() => setError('Failed to load documents'));
  }, []);

  async function handleCreate(e: SyntheticEvent): Promise<void> {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle.trim()) return;

    try {
      const newDoc = await documentsApi.createDocument(trimmedTitle);
      setDocuments((currDocs) => [newDoc, ...currDocs]);
      setNewTitle('');
    } catch {
      setError('Failed to create document');
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await documentsApi.deleteDocument(id);
      setDocuments((currDocs) => currDocs.filter((d) => d.id !== id));
    } catch {
      setError('Failed to delete document');
    }
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      <header className='flex items-center justify-between bg-white px-6 py-4 shadow'>
        <h1 className='text-xl font-bold text-gray-900'>CoWrite</h1>
        <div className='flex items-center gap-4'>
          <span className='text-sm text-gray-600'>{user?.displayName}</span>
          <button
            onClick={logout}
            className='rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300'
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className='mx-auto max-w-2x1 p-6'>
        {error && <p className='mb-4 text-sm text-red-600'>{error}</p>}

        <form onSubmit={handleCreate} className='mb-6 flex gap-2'>
          <input
            type='text'
            placeholder='New document title...'
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className='flex-1 rounded border px-3 py-2'
            maxLength={100}
          />
          <button
            type='submit'
            className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
          >
            Create
          </button>
        </form>

        {documents.length === 0 ? (
          <p className='text-center text-gray-500'>No documents yet. Create one above.</p>
        ) : (
          <ul className='space-y-2'>
            {documents.map((doc) => (
              <li
                key={doc.id}
                className='flex items-center justify-between rounded bg-white px-4 py-3 shadow'
              >
                <div className='min-w-0 flex-1'>
                  <Link to={`/documents/${doc.id}`} className='truncate font-medium text-gray-900 hover:text-blue-600' >
                    {doc.title}
                  </Link>
                  <p className='text-xs text-gray-500'>
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className='flex gap-2'>
                  {doc.ownerId === user?.id && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className='rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50'
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
