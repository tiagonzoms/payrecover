import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingUp, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const companiesQuery = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PR</span>
              </div>
              <span className="font-bold text-lg text-slate-900">PayRecover</span>
            </div>
            <Button asChild>
              <a href={getLoginUrl()}>Se connecter</a>
            </Button>
          </div>
        </nav>

        <section className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">Récupérez les paiements échoués automatiquement</h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              PayRecover utilise l'intelligence artificielle et les rappels intelligents pour récupérer jusqu'à 30% des paiements échoués. Réduisez le churn involontaire et augmentez votre MRR.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700">
                <a href={getLoginUrl()}>Commencer gratuitement</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-slate-900"
                onClick={() => {
                  const demoSection = document.getElementById("demo-section");
                  if (demoSection) {
                    demoSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                Ver a démo
              </Button>
            </div>
          </div>
        </section>

        <section id="demo-section" className="py-20 px-4 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16 text-slate-900">Veja PayRecover em ação</h2>
            <Card className="border-2 border-blue-200">
              <CardContent className="pt-8">
                <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">▶️</div>
                    <p className="text-slate-600 font-semibold">Vídeo de demonstração</p>
                    <p className="text-slate-500 text-sm mt-2">Como PayRecover recupera paiements automaticamente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16 text-slate-900">Pourquoi choisir PayRecover ?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Augmentez votre MRR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Récupérez en moyenne 25-30% des paiements échoués grâce à nos séquences d'e-mails optimisées.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Automatisation complète</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Détection automatique des paiements échoués et rappels intelligents sans intervention manuelle.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>ROI immédiat</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Payez-vous en quelques jours. Chaque paiement récupéré génère un ROI positif instantané.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Prêt à récupérer vos paiements ?</h2>
            <p className="text-xl text-blue-100 mb-8">Connectez votre compte Stripe en moins de 2 minutes et commencez à récupérer des revenus perdus.</p>
            <Button size="lg" asChild className="bg-white text-blue-600 hover:bg-slate-100">
              <a href={getLoginUrl()}>Commencer maintenant</a>
            </Button>
          </div>
        </section>

        <footer className="bg-slate-900 text-slate-400 py-8 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <p>&copy; 2026 PayRecover. Tous droits réservés.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
              <p className="text-slate-600 mt-1">Bienvenue, {user?.name}</p>
            </div>
            <Button asChild>
              <a href="/companies/new">Ajouter une entreprise</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {companiesQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : companiesQuery.data && companiesQuery.data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune entreprise configurée</h3>
              <p className="text-slate-600 mb-6">Commencez par ajouter votre première entreprise et connecter votre compte Stripe.</p>
              <Button asChild>
                <a href="/companies/new">
                  Ajouter une entreprise
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Entreprises</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{companiesQuery.data?.length || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Paiements récupérés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0 €</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Taux de récupération</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Paiements en attente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vos entreprises</CardTitle>
                <CardDescription>Gérez vos entreprises et leurs campagnes de récupération</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companiesQuery.data?.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">{company.name}</h3>
                        <p className="text-sm text-slate-600">{company.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            company.stripeConnected ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {company.stripeConnected ? "Connecté" : "Non connecté"}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
