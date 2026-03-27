import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, DollarSign, Users, ArrowRight, Settings, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { data: companies } = trpc.company.list.useQuery();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Carregando...</h1>
        </div>
      </div>
    );
  }

  const totalCompanies = companies?.length || 0;
  const totalRecovered = companies?.reduce((sum: number, c: any) => sum + (c.totalRecovered || 0), 0) || 0;
  const avgRecoveryRate = companies?.length ? Math.round((totalRecovered / (companies.length * 1000)) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">PayRecover</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="text-white font-semibold">Notificações</h3>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-white">Novo paiement recuperado!</p>
                      <p className="text-xs text-slate-400 mt-1">Há 5 minutos</p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-white">Campanha completada com sucesso</p>
                      <p className="text-xs text-slate-400 mt-1">Há 1 hora</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <button onClick={() => logout()} className="p-2 text-slate-400 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo, {user.name?.split(" ")[0]}!</h2>
          <p className="text-slate-400">Recupere paiements échoués automaticamente e aumente sua receita</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalCompanies}</div>
              <p className="text-xs text-slate-400 mt-1">Conectadas</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Recuperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalRecovered.toLocaleString()}€</div>
              <p className="text-xs text-slate-400 mt-1">Este mês</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Taxa Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{avgRecoveryRate}%</div>
              <p className="text-xs text-slate-400 mt-1">Recuperação</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 hover:border-blue-500/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <Badge>PRO</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">14 dias</div>
              <p className="text-xs text-blue-300 mt-1">Teste grátis</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Minhas Empresas</h3>
            <Button onClick={() => setLocation("/companies/new")} className="bg-blue-600 hover:bg-blue-700 text-white">
              + Nova Empresa
            </Button>
          </div>

          {companies && companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((company: any) => (
                <Card
                  key={company.id}
                  className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all cursor-pointer group"
                  onClick={() => setLocation(`/companies/${company.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white group-hover:text-blue-400 transition-colors">{company.name}</CardTitle>
                        <CardDescription className="text-slate-400">{company.email}</CardDescription>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Paiements Recuperados</p>
                        <p className="text-lg font-semibold text-white">{(company.totalRecovered || 0).toLocaleString()}€</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Taxa</p>
                        <p className="text-lg font-semibold text-white">28%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700 border-dashed">
              <CardContent className="pt-8 pb-8 text-center">
                <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Nenhuma empresa conectada</p>
                <Button onClick={() => setLocation("/companies/new")} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Conectar Primeira Empresa
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer group">
            <CardHeader>
              <CardTitle className="text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">Gerencie suas preferências e integrações</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer group">
            <CardHeader>
              <CardTitle className="text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">Veja relatórios detalhados de performance</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer group">
            <CardHeader>
              <CardTitle className="text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">Configure alertas e notificações</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
