import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 mb-6 shadow-lg shadow-brand-500/30">
          <span className="text-3xl">🐄</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
          Fazenda Santo Antônio da Barra
        </h1>
        <p className="text-lg text-slate-400 mb-10">
          Sistema de gestão de bovinos
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-white font-semibold text-sm">Cadastro completo</div>
            <div className="text-slate-400 text-xs mt-1">Online e via planilha</div>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-white font-semibold text-sm">Classificação automática</div>
            <div className="text-slate-400 text-xs mt-1">Regras configuráveis</div>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-white font-semibold text-sm">Relatórios em tempo real</div>
            <div className="text-slate-400 text-xs mt-1">Por proprietário</div>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center justify-center px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition shadow-lg shadow-brand-500/30"
        >
          Entrar no Sistema →
        </Link>

        <div className="mt-12 text-slate-500 text-xs">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            Sistema online
          </span>
        </div>
      </div>
    </main>
  );
}
