import { ReactNode } from "react";
import { Editor, useEditorState } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor;
}

export default function Toolbar({ editor }: ToolbarProps): ReactNode {
  const activeState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
    }),
  });

  function btn(label: string, shortcut: string, isActive: boolean, onClick: () => void): ReactNode {
    return (
      <button
        type='button'
        onClick={onClick}
        title={`${shortcut}`}
        className={`rounded px-2 py-1 text-sm ${
          isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className='flex flex-wrap gap-1 border-b px-4 py-2'>
      {btn('Bold', 'Ctrl+B', activeState.bold, () =>
        editor.chain().focus().toggleBold().run(),
      )}
      {btn('Italic', 'Ctrl+I', activeState.italic, () =>
        editor.chain().focus().toggleItalic().run(),
      )}
      {btn('Strike', 'Ctrl+Shift+S', activeState.strike, () =>
        editor.chain().focus().toggleStrike().run(),
      )}
      {btn('H1', 'Ctrl+Alt+1', activeState.h1, () =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
      )}
      {btn('H2', 'Ctrl+Alt+2', activeState.h2, () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {btn('H3', 'Ctrl+Alt+3', activeState.h3, () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      {btn('Bullet List', 'Ctrl+Shift+8', activeState.bulletList, () =>
        editor.chain().focus().toggleBulletList().run(),
      )}
      {btn('Ordered List', 'Ctrl+Shift+7', activeState.orderedList, () =>
        editor.chain().focus().toggleOrderedList().run(),
      )}
      {btn('Blockquote', 'Ctrl+Shift+B', activeState.blockquote, () =>
        editor.chain().focus().toggleBlockquote().run(),
      )}
    </div>
  );
}