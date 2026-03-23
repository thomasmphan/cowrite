import { ReactNode, useEffect, useState, useRef } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import CollaborativeEditor from './CollaborativeEditor';

interface EditorProps {
  documentId: string;
  token: string;
  userName: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export default function Editor({ documentId, token, userName }: EditorProps): ReactNode {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const hasConnected = useRef(false);

  // Provider must be created in useEffect (not useState) because React Strict Mode
  // unmounts and remounts components. A provider created in useState would be destroyed
  // on the first unmount but reused (in a broken state) on remount.
  useEffect(() => {
    try {
      // Create Yjs document and Hocuspocus provider
      const ydoc = new Y.Doc();
      const p = new HocuspocusProvider({
        url: 'ws://localhost:3000/collaboration',
        name: documentId,
        document: ydoc,
        token,
      });
      setProvider(p);

      // Listen to provider status changes for reconnection UI
      const onStatus = ({ status }: { status: string }): void => {
        if (status === 'connected') {
          hasConnected.current = true;
        }
        setStatus(status as ConnectionStatus);
      };
      p.on('status', onStatus);

      // Clean up provider on unmount
      return () => {
        p.off('status', onStatus);
        p.destroy();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to document');
    }
  }, [documentId, token]);
  
  if (error) {
    return (
      <div className='flex items-center justify-center p-8'>
        <p className='text-red-600'>Unable to connect to document. Please try again later.</p>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  return <CollaborativeEditor provider={provider} userName={userName} connectionStatus={status} hasConnected={hasConnected.current} />;
}
