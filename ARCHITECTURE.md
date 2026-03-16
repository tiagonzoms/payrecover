# Architecture - PayRecover Dunning SaaS Platform

## Vue d'ensemble du système

PayRecover est une plateforme SaaS multi-entreprise conçue pour récupérer automatiquement les paiements échoués en utilisant l'intégration Stripe et un système de rappels par e-mail intelligent.

## Architecture générale

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                       │
│  - Dashboard Analytics                                       │
│  - Configuration Stripe                                      │
│  - Gestion Campagnes                                         │
│  - Historique & Rapports                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Express + tRPC)                        │
│  - Procédures d'authentification                             │
│  - Gestion des entreprises clientes                          │
│  - Logique de récupération de paiements                      │
│  - Système de rappels automatiques                           │
│  - Analytics & Rapports                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌──────────┐  ┌────────────┐
    │Database│  │Stripe API│  │Email Service│
    │(MySQL) │  │(Webhooks)│  │(SMTP/Forge) │
    └────────┘  └──────────┘  └────────────┘
```

## Modèle de données

### Entités principales

**Companies** : Entreprises clientes utilisant la plateforme
- ID, nom, email, plan d'abonnement
- Clés Stripe (public/secret)
- Configuration des règles de retry
- Statut d'activation

**StripeAccounts** : Comptes Stripe connectés
- Référence à l'entreprise
- Token d'authentification Stripe
- Dernière synchronisation
- Webhooks configurés

**FailedPayments** : Paiements échoués détectés
- Référence à l'entreprise
- ID Stripe de l'invoice/subscription
- Montant, devise, raison de l'échec
- Statut (pending, recovered, abandoned)
- Timestamp de l'échec

**RecoveryCampaigns** : Campagnes de récupération
- Référence à l'entreprise
- Nom, description
- Séquence d'e-mails associée
- Règles de retry (délai, nombre de tentatives)
- Statut (active, paused, completed)

**EmailSequences** : Modèles de séquences d'e-mails
- Référence à l'entreprise
- Nom, description
- Étapes (template, délai après échec, conditions)
- Variables personnalisables

**RecoveryAttempts** : Historique des tentatives
- Référence au paiement échoué
- Référence à la campagne
- Timestamp de la tentative
- Type (email, retry, etc.)
- Résultat (sent, failed, recovered)
- Détails supplémentaires

**EmailLogs** : Logs détaillés des e-mails
- Référence à la tentative
- Template utilisé
- Destinataire
- Timestamp d'envoi
- Statut de livraison
- Ouvertures/clics (si disponible)

## Flux de données

### 1. Détection des paiements échoués

```
Stripe Event (charge.failed / invoice.payment_failed)
    ↓
Webhook Endpoint (/api/webhooks/stripe)
    ↓
Validation & Vérification de signature
    ↓
Créer FailedPayment record
    ↓
Déclencher RecoveryCampaign
```

### 2. Processus de récupération

```
FailedPayment créé
    ↓
Charger la RecoveryCampaign associée
    ↓
Charger la EmailSequence
    ↓
Boucle de retry :
  - Attendre le délai configuré
  - Envoyer l'e-mail de rappel
  - Logger la tentative
  - Vérifier si le paiement a été récupéré
  - Si oui : marquer comme recovered
  - Si non et tentatives restantes : continuer
  - Si non et pas de tentatives : marquer comme abandoned
```

### 3. Synchronisation Stripe

```
Chaque jour (ou à la demande) :
  - Récupérer les invoices/subscriptions de Stripe
  - Comparer avec les records en base
  - Créer les FailedPayment manquants
  - Mettre à jour les statuts de récupération
```

## Procédures tRPC (Backend)

### Auth & Companies
- `auth.me` : Récupérer l'utilisateur courant
- `companies.create` : Créer une nouvelle entreprise cliente
- `companies.list` : Lister les entreprises de l'utilisateur
- `companies.getById` : Récupérer les détails d'une entreprise
- `companies.update` : Mettre à jour les paramètres

### Stripe Integration
- `stripe.connect` : Initier la connexion OAuth Stripe
- `stripe.callback` : Gérer le callback OAuth
- `stripe.disconnect` : Déconnecter un compte Stripe
- `stripe.getStatus` : Vérifier l'état de la connexion
- `stripe.syncNow` : Forcer la synchronisation

### Recovery Management
- `recovery.getFailedPayments` : Lister les paiements échoués
- `recovery.getAttempts` : Historique des tentatives
- `recovery.getMetrics` : Métriques de récupération
- `recovery.retryPayment` : Forcer une nouvelle tentative

### Campaigns
- `campaigns.create` : Créer une campagne
- `campaigns.list` : Lister les campagnes
- `campaigns.update` : Mettre à jour une campagne
- `campaigns.delete` : Supprimer une campagne

### Email Sequences
- `emailSequences.create` : Créer une séquence
- `emailSequences.list` : Lister les séquences
- `emailSequences.update` : Mettre à jour
- `emailSequences.delete` : Supprimer

### Analytics
- `analytics.getDashboard` : Métriques principales
- `analytics.getRecoveryTrend` : Tendances de récupération
- `analytics.getReport` : Rapport détaillé

## Sécurité

### Authentification
- OAuth Manus pour les utilisateurs
- JWT pour les sessions
- Tokens Stripe stockés chiffrés

### Autorisation
- Vérification que l'utilisateur accède uniquement à ses propres données
- Validation des clés Stripe avant utilisation
- Rate limiting sur les endpoints sensibles

### Webhooks Stripe
- Vérification de signature obligatoire
- Idempotence (vérifier les doublons)
- Timeout et retry logic

## Performance

### Optimisations
- Caching des configurations par entreprise
- Pagination pour les listes
- Indexes sur les colonnes fréquemment interrogées
- Batch processing pour les e-mails

### Scalabilité
- Système de queue pour les e-mails (future)
- Webhooks asynchrones
- Sharding possible par entreprise

## Monitoring & Alertes

### Métriques clés
- Taux de récupération par entreprise
- Nombre de paiements échoués
- Temps moyen de récupération
- Taux d'ouverture des e-mails

### Alertes
- Nouveau client inscrit
- Taux de récupération < 50%
- Erreurs de synchronisation Stripe
- Taux d'échec d'envoi d'e-mails élevé
