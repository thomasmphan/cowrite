/**
 * Custom collaboration cursor extension for TipTap.
 *
 * We build this ourselves instead of using @tiptap/extension-collaboration-cursor
 * because that package (v3.0.0) is deprecated and imports ySyncPluginKey from
 * y-prosemirror, while our Collaboration extension uses @tiptap/y-tiptap.
 * Mismatched plugin keys cause a crash. This extension imports from @tiptap/y-tiptap
 * so the keys match.
 *
 * Known issue: under sustained rapid concurrent editing, the awareness <-> transaction
 * feedback loop can cause browser freezes. Throttling (50ms) mitigates but doesn't
 * fully eliminate this under extreme stress.
 */

import { Extension } from '@tiptap/core';
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from '@tiptap/y-tiptap';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet, Decoration } from '@tiptap/pm/view';
import * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';

interface CollaborationCursorUser {
  name: string;
  color: string;
}

interface CollaborationCursorOptions {
  provider: HocuspocusProvider;
  user: CollaborationCursorUser;
}

const collaborationCursorPluginKey = new PluginKey('collaborationCursor');

const CollaborationCursor = Extension.create<CollaborationCursorOptions>({
  name: 'collaborationCursor',

  addOptions() {
    return {
      provider: null as unknown as HocuspocusProvider,
      user: { name: 'Anonymous', color: '#f87171' },
    };
  },

  addProseMirrorPlugins() {
    const { awareness } = this.options.provider;

    if (!awareness) {
      return [];
    }

    // Broadcast our user info to other clients
    awareness.setLocalStateField('user', this.options.user);

    return [
      new Plugin({
        key: collaborationCursorPluginKey,

        state: {
          init() {
            return DecorationSet.empty;
          },

          apply(tr, decorationSet, _oldState, newState) {
            // Only recompute when awareness changes (flagged via metadata)
            // or when the document changes (positions may have shifted)
            const awarenessUpdate = tr.getMeta(collaborationCursorPluginKey);
            if (!awarenessUpdate && !tr.docChanged) {
              return decorationSet.map(tr.mapping, tr.doc);
            }

            const ystate = ySyncPluginKey.getState(newState);
            if (!ystate) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            awareness.getStates().forEach((state: Record<string, unknown>, clientId: number) => {
              if (clientId === awareness.clientID) return;

              const user = state.user as CollaborationCursorUser | undefined;
              const cursor = state.cursor as { anchor: unknown; head: unknown } | undefined;
              if (!user || !cursor) return;

              const anchor = relativePositionToAbsolutePosition(
                ystate.doc,
                ystate.type,
                Y.createRelativePositionFromJSON(cursor.anchor),
                ystate.binding.mapping,
              );
              const head = relativePositionToAbsolutePosition(
                ystate.doc,
                ystate.type,
                Y.createRelativePositionFromJSON(cursor.head),
                ystate.binding.mapping,
              );

              if (anchor == null || head == null) return;

              // Selection highlight (when the remote user has selected text)
              const from = Math.min(anchor, head);
              const to = Math.max(anchor, head);
              if (from !== to) {
                decorations.push(
                  Decoration.inline(from, to, {
                    style: `background-color: ${user.color}33`, // 33 == 20% opacity hex
                  }),
                );
              }

              // Cursor caret (widget decoration at the head position)
              decorations.push(
                Decoration.widget(
                  head,
                  () => {
                    const caret = document.createElement('span');
                    caret.classList.add('collaboration-cursor__caret');
                    caret.setAttribute('style', `border-color: ${user.color}`);

                    const label = document.createElement('div');
                    label.classList.add('collaboration-cursor__label');
                    label.setAttribute('style', `background-color: ${user.color}`);
                    label.textContent = user.name;

                    caret.appendChild(label);
                    return caret;
                  },
                  { side: 1 },
                ),
              );
            });

            return DecorationSet.create(newState.doc, decorations);
          },
        },

        props: {
          decorations(state) {
            return collaborationCursorPluginKey.getState(state);
          },
        },

        view(view) {
          let hasFocus = view.hasFocus();
          let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

          const scheduleAwarenessUpdate = (): void => {
            // Throttle: at most one decoration rebuild per animation frame
            if (throttleTimeout) return;
            throttleTimeout = setTimeout(() => {
              throttleTimeout = null;

              // Listen for awareness changes and notify the plugin via metadata
              if (view.dom.isConnected) {
                const tr = view.state.tr.setMeta(collaborationCursorPluginKey, { updated: true });
                view.dispatch(tr);
              }
            }, 50);
          };

          // Broadcast our cursor position when our selection changes
          const broadcastCursor = (): void => {
            const ystate = ySyncPluginKey.getState(view.state);
            if (!ystate) return;

            const { selection } = view.state;
            const anchor = absolutePositionToRelativePosition(
              selection.anchor,
              ystate.type,
              ystate.binding.mapping,
            );
            const head = absolutePositionToRelativePosition(
              selection.head,
              ystate.type,
              ystate.binding.mapping,
            );
            awareness.setLocalStateField('cursor', { anchor, head });
          };

          const clearCursor = (): void => {
            awareness.setLocalStateField('cursor', null);
          };

          const onWindowBlur = (): void => clearCursor();
          const onWindowFocus = (): void => {
            if (view.hasFocus()) broadcastCursor();
          };

          awareness.on('update', scheduleAwarenessUpdate);
          window.addEventListener('blur', onWindowBlur);
          window.addEventListener('focus', onWindowFocus);

          return {
            update(updatedView, prevState) {
              const currentFocus = updatedView.hasFocus();

              // Focus changed: broadcast or clear cursor
              if (currentFocus !== hasFocus) {
                hasFocus = currentFocus;
                if (currentFocus) {
                  broadcastCursor();
                } else {
                  clearCursor();
                }
              }

              // Selection changed while focused: broadcast new position
              if (currentFocus && !updatedView.state.selection.eq(prevState.selection)) {
                broadcastCursor();
              }
            },
            destroy() {
              if (throttleTimeout) clearTimeout(throttleTimeout);
              awareness.off('update', scheduleAwarenessUpdate);
              awareness.setLocalStateField('cursor', null);
              window.removeEventListener('blur', onWindowBlur);
              window.removeEventListener('focus', onWindowFocus);
              clearCursor();
            },
          };
        },
      }),
    ];
  },
});

export default CollaborationCursor;
