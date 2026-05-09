'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('E-mail ou senha incorretos.');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left decorative panel (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-[#0f172a] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shrink-0">
            🐄
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Fazenda SAB</p>
            <p className="text-slate-500 text-xs">Gestão de Bovinos</p>
          </div>
        </div>

        {/* Quote */}
        <div className="relative">
          <div className="w-10 h-[3px] bg-indigo-500 mb-6 rounded-full" />
          <blockquote className="text-white text-2xl font-light leading-relaxed mb-6">
            "Gerenciamento inteligente do rebanho, do campo à tomada de decisão."
          </blockquote>
          <p className="text-slate-400 text-sm">
            Fazenda Santo Antônio da Barra — Mato Grosso do Sul
          </p>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-3 gap-6 border-t border-slate-800 pt-8">
          {[
            { label: 'Animais', value: 'Rebanho' },
            { label: 'Proprietários', value: 'Sócios' },
            { label: 'Controle', value: 'Completo' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-slate-400 text-xs mb-1">{s.label}</p>
              <p className="text-white text-sm font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shrink-0">
              🐄
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-sm">Fazenda SAB</p>
              <p className="text-slate-500 text-xs">Gestão de Bovinos</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                Bem-vindo de volta
              </h1>
              <p className="text-sm text-slate-500">
                Acesse o sistema com suas credenciais
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Senha
                </label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 text-center mt-6">
              Acesso restrito aos sócios da fazenda
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
