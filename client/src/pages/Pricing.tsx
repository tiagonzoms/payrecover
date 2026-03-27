import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  period: string;
  features: { name: string; included: boolean }[];
  cta: string;
  popular?: boolean;
  stripePriceId?: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Para pequenas empresas começando",
    price: 49,
    currency: "€",
    period: "/mês",
    popular: false,
    stripePriceId: "price_starter",
    features: [
      { name: "Até 10k€ em paiements/mês", included: true },
      { name: "3 campanhas de recuperação", included: true },
      { name: "Sequências de e-mail customizáveis", included: true },
      { name: "Dashboard com analytics", included: true },
      { name: "Suporte por email", included: true },
      { name: "Notificações em tempo real", included: false },
      { name: "API access", included: false },
      { name: "Suporte prioritário", included: false }
    ],
    cta: "Começar Teste Grátis"
  },
  {
    id: "professional",
    name: "Professional",
    description: "Para empresas em crescimento",
    price: 149,
    currency: "€",
    period: "/mês",
    popular: true,
    stripePriceId: "price_professional",
    features: [
      { name: "Até 100k€ em paiements/mês", included: true },
      { name: "Campanhas ilimitadas", included: true },
      { name: "Sequências de e-mail customizáveis", included: true },
      { name: "Dashboard com analytics avançadas", included: true },
      { name: "Suporte prioritário", included: true },
      { name: "Notificações em tempo real", included: true },
      { name: "API access", included: true },
      { name: "Webhooks customizados", included: true }
    ],
    cta: "Começar Teste Grátis"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para grandes operações",
    price: 0,
    currency: "€",
    period: "Custom",
    popular: false,
    features: [
      { name: "Acima de 100k€ em paiements/mês", included: true },
      { name: "Campanhas ilimitadas", included: true },
      { name: "Sequências de e-mail customizáveis", included: true },
      { name: "Dashboard com analytics avançadas", included: true },
      { name: "Suporte dedicado 24/7", included: true },
      { name: "Notificações em tempo real", included: true },
      { name: "API access completo", included: true },
      { name: "Integração customizada", included: true }
    ],
    cta: "Contactar Vendas"
  }
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const createCheckoutSession = trpc.stripe.createCheckoutSession.useMutation();

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (plan.id === "enterprise") {
      toast.info("Por favor, contacte nossa equipe de vendas");
      return;
    }

    setLoadingPlan(plan.id);

    try {
      const result = await createCheckoutSession.mutateAsync({
        priceId: plan.stripePriceId || "",
        planId: plan.id
      });

      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (error) {
      toast.error("Erro ao criar sessão de checkout");
      console.error(error);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">Planos Simples e Transparentes</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Escolha o plano perfeito para sua empresa. Sem contratos de longa duração, cancele quando quiser.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular
                  ? "border-2 border-blue-500 bg-slate-800/80 shadow-2xl transform md:scale-105"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">Mais Popular</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                <CardDescription className="text-slate-400">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className="mb-8">
                  {plan.price > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-white">{plan.price}</span>
                      <span className="text-slate-400">
                        {plan.currency}
                        {plan.period}
                      </span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-white">Preço Customizado</div>
                  )}
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "text-white" : "text-slate-500"}>{feature.name}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full ${
                    plan.popular ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  {loadingPlan === plan.id ? "Carregando..." : plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Perguntas Frequentes</h2>

          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Posso mudar de plano a qualquer momento?</h3>
              <p className="text-slate-400">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. A mudança entrará em vigor no próximo ciclo de faturamento.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Há período de teste gratuito?</h3>
              <p className="text-slate-400">Sim! Todos os planos incluem 14 dias de teste grátis. Sem cartão de crédito necessário.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">O que está incluído no suporte?</h3>
              <p className="text-slate-400">
                Starter: Suporte por email. Professional: Suporte prioritário via email e chat. Enterprise: Suporte dedicado 24/7.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Como funciona o faturamento?</h3>
              <p className="text-slate-400">
                Você será cobrado mensalmente no dia do seu ciclo de faturamento. Você pode cancelar a qualquer momento e não será cobrado novamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
