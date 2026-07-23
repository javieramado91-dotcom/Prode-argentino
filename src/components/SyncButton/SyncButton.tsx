'use client';

import React, { useState } from 'react';

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setLoading(true);
    setMessage('Sincronizando con ESPN...');
    
    try {
      const res = await fetch('/api/sync-matches?force=1', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error desconocido');
      }
      if (data.skipped) {
        throw new Error(data.detail || 'No se pudo escribir (¿falta la service_role key?)');
      }

      setMessage(`¡Éxito! ${data.count} partidos sincronizados.`);
      
      // Recargar la página para ver los cambios si hubiera una lista de partidos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Sincronización Automática</h3>
      <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
        Trae la fecha vigente de la Liga Profesional desde ESPN (gratis, temporada actual y con resultados en vivo).
      </p>
      <button 
        onClick={handleSync} 
        disabled={loading}
        className="btn-primary" 
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Sincronizando...' : '🔄 Sincronizar Partidos Ahora'}
      </button>
      
      {message && (
        <p style={{ marginTop: '1rem', color: message.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {message}
        </p>
      )}
    </div>
  );
}
