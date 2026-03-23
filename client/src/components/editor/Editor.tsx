import { ReactNode, useEffect, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import CollaborativeEditor from './CollaborativeEditor';

interface EditorProps {
  documentId: string;
  token: string;
  userName: string;
}

export default function Editor({ documentId, token, userName }: EditorProps): ReactNode {
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
  
  if (!provider) {
    return (
      <div className='flex items-center justify-center p-8'>
        <p className='text-gray-500'>Connecting...</p>
      </div>
    );
  }

  return <CollaborativeEditor provider={provider} userName={userName} />;
}
