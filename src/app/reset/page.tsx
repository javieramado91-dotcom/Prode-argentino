'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogoMark } from '@/components/Logo/Logo';
import styles from '../login/page.module.css';

export default function ResetPage() {
  const supabase = createClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Al llegar desde el enlace del email, canjeamos el código por una sesión
  // de recuperación para poder cambiar la contraseña.
  useEffect(() => {
    let active = true;
    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) setFatal('El enlace venció o ya se usó. Pedí uno nuevo desde “Olvidé mi contraseña”.');
        else setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) setReady(true);
      else setFatal('Abrí esta página desde el enlace que te llegó por email.');
    };
    run();
    return () => { active = false; };
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pw !== pw2) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 1500);
  };

  return (
    <main className={styles.container}>
      <div className={styles.glassCard}>
        <LogoMark size={56} style={{ color: 'var(--color-accent)', display: 'block', margin: '0 auto 0.9rem' }} />
        <h1 className={styles.title}>Nueva contraseña</h1>

        {fatal ? (
          <>
            <div className={styles.errorBox}>{fatal}</div>
            <button className={styles.btnLogin} style={{ width: '100%' }} onClick={() => router.push('/login')}>
              Volver al inicio
            </button>
          </>
        ) : done ? (
          <div className={styles.infoBox}>¡Contraseña actualizada! Entrando…</div>
        ) : !ready ? (
          <p className={styles.subtitle}>Validando el enlace…</p>
        ) : (
          <>
            <p className={styles.subtitle}>Elegí una contraseña nueva para tu cuenta.</p>
            {error && <div className={styles.errorBox}>{error}</div>}
            <form className={styles.form} onSubmit={onSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="pw">Nueva contraseña</label>
                <div className={styles.pwWrap}>
                  <input id="pw" type={showPw ? 'text' : 'password'} value={pw}
                    onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? 'Ocultar' : 'Mostrar'}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="pw2">Repetir contraseña</label>
                <input id="pw2" type={showPw ? 'text' : 'password'} value={pw2}
                  onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" required />
              </div>
              <div className={styles.actions}>
                <button type="submit" className={styles.btnLogin} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
