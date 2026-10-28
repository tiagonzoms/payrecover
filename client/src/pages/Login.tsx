import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { Link } from "wouter";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const [, setLocation] = useLocation();

const loginMutation = trpc.auth.login.useMutation();
const registerMutation = trpc.auth.register.useMutation();

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError("");

  try {
    if (isRegister) {
      await registerMutation.mutateAsync({
        name,
        email,
        password,
      });
    } else {
      await loginMutation.mutateAsync({
        email,
        password,
      });
    }

    setLocation("/");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Não foi possível autenticar. Tenta novamente."
    );
  }
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-blue-700 p-10 md:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2">
              <ShieldCheck size={28} />
            </div>
            <span className="text-2xl font-bold">PayRecover</span>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-200">
              Recuperação inteligente
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Recupera pagamentos. Protege as tuas receitas.
            </h1>
            <p className="mt-5 leading-7 text-blue-100">
              Centraliza pagamentos falhados e acompanha as tuas campanhas de
              recuperação num só lugar.
            </p>
          </div>

          <p className="text-sm text-blue-200">
            PayRecover · Recuperação de pagamentos
          </p>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="text-blue-400" />
              PayRecover
            </div>
          </div>

          <h2 className="text-3xl font-bold">
            {isRegister ? "Criar conta" : "Bem-vindo de volta"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isRegister
              ? "Cria a tua conta para começares."
              : "Inicia sessão para acederes ao teu painel."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {isRegister && (
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium">
                  Nome
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="O teu nome"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500"
            >
              {isRegister ? "Criar conta" : "Iniciar sessão"}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isRegister ? "Já tens uma conta?" : "Ainda não tens uma conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="font-semibold text-blue-400 hover:text-blue-300"
            >
              {isRegister ? "Iniciar sessão" : "Criar conta"}
            </button>
          </p>

          <div className="mt-8 border-t border-slate-800 pt-5 text-center">
            <Link href="/" className="text-sm text-slate-400 hover:text-white">
              Voltar à página inicial
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}