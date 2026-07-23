'use client';

import React, { useState } from 'react';
import { login, signup } from './actions';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    // ojo abierto
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    // ojo tachado
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9M6.6 6.6C3.8 8.6 2 12 2 12s3.5 6.5 10 6.5c1.4 0 2.7-.3 3.8-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export default function LoginForm({ initialMode }: { initialMode: 'login' | 'register' }) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Recuperación de contraseña
  const [forgot, setForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetEmail.trim()) { setResetError('Ingresá tu email.'); return; }
    setResetLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    });
    setResetLoading(false);
    if (error) setResetError(error.message);
    else setResetSent(true);
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setLocalError(null);
    // refleja el modo en la URL sin recargar
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', m === 'register' ? '/login?mode=register' : '/login');
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setLocalError(null);
    if (!isRegister) return;
    const fd = new FormData(e.currentTarget);
    const pw = (fd.get('password') as string) || '';
    const pw2 = (fd.get('confirm') as string) || '';
    if (pw.length < 6) {
      e.preventDefault();
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pw !== pw2) {
      e.preventDefault();
      setLocalError('Las contraseñas no coinciden.');
    }
  };

  // --- Vista: recuperar contraseña ---
  if (forgot) {
    return (
      <div className={styles.modeSwap}>
        <p className={styles.subtitle}>
          Te enviamos un enlace por email para crear una contraseña nueva.
        </p>
        {resetSent ? (
          <>
            <div className={styles.infoBox}>
              Listo. Revisá tu correo (y la carpeta de spam) y abrí el enlace desde este mismo celular.
            </div>
            <button type="button" className={styles.btnLogin} style={{ width: '100%' }}
              onClick={() => { setForgot(false); setResetSent(false); }}>
              Volver
            </button>
          </>
        ) : (
          <form className={styles.form} onSubmit={sendReset}>
            {resetError && <div className={styles.errorBox}>{resetError}</div>}
            <div className={styles.inputGroup}>
              <label htmlFor="resetEmail">Tu email</label>
              <input id="resetEmail" type="email" placeholder="tu@email.com" required
                value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.btnLogin} disabled={resetLoading}>
                {resetLoading ? 'Enviando…' : 'Enviarme el enlace'}
              </button>
            </div>
          </form>
        )}
        <p className={styles.modeHint}>
          <button type="button" className={styles.linkBtn} onClick={() => { setForgot(false); setResetSent(false); setResetError(null); }}>
            ← Volver al inicio de sesión
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Selector deslizante: Iniciar sesión | Crear cuenta */}
      <div className={styles.modeTabs} role="tablist" aria-label="Modo de acceso">
        <div
          className={styles.modeIndicator}
          style={{ transform: isRegister ? 'translateX(100%)' : 'translateX(0)' }}
        />
        <button
          type="button" role="tab" aria-selected={!isRegister}
          className={`${styles.modeTab} ${!isRegister ? styles.modeTabActive : ''}`}
          onClick={() => switchMode('login')}
        >
          Iniciar sesión
        </button>
        <button
          type="button" role="tab" aria-selected={isRegister}
          className={`${styles.modeTab} ${isRegister ? styles.modeTabActive : ''}`}
          onClick={() => switchMode('register')}
        >
          Crear cuenta
        </button>
      </div>

      {/* El key fuerza la animación de entrada al cambiar de modo */}
      <div key={mode} className={styles.modeSwap}>
        <p className={styles.subtitle}>
          {isRegister
            ? 'Sumate al Prode: creá tu cuenta en un minuto.'
            : 'Qué bueno verte de nuevo. Entrá y pronosticá.'}
        </p>

        {localError && <div className={styles.errorBox}>{localError}</div>}

        <form className={styles.form} action={isRegister ? signup : login} onSubmit={onSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="tu@email.com" required autoComplete="email" />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <div className={styles.pwWrap}>
              <input
                id="password" name="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••" required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {isRegister && (
            <div className={styles.inputGroup}>
              <label htmlFor="confirm">Repetir contraseña</label>
              <div className={styles.pwWrap}>
                <input
                  id="confirm" name="confirm"
                  type={showPw2 ? 'text' : 'password'}
                  placeholder="••••••••" required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPw2(!showPw2)}
                  aria-label={showPw2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon open={showPw2} />
                </button>
              </div>
            </div>
          )}

          {!isRegister && (
            <div style={{ textAlign: 'right', marginTop: '-0.4rem' }}>
              <button type="button" className={styles.linkBtn} style={{ fontSize: '0.82rem', fontWeight: 600 }}
                onClick={() => { setForgot(true); setResetError(null); }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <div className={styles.actions}>
            <button type="submit" className={`${styles.btnLogin} ${isRegister ? styles.btnRegister : ''}`}>
              {isRegister ? 'Crear mi cuenta' : 'Entrar'}
            </button>
          </div>
        </form>

        <p className={styles.modeHint}>
          {isRegister ? (
            <>¿Ya tenés cuenta?{' '}
              <button type="button" className={styles.linkBtn} onClick={() => switchMode('login')}>Iniciá sesión</button>
            </>
          ) : (
            <>¿Primera vez?{' '}
              <button type="button" className={styles.linkBtn} onClick={() => switchMode('register')}>Creá tu cuenta</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
