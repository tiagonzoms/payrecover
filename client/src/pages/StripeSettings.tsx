import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function StripeSettings() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, navigate] = useLocation();
  const numCompanyId = parseInt(companyId || "0");

  const companyQuery = trpc.companies.getById.useQuery({ companyId: numCompanyId });
  const createStripeConnectLink = trpc.companies.createStripeConnectLink.useMutation();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe");

    if (stripeStatus === "connected") {
      toast.success("Compte Stripe connecté com sucesso");
      companyQuery.refetch();
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (stripeStatus === "error") {
      const reason = params.get("reason") || "unknown";
      toast.error(`Falha ao conectar Stripe (${reason})`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [companyQuery]);

  const handleConnectStripe = async () => {
    if (!numCompanyId) {
      toast.error("Entreprise inválida");
      return;
    }

    setIsConnecting(true);
    try {
      const { url } = await createStripeConnectLink.mutateAsync({ companyId: numCompanyId });
      window.location.href = url;
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la connexion à Stripe");
      setIsConnecting(false);
    }
  };

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
              <a href="/">Retour</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = companyQuery.data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(`/companies/${company.id}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à {company.name}
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Configuration Stripe</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {company.stripeConnected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Connecté à Stripe
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Non connecté à Stripe
                </>
              )}
            </CardTitle>
            <CardDescription>
              {company.stripeConnected
                ? "Votre compte Stripe est connecté et prêt à détecter les paiements échoués."
                : "Connectez votre compte Stripe pour commencer à récupérer les paiements échoués."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {company.stripeConnected ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900">
                    <strong>Compte Stripe :</strong> {company.stripeAccountId}
                  </p>
                </div>
                <Button variant="outline" onClick={handleConnectStripe} disabled={isConnecting || createStripeConnectLink.isPending}>Reconnecter Stripe</Button>
              </div>
            ) : (
              <Button onClick={handleConnectStripe} disabled={isConnecting || createStripeConnectLink.isPending} size="lg">
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  "Connecter Stripe"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Configuration Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Guide de configuration</CardTitle>
            <CardDescription>Étapes pour configurer Stripe correctement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Connecter votre compte Stripe</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Cliquez sur le bouton "Connecter Stripe" ci-dessus pour autoriser PayRecover à accéder à votre compte.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Configurer les webhooks</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Les webhooks seront configurés automatiquement pour détecter les paiements échoués.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Créer une campagne de récupération</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Une fois connecté, vous pourrez créer des campagnes de rappel automatique.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Événements Stripe détectés</CardTitle>
            <CardDescription>PayRecover surveille les événements suivants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <span className="text-sm font-medium text-slate-900">charge.failed</span>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">Détecté</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <span className="text-sm font-medium text-slate-900">invoice.payment_failed</span>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">Détecté</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <span className="text-sm font-medium text-slate-900">invoice.payment_succeeded</span>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">Détecté</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vos données Stripe sont chiffrées et stockées de manière sécurisée. PayRecover ne stocke jamais vos clés API complètes.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
