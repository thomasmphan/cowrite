import { useState, useEffect, useRef, ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { JSONContent } from "@tiptap/react";
import Editor from "../components/editor/Editor";
import * as documentsApi from '../api/documents';

const DEBOUNCE_MS = 1500;

export default function EditorPage(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<JSONContent | null>(null);

  useEffect(() => {
    if (!id) return;

    documentsApi.
      getDocument(id)
      .then((doc) => {
        setTitle(doc.title);
        setContent(doc.content as JSONContent);
      })
      .catch(() => setError('Failed to load document'));
  }, [id]);

  function handleUpdate(newContent: JSONContent): void {
    if (!id) return;

    pendingContentRef.current = newContent;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      pendingContentRef.current = null;
      setSaving(true);
      try {
        await documentsApi.updateDocument(id, { content: newContent });
      } catch {
        setError('Failed to save');
      } finally {
        setSaving(false);
      }
    }, DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (pendingContentRef.current && id) {
        documentsApi.updateDocument(id, { content: pendingContentRef.current });
      }
    };
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

  if (content === null) {
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
        <span className='text-sm text-gray-400'>
          {saving ? 'Saving...' : 'Saved'}
        </span>
      </header>

      <main className='mx-auto max-w-3x1 p-6'>
        <Editor content={content} onUpdate={handleUpdate} />
      </main>
    </div>
  );
}