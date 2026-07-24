'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { LogoMark } from '@/components/Logo/Logo';
import styles from '../login/page.module.css';

export default function ResetPage() {
  // Cliente dedicado con auto-canje DESACTIVADO: así el código del enlace se
  // canjea una sola vez (el auto-canje + un canje manual hacía que el segundo
  // fallara como "vencido/ya usado").
  const supabase = useMemo(
    () =>
      createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { detectSessionInUrl: false, flowType: 'pkce' },
      }),
    []
  );
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errDesc = params.get('error_description');
      const hash = window.location.hash || '';
      const hasHashToken = hash.includes('access_token') || hash.includes('type=recovery');

      if (errDesc) {
        setFatal(decodeURIComponent(errDesc));
        return;
      }

      // IMPORTANTE: nunca damos por buena la sesión que ya pudiera estar activa
      // en este navegador (p. ej. la del admin). Si lo hiciéramos, "Guardar
      // contraseña" le cambiaría la clave a la cuenta logueada, no a la del
      // enlace. Por eso validamos SOLO el enlace: al canjear el código, la
      // sesión activa se REEMPLAZA por la del usuario dueño del enlace.

      // Flujo normal (PKCE): el enlace del email trae ?code=...
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) {
          setFatal(
            'No se pudo validar el enlace. Suele pasar si ya venció, o si se abre en un navegador diferente al que pediste el cambio. Pedí uno nuevo y abrilo en el mismo navegador.'
          );
        } else {
          setReady(true);
        }
        return;
      }

      // Flujo alternativo por hash (#access_token / #type=recovery)
      if (hasHashToken) {
        setReady(true);
        return;
      }

      setFatal('Abrí esta página desde el enlace que te llegó por email, en el mismo navegador.');
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
    if (error) { setSaving(false); setError(error.message); return; }

    // Cerramos la sesión de recuperación para que el usuario entre "limpio"
    // con su cuenta y su nueva clave. Además evita dejar logueada una cuenta
    // de prueba en el navegador del admin.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setSaving(false);
    setDone(true);
    setTimeout(
      () =>
        router.push(
          '/login?info=' +
            encodeURIComponent('Contraseña actualizada. Iniciá sesión con tu nueva clave.')
        ),
      1500
    );
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
          <div className={styles.infoBox}>¡Contraseña actualizada! Te llevamos al inicio de sesión…</div>
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
