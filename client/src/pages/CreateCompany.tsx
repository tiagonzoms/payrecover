import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CreateCompany() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: (result) => {
      toast.success("Entreprise crÃ©Ã©e avec succÃ¨s!");
      navigate(`/companies/${result[0]?.id || 1}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la crÃ©ation de l'entreprise");
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.name || !formData.email) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      setIsLoading(false);
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-3xl font-bold text-slate-900">CrÃ©er une nouvelle entreprise</h1>
          <p className="text-slate-600 mt-2">
            Configurez votre entreprise et connectez votre compte Stripe pour commencer Ã  rÃ©cupÃ©rer les paiements Ã©chouÃ©s.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Informations de l'entreprise</CardTitle>
            <CardDescription>
              Fournissez les dÃ©tails de base de votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'entreprise *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Mon Entreprise SaaS"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email de contact *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Site web (optionnel)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Prochaine Ã©tape :</strong> AprÃ¨s la crÃ©ation, vous pourrez connecter votre compte Stripe pour commencer Ã  dÃ©tecter et rÃ©cupÃ©rer les paiements Ã©chouÃ©s.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      CrÃ©ation en cours...
                    </>
                  ) : (
                    "CrÃ©er l'entreprise"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


