import { useState, ReactNode, SyntheticEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage(): ReactNode {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: SyntheticEvent): Promise<void> {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-100'>
      <form onSubmit={handleSubmit} className='w-full max-w-sm rounded bg-white p-8 shadow'>
        <h1 className='mb-6 text-2x1 font-bold text-gray-900'>
          {isRegister ? 'Create Account' : 'Sign In'}
        </h1>

        {error && <p className='mb-4 text-sm text-red-600'>{error}</p>}

        {isRegister && (
          <input
            type='text'
            placeholder='Display name'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className='mb-4 w-full rounded border px-3 py-2'
            required
          />
        )}

        <input
          type='email'
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='mb-4 w-full rounded border px-3 py-2'
          required
        />

        <input
          type='password'
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='mb-4 w-full rounded border px-3 py-2'
          required
        />

        <button
          type='submit'
          className='w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700'
        >
          {isRegister ? 'Register' : 'Sign In'}
        </button>

        <p className='mt-4 text-center text-sm text-gray-600'>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type='button'
            onClick={() => setIsRegister(!isRegister)}
            className='text-blue-600 hover:underline'
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>
      </form>
    </div>
  );
}
