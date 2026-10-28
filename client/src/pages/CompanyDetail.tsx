import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, Plus, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function CompanyDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, navigate] = useLocation();
  const numCompanyId = parseInt(companyId || "0");

  const companyQuery = trpc.companies.getById.useQuery({ companyId: numCompanyId });
  const metricsQuery = trpc.analytics.getMetrics.useQuery({ companyId: numCompanyId });
  const campaignsQuery = trpc.campaigns.list.useQuery({ companyId: numCompanyId });
  const failedPaymentsQuery = trpc.failedPayments.list.useQuery({ companyId: numCompanyId });

  if (companyQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!companyQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Entreprise non trouvée</h2>
            <Button asChild variant="outline" className="mt-4">
              <a href="/">Retour au tableau de bord</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = companyQuery.data;
  const metrics = metricsQuery.data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
              <p className="text-slate-600">{company.email}</p>
            </div>
            <Button asChild variant="outline">
              <a href={`/companies/${company.id}/settings`}>
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Paiements échoués</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.totalFailedPayments || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Montant récupéré</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.totalRecoveredAmount || "0"} €</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Taux de récupération</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.recoveryRate || "0"}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Temps moyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.averageRecoveryTime || 0}h</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
            <TabsTrigger value="payments">Paiements échoués</TabsTrigger>
            <TabsTrigger value="analytics" asChild>
              <a href={`/companies/${company.id}/analytics`}>Analytics</a>
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Campagnes de récupération</CardTitle>
                    <CardDescription>Gérez vos campagnes de rappel automatique</CardDescription>
                  </div>
                  <Button asChild>
                    <a href={`/companies/${company.id}/campaigns`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Gérer les campagnes
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {campaignsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : campaignsQuery.data && campaignsQuery.data.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">Aucune campagne créée</p>
                    <Button asChild>
                      <a href={`/companies/${company.id}/campaigns/new`}>
                        Créer la première campagne
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaignsQuery.data?.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => navigate(`/companies/${company.id}/campaigns/${campaign.id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                            <p className="text-sm text-slate-600">{campaign.description}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            campaign.status === "active"
                              ? "bg-green-100 text-green-700"
                              : campaign.status === "paused"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-4 text-sm text-slate-600">
                          <span>Max tentatives: {campaign.maxRetries}</span>
                          <span>Délai initial: {campaign.initialDelayHours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Failed Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Paiements échoués</CardTitle>
                <CardDescription>Historique des paiements échoués et tentatives de récupération</CardDescription>
              </CardHeader>
              <CardContent>
                {failedPaymentsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : failedPaymentsQuery.data && failedPaymentsQuery.data.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Aucun paiement échoué détecté</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900">Client</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900">Montant</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900">Statut</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedPaymentsQuery.data?.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition"
                            onClick={() => navigate(`/companies/${company.id}/payments/${payment.id}`)}
                          >
                            <td className="py-3 px-4">{payment.customerEmail}</td>
                            <td className="py-3 px-4 font-semibold">{payment.amount} {payment.currency}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                payment.status === "recovered"
                                  ? "bg-green-100 text-green-700"
                                  : payment.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(payment.failedAt).toLocaleDateString("fr-FR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Rapports détaillés de performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Les graphiques analytics seront disponibles bientôt</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
