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
    <main className="min-h-screen flex flex-row-reverse">

      {/* RIGHT — hero image panel */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/login-bg.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay — keeps text legible over the artwork */}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(6, 18, 46, 0.62)' }} />

        {/* Top — empty (logo removed) */}
        <div className="relative" />

        {/* Middle — quote */}
        <div className="relative">
          <div className="w-10 h-[3px] bg-white/50 mb-6 rounded-full" />
          <blockquote className="text-white text-2xl font-light leading-relaxed mb-6 drop-shadow">
            "Gerenciamento inteligente do rebanho, do campo à tomada de decisão."
          </blockquote>
          <p className="text-white/70 text-sm drop-shadow">
            Fazenda Santo Antônio da Barra — Mato Grosso
          </p>
        </div>

        {/* Bottom — stats */}
        <div className="relative grid grid-cols-3 gap-6 border-t border-white/20 pt-8">
          {[
            { label: 'Animais', value: 'Rebanho' },
            { label: 'Proprietários', value: 'Sócios' },
            { label: 'Controle', value: 'Completo' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white/50 text-xs mb-1">{s.label}</p>
              <p className="text-white text-sm font-semibold drop-shadow">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LEFT — login form */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F4EF] p-6">
        <div className="w-full max-w-md">

          {/* Mobile header */}
          <div className="md:hidden mb-10 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A8A2] mb-1">Fazenda</p>
            <p className="text-[#111110] text-lg font-bold">Santo Antônio da Barra</p>
          </div>

          {/* Wordmark (desktop, above card) */}
          <div className="hidden md:block mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A8A2] mb-1">Fazenda</p>
            <p className="text-[#111110] text-xl font-bold leading-snug">Santo Antônio<br />da Barra</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E8E3] shadow-sm p-8">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-[#111110] mb-1">
                Bem-vindo de volta
              </h1>
              <p className="text-sm text-[#6B6B65]">
                Acesse o sistema com suas credenciais
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#111110] mb-1.5">
                  E-mail
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-3 py-2.5 text-sm text-[#111110] placeholder:text-[#A8A8A2] focus:outline-none focus:ring-1 focus:ring-[#2F6A47] focus:border-[#2F6A47] transition-all"
                />
                {errors.email && (
                  <p className="text-xs text-[#9B3A2A] mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111110] mb-1.5">
                  Senha
                </label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-3 py-2.5 text-sm text-[#111110] placeholder:text-[#A8A8A2] focus:outline-none focus:ring-1 focus:ring-[#2F6A47] focus:border-[#2F6A47] transition-all"
                />
                {errors.password && (
                  <p className="text-xs text-[#9B3A2A] mt-1">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-[#FBF0EE] border border-[#F0D0C8] rounded-lg px-4 py-3">
                  <p className="text-xs text-[#9B3A2A]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2F6A47] hover:bg-[#255840] text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="text-[11px] text-[#A8A8A2] text-center mt-6">
              Acesso restrito aos sócios da fazenda
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
