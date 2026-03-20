import { ReactNode, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import Toolbar from './Toolbar';

interface EditorProps {
  documentId: string;
  token: string;
}

export default function Editor({ documentId, token }: EditorProps): ReactNode {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  // Provider must be created in useEffect (not useState) because React Strict Mode
  // unmounts and remounts components. A provider created in useState would be destroyed
  // on the first unmount but reused (in a broken state) on remount.
  useEffect(() => {
    // Create Yjs document and Hocuspocus provider
    const ydoc = new Y.Doc();
    const p = new HocuspocusProvider({
      url: 'ws://localhost:3000/collaboration',
      name: documentId,
      document: ydoc,
      token,
    });
    setProvider(p);

    // Clean up provider on unmount
    return () => {
      p.destroy();
    };
  }, [documentId, token]);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Collaboration extension handles history (undo/redo),
        // so disable StarterKit's built-in history to avoid conflicts
        undoRedo: false,
      }),
      ...(provider ? [Collaboration.configure({
        document: provider.document,
      })] : []),
    ],
    editable: !!provider,
  }, [provider]);

  if (!provider || !editor) {
    return (
      <div className='flex items-center justify-center p-8'>
        <p className='text-gray-500'>Connecting...</p>
      </div>
    );
  }

  return (
    <div className='rounded border bg-white shadow'>
      <Toolbar editor={editor} />
      <div className='p-4'>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
