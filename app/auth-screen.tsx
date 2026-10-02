'use client';

import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/client';
import { ErrorBox } from '@/components/forms';
import { isValidPhone, normalizePhone, phoneAccountEmail } from '@/lib/identity';

export default function AuthScreen({ register = false, team = false }: { register?: boolean; team?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const identifier = String(fields.identifier || '').trim();
    const password = String(fields.password || '');
    const name = String(fields.name || '').trim();
    const isEmail = identifier.includes('@');

    try {
      if (team && !isEmail) throw new Error('A equipe deve entrar com o e-mail autorizado.');
      if (!isEmail && !isValidPhone(identifier)) throw new Error('Informe um celular válido com DDD.');

      if (isEmail) {
        await api(`/api/auth/${register ? 'sign-up/email' : 'sign-in/email'}`, {
          email: identifier.toLowerCase(),
          password,
          ...(register ? { name } : {}),
        });
      } else {
        const phone = normalizePhone(identifier);
        await api(`/api/auth/${register ? 'sign-up/email' : 'sign-in/username'}`, register ? {
          name,
          email: phoneAccountEmail(phone),
          username: phone,
          password,
        } : { username: phone, password });
      }

      const me = await api('/api/me');
      if (team && me.user?.role === 'customer') {
        if (!me.initialized) {
          location.href = '/configurar';
          return;
        }
        setError('Esta conta não tem acesso à equipe. Peça ao administrador para liberar seu e-mail.');
        return;
      }
      const back = new URLSearchParams(location.search).get('voltar');
      const safeBack = back === '/finalizar' || back === '/configurar' || back?.startsWith('/convite-equipe?token=') ? back : '/';
      location.href = team ? '/operacao' : safeBack;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Confira seus dados.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-layout">
    <section className="auth-story">
      <a href="/" className="brand auth-brand"><img className="brand-logo brand-logo-dark" src="/logo-galeteria-rc.png" alt="Galeteria RC" /></a>
      <div><span className="eyebrow">{team ? 'NOSSA EQUIPE' : 'SABOR QUE APROXIMA'}</span><h1>{team ? 'Tudo pronto para um bom atendimento.' : 'Seu galeto favorito, a poucos passos.'}</h1><p>{team ? 'Acompanhe os pedidos e cuide de cada detalhe da operação.' : 'Monte seu pedido, acompanhe o preparo e aproveite.'}</p></div>
      <small>Galeteria RC</small>
    </section>
    <section className="auth-form">
      <a className="back-link" href="/"><ArrowLeft size={16} /> Voltar ao cardápio</a>
      <div>
        <span className="eyebrow">{team ? 'ACESSO RESTRITO À EQUIPE' : 'BEM-VINDO À MESA'}</span>
        <h2>{register ? 'Crie sua conta' : team ? 'Entrar na operação' : 'Bom ter você aqui.'}</h2>
        <p className="muted">{register ? 'Use seu e-mail ou celular para fazer e acompanhar pedidos.' : team ? 'Entre com seu e-mail e senha.' : 'Entre com seu e-mail ou celular e senha para continuar.'}</p>
        <form onSubmit={submit} className="form-stack">
          {register && <label className="field">Nome<input name="name" required autoComplete="name" maxLength={100} /></label>}
          <label className="field">{team ? 'E-mail' : 'E-mail ou celular'}
            <input name="identifier" type={team ? 'email' : 'text'} required autoComplete="username" maxLength={254} placeholder={team ? 'voce@exemplo.com' : 'voce@exemplo.com ou (85) 99999-9999'} />
          </label>
          <label className="field">Senha<input name="password" type="password" required minLength={register ? 8 : 1} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} />{register && <small>Use pelo menos 8 caracteres.</small>}</label>
          <ErrorBox message={error} />
          <button className="primary full" disabled={busy}>{busy ? 'Aguarde…' : register ? 'Criar minha conta' : 'Entrar'}</button>
        </form>
        {!team && <p className="auth-switch">{register ? 'Já tem uma conta?' : 'Ainda não tem conta?'} <a href={(register ? '/entrar' : '/cadastro') + (typeof window !== 'undefined' ? window.location.search : '')}>{register ? 'Entrar' : 'Cadastre-se'}</a></p>}
        {!register && !team && <p className="small-note"><a href="/recuperar-senha">Esqueci minha senha</a> <span className="muted">(contas com e-mail)</span></p>}
        {team && <a className="small-note" href="/configurar"><ShieldCheck size={14} /> Primeiro acesso do administrador</a>}
      </div>
    </section>
  </main>;
}
