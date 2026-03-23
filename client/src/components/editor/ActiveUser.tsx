import { ReactNode, useEffect, useState } from "react";
import { HocuspocusProvider } from '@hocuspocus/provider';

interface AwarenessUser {
  name: string;
  color: string;
}

interface ActiveUsersProps {
  provider: HocuspocusProvider;
}

export default function ActiveUsers({ provider }: ActiveUsersProps): ReactNode {
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const updateUsers = (): void => {
      const states = awareness.getStates();
      const active: AwarenessUser[] = [];

      states.forEach((state: Record<string, unknown>, clientId: number) => {
        // Skip our own cursor and empty states
        if (clientId === awareness.clientID) return;
        if (state.user) {
          active.push(state.user as AwarenessUser);
        }
      });

      setUsers((prev) => {
        // Only update if the user list actually changed
        if (prev.length === active.length &&
            prev.every((u, i) => u.name === active[i].name)) {
          return prev
        }
        return active;
      });
    };

    awareness.on('update', updateUsers);
    updateUsers(); // Initial state

    return () => {
      awareness.off('update', updateUsers);
    };
  }, [provider]);

  if (users.length === 0) return null;

  return (
    <div className='flex items-center gap-2'>
      {users.map((user) => (
        <div
          key={user.name}
          className='flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white'
          style={{ backgroundColor: user.color }}
        >
          {user.name}
        </div>
      ))}
    </div>
  );
}
