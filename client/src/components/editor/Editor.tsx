import { ReactNode } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Toolbar from './Toolbar';

interface EditorProps {
  content: JSONContent;
  onUpdate: (content: JSONContent) => void;
}

export default function Editor({ content, onUpdate }: EditorProps): ReactNode {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor: e }) => {
      onUpdate(e.getJSON());
    },
  });

  if (!editor) {
    return null;
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
