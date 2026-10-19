# Acesso e manutenção — Pulse Drink Flow

Referência atualizada em **19/10/2026** para continuar o trabalho no projeto correto.
Não contém senhas, PINs, tokens ou dados de clientes.

## Identificação e acessos

| Item | Identificação |
| --- | --- |
| Projeto / repositório | Pulse Drink Flow / `pulse-drink-flow` |
| Nome na interface | Bebidas Manager |
| Nome no Lovable | Neon Ledger |
| Workspace / proprietário no Lovable | Petcia's Lovable / Petcia Banhotosa |
| Projeto Lovable | https://lovable.dev/projects/100a57a4-f2c4-405f-9b03-1990dc999d0b |
| Aplicativo publicado | https://pulse-drink-flow.lovable.app |
| GitHub oficial | https://github.com/petciabanhotosa-png/pulse-drink-flow |
| Proprietário / branch de produção | `petciabanhotosa-png` / `main` |
| Backend | Supabase gerenciado pelo Lovable Cloud |
| Referência do backend | `ivaydxuisdzpdvqmfxfo` |
| URL do backend | `https://ivaydxuisdzpdvqmfxfo.supabase.co` |

### Como acessar

- **Lovable:** entrar com uma conta autorizada no workspace e abrir o link acima.
  Neon Ledger corresponde ao aplicativo de bebidas; conferir também o UUID.
  Permissão de editor não equivale a proprietário ou administrador do workspace.
- **Banco:** abrir **Cloud / Database** dentro desse projeto. O gerenciamento usado
  na entrega fica em **Manage → SQL editor**, com **Backups** no mesmo menu.
  Por ser gerenciado pelo Lovable, o backend pode não aparecer no painel pessoal
  do Supabase da pessoa conectada.
- **GitHub:** usar o repositório oficial acima com uma conta autorizada a integrar
  alterações. O fork `https://github.com/leandronegociosdigitais-boop/pulse-drink-flow`
  foi usado para propostas por PR; ele não é a origem de produção.
- **Aplicativo:** entrar por email/senha de uma conta autorizada e PIN local.
  A autorização depende da tabela `app_members`; concessões devem ser tratadas
  pelo responsável, sem divulgar credenciais.

Conferir o UUID do Lovable e a referência do backend antes de operar. Não selecionar
outro projeto apenas por estar aberto ou pertencer à mesma conta. Se faltar acesso,
solicitar permissão ao responsável; não criar outro banco nem trocar a conexão
para um projeto pessoal.

## Estado da entrega

