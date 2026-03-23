import { ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from './collaboration-cursor';
import ActiveUsers from './ActiveUsers';
import Toolbar from './Toolbar';
import { ConnectionStatus } from './Editor';

const CURSOR_COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#fbbf24', // amber
  '#34d399', // emerald
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
];

function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

interface CollaborativeEditorProps {
  provider: HocuspocusProvider;
  userName: string;
  connectionStatus: ConnectionStatus;
  hasConnected: boolean;
}

// Separated from Editor.tsx so that useEditor always receives all collaboration
// extensions from the first render. If they were in the same component, useEditor
// would reconfigure mid-lifecycle when provider changes from null to a value,
// causing ProseMirror plugin state mismatches.
export default function CollaborativeEditor({ provider, userName, connectionStatus, hasConnected }: CollaborativeEditorProps): ReactNode {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Collaboration extension handles history (undo/redo),
        // so disable StarterKit's built-in history to avoid conflicts
        undoRedo: false,
      }),
      Collaboration.configure({
        document: provider.document,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: userName,
          color: getUserColor(userName),
        },
      }),
    ],
  });

  if (!editor) {
    return (
      <div className='flex items-center justify-center p-8'>
        <p className='text-gray-500'>Loading editor...</p>
      </div>
    );
  }

  return (
      <div className='rounded border bg-white shadow'>
        <div className='flex items-center justify-between border-b px-4 py-2'>
          <Toolbar editor={editor} />
          <ActiveUsers provider={provider} />
        </div>
        {hasConnected && connectionStatus !== 'connected' && (
          <div className={`px-4 py-2 text-sm font-medium ${
            connectionStatus === 'connecting'
              ? 'bg-yellow-50 text-yellow-800'
              : 'bg-red-50 text-red-800'
          }`}>
            {connectionStatus === 'connecting'
              ? 'Reconnecting...'
              : 'Disconnected - changes will sync when connection is restored'}
          </div>
        )}
        <div className='p-4'>
          <EditorContent editor={editor} />
        </div>
      </div>
    );
}
