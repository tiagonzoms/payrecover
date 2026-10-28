import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Percent, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Analytics() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, navigate] = useLocation();
  const numCompanyId = parseInt(companyId || "0");

  const companyQuery = trpc.companies.getById.useQuery({ companyId: numCompanyId });
  const metricsQuery = trpc.analytics.getMetrics.useQuery({ companyId: numCompanyId });

  // Mock data for charts
  const recoveryTrendData = [
    { month: "Jan", recovered: 1200, failed: 800 },
    { month: "Fév", recovered: 1900, failed: 600 },
    { month: "Mar", recovered: 2400, failed: 500 },
    { month: "Avr", recovered: 2210, failed: 400 },
    { month: "Mai", recovered: 2290, failed: 350 },
    { month: "Juin", recovered: 2000, failed: 300 },
  ];

  const recoveryRateData = [
    { name: "Récupérés", value: 65, fill: "#10b981" },
    { name: "Échoués", value: 35, fill: "#ef4444" },
  ];

  const attemptsData = [
    { attempt: "1ère", count: 450 },
    { attempt: "2ème", count: 280 },
    { attempt: "3ème", count: 150 },
    { attempt: "4ème", count: 80 },
  ];

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
        <Button asChild variant="outline">
          <a href="/">Retour</a>
        </Button>
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
          <button
            onClick={() => navigate(`/companies/${company.id}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à {company.name}
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Analytics & Rapports</h1>
          <p className="text-slate-600 mt-2">Visualisez la performance de vos campagnes de récupération</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Montant récupéré
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.totalRecoveredAmount || "0"} €</div>
              <p className="text-xs text-green-600 mt-1">+12% ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Taux de récupération
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.recoveryRate || "0"}%</div>
              <p className="text-xs text-green-600 mt-1">+5% ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Paiements échoués
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.totalFailedPayments || "0"}</div>
              <p className="text-xs text-slate-600 mt-1">Tous les temps</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Temps moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.averageRecoveryTime || "0"}h</div>
              <p className="text-xs text-slate-600 mt-1">Avant récupération</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recovery Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tendance de récupération</CardTitle>
              <CardDescription>Montant récupéré vs échoué par mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={recoveryTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="recovered" stroke="#10b981" name="Récupérés" />
                  <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Échoués" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recovery Rate Pie */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des résultats</CardTitle>
              <CardDescription>Paiements récupérés vs échoués</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={recoveryRateData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {recoveryRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Attempts Distribution */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Distribution des tentatives</CardTitle>
              <CardDescription>Nombre de paiements récupérés par tentative</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attemptsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="attempt" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Nombre de paiements" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ROI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Analyse du ROI</CardTitle>
            <CardDescription>Retour sur investissement de PayRecover</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-sm text-slate-600">Montant récupéré</p>
                <p className="text-2xl font-bold text-slate-900">12,450 €</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-slate-600">Coût PayRecover</p>
                <p className="text-2xl font-bold text-slate-900">294 €</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-sm text-slate-600">ROI</p>
                <p className="text-2xl font-bold text-slate-900">4,133%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <div className="flex gap-4">
          <Button variant="outline">Télécharger en PDF</Button>
          <Button variant="outline">Exporter en CSV</Button>
          <Button variant="outline">Partager le rapport</Button>
        </div>
      </div>
    </div>
  );
}
