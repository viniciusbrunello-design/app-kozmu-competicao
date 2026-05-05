import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import styles from './Register.module.css';

const PROFILE_TYPES = [
  { value: 'creator', label: '🎬 Creator', desc: 'Instagram, TikTok, YouTube' },
  { value: 'social_media', label: '📱 Social Media', desc: 'Gerencio conteúdo de clientes' },
  { value: 'specialist', label: '🎯 Especialista', desc: 'Infoprodutor ou consultor' },
  { value: 'agency', label: '🏢 Agência', desc: 'Equipe de criação' },
];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    displayName: '',
    profileType: 'creator',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({
        email: form.email,
        username: form.username.toLowerCase().replace(/\s/g, '_'),
        password: form.password,
        displayName: form.displayName,
        profileType: form.profileType,
        platforms: [],
      });
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoText}>KOZMU</span>
        </div>

        <div className={styles.steps}>
          <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`} />
          <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`} />
        </div>

        {step === 1 && (
          <>
            <h1 className={styles.title}>Criar conta</h1>
            <p className={styles.subtitle}>Comece a construir sua consistência hoje.</p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Nome de exibição</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.displayName}
                  onChange={(e) => update('displayName', e.target.value)}
                  placeholder="João Silva"
                  required
                  minLength={2}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Username</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="joaosilva"
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input
                  className={styles.input}
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Senha</label>
                <div className={styles.passwordWrapper}>
                  <input
                    className={styles.input}
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" fullWidth>
                Continuar
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={styles.title}>Seu perfil</h1>
            <p className={styles.subtitle}>Como você se define?</p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.profileGrid}>
                {PROFILE_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    className={`${styles.profileCard} ${form.profileType === pt.value ? styles.selected : ''}`}
                    onClick={() => update('profileType', pt.value)}
                  >
                    <span className={styles.profileEmoji}>{pt.label.split(' ')[0]}</span>
                    <span className={styles.profileName}>{pt.label.split(' ').slice(1).join(' ')}</span>
                    <span className={styles.profileDesc}>{pt.desc}</span>
                  </button>
                ))}
              </div>

              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta e entrar'}
              </Button>

              <Button type="button" variant="ghost" fullWidth onClick={() => setStep(1)}>
                Voltar
              </Button>
            </form>
          </>
        )}

        <p className={styles.footer}>
          Já tem conta?{' '}
          <Link to="/login" className={styles.link}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
