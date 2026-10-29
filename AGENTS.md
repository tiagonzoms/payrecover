# PAYRECOVER — INSTRUÇÕES PARA O CODEX

## 1. Objetivo

PayRecover é uma plataforma SaaS B2B destinada a ajudar
empresas a recuperar pagamentos falhados.

Objetivo: concluir, testar e lançar um MVP funcional,
seguro e preparado para receber os primeiros clientes.

Não reconstruir o projeto do zero.

## 2. Ambiente

Sistema: Windows 11
Editor: Visual Studio Code
Node.js: 24
Gestor de pacotes: pnpm via Corepack

Diretório:
C:\Users\tiago\Documents\GitHub\payrecover

Tecnologias:
- TypeScript
- React
- Vite
- Express
- tRPC
- PostgreSQL
- Drizzle ORM
- Stripe / Stripe Connect
- Vitest

Comandos:
- corepack pnpm run check
- corepack pnpm run build
- corepack pnpm run dev

## 3. Estado do projeto

Funcionalidades anteriormente testadas:
- Registo de utilizadores
- Login e logout
- Persistência de sessões
- Dashboard
- Ligação à base de dados PostgreSQL

Funcionalidades em desenvolvimento:
- Integração Stripe Connect
- Webhooks Stripe
- Registo de pagamentos falhados
- Campanhas de recuperação
- Automatização de notificações
- Métricas e relatórios

O último teste TypeScript terminou sem erros.

Não assumir que uma funcionalidade está pronta
apenas porque o código compila.

## 4. Ficheiros importantes

- server/db.ts
- server/routers.ts
- server/stripe.ts
- server/stripeConnect.ts
- server/webhooks/stripe.ts
- server/_core/index.ts
- drizzle/schema.ts
- drizzle.config.pg.ts
- client/src/App.tsx
- package.json

Verificar a estrutura real do projeto.

## 5. Git e proteção do código

Branches conhecidas:
- main
- backup-payrecover
- integracao-payrecover

A branch de trabalho é integracao-payrecover.

REGRAS:
- Não executar git reset --hard.
- Não executar git push --force.
- Não apagar branches de segurança.
- Não substituir o projeto pela versão remota.
- Não fazer merge ou rebase sem autorização.
- Não apagar funcionalidades existentes sem autorização.
- Não publicar alterações sem autorização.
- Verificar git status antes de modificar ficheiros.
- Criar alterações pequenas e verificáveis.

## 6. Segurança

- Nunca revelar credenciais.
- Nunca publicar ficheiros .env.
- Nunca imprimir tokens ou chaves secretas.
- Nunca executar cobranças reais durante testes.
- Utilizar Stripe em modo de teste.
- Não alterar dados de produção sem autorização.
- Não executar migrações destrutivas sem autorização.
- Não assumir que a conta Stripe do proprietário
  está habilitada para receber pagamentos na RDC.

## 7. Prioridades técnicas

PRIORIDADE 1:
Verificar e concluir Stripe Connect.

PRIORIDADE 2:
Garantir que invoice.payment_failed identifica
corretamente a empresa e regista o pagamento.

PRIORIDADE 3:
Implementar idempotência dos webhooks para
evitar pagamentos duplicados.

PRIORIDADE 4:
Implementar recuperação automática de pagamentos.

PRIORIDADE 5:
Concluir dashboard, campanhas e métricas.

PRIORIDADE 6:
Criar testes automáticos e corrigir falhas.

PRIORIDADE 7:
Preparar o MVP para produção.

## 8. Forma de trabalhar

O proprietário é iniciante em programação.

- Comunicar em português.
- Explicar conceitos técnicos de forma simples.
- Trabalhar diretamente nos ficheiros.
- Evitar pedir alterações manuais desnecessárias.
- Executar testes depois das modificações.
- Apresentar resultados objetivos.
- Não inventar resultados de testes.
- Pedir autorização para operações arriscadas.
- Preservar funcionalidades existentes.

## 9. Primeira tarefa

1. Confirmar a branch atual.
2. Verificar o estado do Git.
3. Analisar a arquitetura existente.
4. Inspecionar Stripe Connect e webhooks.
5. Executar verificações não destrutivas.
6. Identificar problemas que impedem o lançamento.
7. Apresentar um plano técnico por prioridades.
8. Corrigir primeiro o problema mais importante
   que possa ser resolvido com segurança.

Objetivo final:
Lançar o PayRecover e conseguir os primeiros
clientes pagantes.