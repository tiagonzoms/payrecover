import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Edit2, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CampaignManager() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, navigate] = useLocation();
  const numCompanyId = parseInt(companyId || "0");

  const companyQuery = trpc.companies.getById.useQuery({ companyId: numCompanyId });
  const campaignsQuery = trpc.campaigns.list.useQuery({ companyId: numCompanyId });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxRetries: 3,
    initialDelayHours: 24,
    retryDelayHours: 72,
  });

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      toast.success("Campagne créée avec succès!");
      setFormData({
        name: "",
        description: "",
        maxRetries: 3,
        initialDelayHours: 24,
        retryDelayHours: 72,
      });
      setShowForm(false);
      campaignsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });

  const handleCreateCampaign = () => {
    if (!formData.name) {
      toast.error("Le nom de la campagne est obligatoire");
      return;
    }

    createMutation.mutate({
      companyId: numCompanyId,
      ...formData,
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(`/companies/${company.id}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à {company.name}
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Campagnes de récupération</h1>
              <p className="text-slate-600 mt-1">Gérez vos campagnes de rappel automatique</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle campagne
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Créer une nouvelle campagne</CardTitle>
              <CardDescription>Configurez les paramètres de votre campagne de récupération</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la campagne *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Campagne Standard"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={createMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Description de la campagne..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={createMutation.isPending}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Nombre max de tentatives</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxRetries}
                    onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
                    disabled={createMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialDelayHours">Délai initial (heures)</Label>
                  <Input
                    id="initialDelayHours"
                    type="number"
                    min="1"
                    max="168"
                    value={formData.initialDelayHours}
                    onChange={(e) => setFormData({ ...formData, initialDelayHours: parseInt(e.target.value) })}
                    disabled={createMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryDelayHours">Délai entre tentatives (heures)</Label>
                  <Input
                    id="retryDelayHours"
                    type="number"
                    min="1"
                    max="168"
                    value={formData.retryDelayHours}
                    onChange={(e) => setFormData({ ...formData, retryDelayHours: parseInt(e.target.value) })}
                    disabled={createMutation.isPending}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleCreateCampaign} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer la campagne"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} disabled={createMutation.isPending}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaigns List */}
        {campaignsQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : campaignsQuery.data && campaignsQuery.data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune campagne</h3>
              <p className="text-slate-600 mb-6">Créez votre première campagne de récupération</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une campagne
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaignsQuery.data?.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="py-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-slate-600 text-sm mt-1">{campaign.description}</p>
                      )}
                      <div className="flex gap-6 mt-4 text-sm text-slate-600">
                        <span>Max tentatives: <strong>{campaign.maxRetries}</strong></span>
                        <span>Délai initial: <strong>{campaign.initialDelayHours}h</strong></span>
                        <span>Délai entre tentatives: <strong>{campaign.retryDelayHours}h</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-2">
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
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
