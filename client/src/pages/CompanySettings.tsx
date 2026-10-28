import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CompanySettings() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, navigate] = useLocation();
  const numCompanyId = parseInt(companyId || "0");

  const companyQuery = trpc.companies.getById.useQuery({ companyId: numCompanyId });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Entreprise mise à jour avec succès!");
      setIsEditing(false);
      companyQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  // Initialize form data when company data loads
  if (companyQuery.data && !isEditing && formData.name === "") {
    setFormData({
      name: companyQuery.data.name,
      email: companyQuery.data.email,
      website: companyQuery.data.website || "",
    });
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    updateMutation.mutate({
      companyId: numCompanyId,
      name: formData.name,
      email: formData.email,
      website: formData.website,
    });
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
          <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>Gérez les informations de votre entreprise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'entreprise</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email de contact</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={!isEditing || updateMutation.isPending}
                  />
                </div>

                <div className="flex gap-4">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>Modifier</Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          "Enregistrer"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={updateMutation.isPending}
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stripe Tab */}
          <TabsContent value="stripe">
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
              <CardContent className="space-y-4">
                {company.stripeConnected && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900">
                      <strong>Compte Stripe :</strong> {company.stripeAccountId}
                    </p>
                  </div>
                )}
                <Button asChild>
                  <a href={`/companies/${company.id}/stripe`}>
                    {company.stripeConnected ? "Gérer Stripe" : "Connecter Stripe"}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">Danger Zone</CardTitle>
                <CardDescription className="text-red-800">
                  Actions irréversibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-red-100 border-red-300">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    La suppression de cette entreprise est permanente et ne peut pas être annulée.
                  </AlertDescription>
                </Alert>
                <Button variant="destructive" disabled>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer cette entreprise
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
