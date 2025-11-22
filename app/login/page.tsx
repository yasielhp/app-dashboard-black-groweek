'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('dashboard_token', data.token);
      localStorage.setItem('dashboard_expires', data.expiresAt.toString());

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1D1D1C' }}>
      <div className="w-full max-w-md">
        <div className="rounded-lg shadow-xl p-8" style={{ backgroundColor: '#2C2B2B' }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Black Groweek</h1>
            <p className="text-gray-400 mt-2">Dashboard de Ventas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{
                  backgroundColor: '#1D1D1C',
                  borderColor: '#3a3a39',
                  '--tw-ring-color': '#F9512C'
                } as React.CSSProperties}
                placeholder="Ingresa la contraseña"
                required
              />
            </div>

            {error && (
              <div className="border px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: '#F9512C' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#e0451f')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#F9512C')}
            >
              {loading ? 'Verificando...' : 'Acceder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
