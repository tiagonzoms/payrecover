import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function PaymentDetail() {
  const { companyId, paymentId } = useParams<{ companyId: string; paymentId: string }>();
  const [, navigate] = useLocation();
  const numCompanyId = parseInt(companyId || "0");
  const numPaymentId = parseInt(paymentId || "0");

  const paymentQuery = trpc.failedPayments.getById.useQuery({ paymentId: numPaymentId });
  const attemptsQuery = trpc.failedPayments.getAttempts.useQuery({ paymentId: numPaymentId });

  if (paymentQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!paymentQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Paiement non trouvé</h2>
            <Button asChild variant="outline" className="mt-4">
              <a href={`/companies/${companyId}`}>Retour</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payment = paymentQuery.data;
  const attempts = attemptsQuery.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "recovered":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recovered":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(`/companies/${companyId}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="flex items-center gap-3">
            {getStatusIcon(payment.status)}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Paiement échoué</h1>
              <p className="text-slate-600">ID: {payment.stripeInvoiceId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600">Client</p>
                <p className="text-lg font-semibold text-slate-900">{payment.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Montant</p>
                <p className="text-lg font-semibold text-slate-900">{payment.amount} {payment.currency}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Statut</p>
                <Badge className={`mt-1 ${getStatusColor(payment.status)}`}>
                  {payment.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-600">Date d'échec</p>
                <p className="text-lg font-semibold text-slate-900">
                  {new Date(payment.failedAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {payment.failureReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900">
                  <strong>Raison de l'échec :</strong> {payment.failureReason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recovery Attempts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Tentatives de récupération
            </CardTitle>
            <CardDescription>Historique des rappels envoyés</CardDescription>
          </CardHeader>
          <CardContent>
            {attemptsQuery.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : attempts.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Aucune tentative de récupération</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt, index) => (
                  <div key={attempt.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Tentative #{attempt.attemptNumber}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {new Date(attempt.createdAt).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge className={getStatusColor(attempt.result || "pending")}>
                        {attempt.result || "pending"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-slate-600">
                        Type: <strong className="text-slate-900">{attempt.type}</strong>
                      </span>
                      {attempt.details ? (
                        <span className="text-slate-600">
                          Détails: <strong className="text-slate-900">{String(JSON.stringify(attempt.details))}</strong>
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button>Envoyer un rappel manuel</Button>
          <Button variant="outline">Marquer comme récupéré</Button>
        </div>
      </div>
    </div>
  );
}