| Entrega | Registro |
| --- | --- |
| Auditoria, seis ajustes funcionais, parcelamento, login, proteção e PIN inicial | [PR #5](https://github.com/petciabanhotosa-png/pulse-drink-flow/pull/5), integrado e publicado |
| PIN com prazo inicial de 15 minutos; regra substituída em 19/10 pela sessão aberta sem prazo | [PR #6](https://github.com/petciabanhotosa-png/pulse-drink-flow/pull/6), histórico da implantação inicial |
| Indicadores e lucro pela data do recebimento, inclusive vendas antigas | [PR #7](https://github.com/petciabanhotosa-png/pulse-drink-flow/pull/7), integrado e publicado |

Commit de referência da entrega de indicadores em 16/10/2026:
`d9e4032cd289246abd582f511ea6a963a4e84162`. É uma referência da entrega, não uma
instrução para voltar o código a esse commit. Sempre conferir a `main` atual.

Também estão implementados: remoção do alerta de estoque da tela inicial; nome do
cliente na lista de vendas; estoque em quantidade decrescente; contas a pagar em
vencimento decrescente; compras e contas parceladas; operações críticas atômicas;
backup completo com validação e restauração transacional.

O selo “Edit with Lovable” permanece: sua remoção pelo painel exige plano Pro.
Nenhuma contratação foi feita nesta entrega.

## Regras que devem ser preservadas

### Vendas, estoque, caixa e lucro

- Registrar uma venda, mesmo pendente, baixa o estoque imediatamente.
- Venda pendente fica em **A Receber**; o lucro exibido no histórico é **previsto**.
- Marcar como paga cria uma única entrada no caixa e registra `paid_at`, sem
  descontar estoque novamente. Pagamentos repetidos são recusados.
- Dashboard, gráficos, meta diária e relatórios reconhecem somente vendas pagas
  no período do recebimento, incluindo vendas anteriores à atualização.
- Vendas históricas sem `paid_at` usam a data da entrada vinculada no caixa.
  Não antecipar recebimento usando a data original da venda.
- **Saldo Projetado** soma caixa e pendências; não é o dinheiro recebido.
- Os valores por produto consideram descontos e fecham com o total líquido.

### Compras e contas parceladas

- Crédito a prazo aumenta o estoque e gera parcelas futuras sem saída imediata.
- Cada parcela gera saída de caixa apenas quando for marcada como paga.
- O vencimento não paga a parcela automaticamente.
- Compras e contas antigas não foram convertidas em parcelamento.

### PIN e acesso

- PIN de quatro números, cadastrado por aparelho/navegador.
- O desbloqueio acompanha a sessão de login no aparelho, identificado pelo
  `session_id` do Supabase. O registro local não contém tokens nem o PIN.
- Não há prazo de inatividade: recarga, troca de app e recriação da janela pelo
  Android mantêm o acesso enquanto o mesmo login estiver conectado. A renovação
  do token não cria um login novo.
- Sair da conta, iniciar outro login ou redefinir o PIN remove o desbloqueio.
  Fechar apenas a janela pode manter o login no Android; usar **Sair da conta**
  para bloquear explicitamente o aparelho.
- O atualizador PWA aparece também na tela de login/PIN, sem depender do
  desbloqueio para buscar a versão nova.
- O PIN é um bloqueio local da interface; os dados continuam protegidos pelo login
  Supabase e pelas políticas de membros no banco.
- O PIN usa PBKDF2 com salt, sem armazenamento em texto, e espera progressiva após
  erros. Redefinição exige confirmar a senha da mesma conta.

## Banco — instalação já concluída

As quatro migrações seguintes **já estão aplicadas em produção**:

| Versão / arquivo | Finalidade |
| --- | --- |
| `20261016120000_atomic_operations.sql` | Operações atômicas, membros, alocações de lotes e metadados opcionais |
| `20261016121000_atomic_backups.sql` | Exportação e restauração atômica |
| `20261016122000_installment_payables.sql` | Contas e compras parceladas |
| `20261016123000_activate_member_policies.sql` | Acesso restrito aos membros e revogação do FIFO legado |

Na implantação inicial houve preparação do banco, proteção do acesso e publicação
da interface com login. Os ajustes posteriores de PIN e indicadores foram apenas
de código, sem migrações ou regravação do histórico.

Antes de planejar SQL, consultar o histórico real em
`supabase_migrations.schema_migrations`. Alguns arquivos antigos têm timestamps
diferentes dos existentes no servidor. Não reaplicar indiscriminadamente as
migrações antigas nem executar sincronização que possa refazer recálculos de
estoque. Criar novas migrações específicas quando necessárias.

Os membros autorizados compartilham a operação atual. Não há isolamento entre
empresas diferentes; usar esta base para multiempresa exigiria um projeto próprio.

## Próximas alterações

1. Confirmar projeto, backend, GitHub, branch e alterações locais pendentes.
2. Ler este guia e [AGENTS.md](AGENTS.md). Partir da `main` atualizada e trabalhar
   em branch própria, preservando trabalho local existente.
3. Antes de alterar o banco, exportar e validar backup completo e guardar fora do
   Git. O backup da implantação não contém automaticamente operações posteriores.
4. Testar vendas, compras, pagamentos e restaurações em ambiente separado.
   `npm run dev` usa o backend configurado; não cria homologação automaticamente.
5. Implementar, validar e abrir PR para o GitHub oficial. Integrar na `main`.
6. Conferir a sincronização no Lovable. Integração no GitHub não equivale por si só
   a publicar o aplicativo.
7. Usar **Publish → Publicar alterações** no projeto correto e conferir a
   confirmação e o endereço publicado. Havendo SQL novo, planejar a compatibilidade
   entre banco e interface antes de implantar.
8. Atualizar este guia quando mudarem acessos, backend, autenticação ou regras.

Não excluir registros, restaurar produção, reconstruir histórico financeiro ou
recalcular estoque para corrigir uma dúvida de apresentação. Primeiro conferir
os vínculos entre vendas, pagamentos e movimentos.

## Desenvolvimento e validação

```sh
git clone https://github.com/petciabanhotosa-png/pulse-drink-flow.git
cd pulse-drink-flow
npm ci
npm run dev
```

Configuração em [.env.example](.env.example): `VITE_SUPABASE_URL` identifica o
backend e `VITE_SUPABASE_PUBLISHABLE_KEY` contém a chave pública apropriada.
Variáveis `VITE_*` são expostas ao navegador: nunca usar `service_role`, senha do
banco ou token administrativo. Não adicionar credenciais, PINs, dados de clientes
ou backups ao repositório público.

```sh
npm test
npm run lint
npm run build
npx tsc --noEmit -p tsconfig.app.json
```

Última validação local da correção Android: **60 testes do aplicativo** aprovados; TypeScript e
build aprovados; lint sem erros, com nove avisos existentes de Fast Refresh.
Há **31 verificações** de transações locais em `scripts/verify-transactions.mjs`.
O script depende de PGlite externo ao aplicativo: disponibilizar o pacote
`@electric-sql/pglite` ou indicar o módulo com `PGLITE_MODULE`. Ele não lê `.env`
nem acessa produção.

| Caminho | Finalidade |
| --- | --- |
| `src/pages` | Telas |
| `src/hooks` | Consultas e operações da interface |
| `src/lib/receivedSales.ts` | Recebimentos e lucro líquido por produto |
| `src/lib/reportQueries.ts` | Leituras paginadas dos relatórios |
| `src/contexts/PinContext.tsx` | Sessão e inatividade do PIN |
| `src/lib/pinSession.ts` | Desbloqueio no aparelho vinculado ao login, sem guardar tokens |
| `src/lib/operations.ts` | Chamadas às operações atômicas |
| `supabase/migrations` | Histórico SQL; conferir o servidor antes de aplicar |
| `src/test` | Testes do aplicativo |

Pasta original na máquina da entrega:
`%USERPROFILE%\Desktop\Projetos\pulse-drink-flow`. Cópias auxiliares de correção
e release também foram usadas. Em outra máquina, clonar o GitHub oficial; não
escolher uma cópia apenas pelo nome.
