# Correções de integridade — 16/10/2026

## Estado da entrega

Código corrigido e validado em cópia local. Banco localizado no Lovable Cloud,
projeto Neon Ledger / Pulse Drink Flow. Backup completo de leitura exportado e
validado em 16/10/2026. Nenhuma restauração, exclusão ou alteração dos registros
de vendas, estoque ou caixa foi executada.
As três migrações de preparação precisam ser instaladas antes do frontend.
Uma quarta migração ativa as novas políticas somente depois da publicação.
Essa instalação em duas etapas mantém o frontend anterior funcionando durante
a preparação. Não publicar apenas o frontend.

## O que mudou

- Vendas, edição/exclusão de pendentes, recebimentos, compras e pagamentos de contas
  agora são operações únicas no banco: qualquer erro desfaz toda a operação.
- Sem alternativa que baixe parcialmente o estoque após uma falha do FIFO.
- Pagamentos repetidos de vendas e contas são recusados sem duplicar o caixa.
- A edição usa o preço original dos itens e o limite correto de estoque.
- Lotes consumidos pelas novas vendas ficam vinculados à venda, permitindo
  estorno exato. Nenhum histórico antigo é regravado para criar esses vínculos.
- Vendas antigas com estornos anteriores e histórico ambíguo são bloqueadas para
  conferência, em vez de alterar estoque com base em uma suposição.
- Exportação completa em uma consulta consistente, incluindo configurações e
  vínculos de lotes; sem o limite de linhas das listagens comuns da API.
- Restauração valida a estrutura antes de começar, respeita a ordem de compras e
  lotes, verifica coerência de estoque e desfaz tudo se qualquer registro falhar.
- Antes de uma restauração ou limpeza solicitada na interface, o aplicativo gera
  um download de segurança dos dados atuais. Nenhuma dessas ações foi executada.
- Backups 1.1 completos são aceitos. Arquivos anteriores/incompletos são recusados
  sem apagar dados. Configurações ausentes em um backup 1.1 são preservadas.
- Contas existentes mantêm autorização. Novas contas precisam de inclusão
  explícita em `app_members`; cadastro público foi retirado da tela de entrada.
  Isso mantém o modelo atual de uma operação compartilhada entre os autorizados;
  não cria isolamento entre diferentes empresas. Revisar as contas já existentes
  continua sendo uma decisão do responsável.
- Tipos da aplicação corrigidos; falha de login/acesso exibe um estado utilizável.

## Alterações solicitadas depois da auditoria

1. Removido o alerta de estoque da tela inicial.
2. Produtos e nome do cliente aparecem diretamente nos cartões da lista de vendas,
   sem precisar expandir. Vendas sem cliente mostram “Não informado”.
3. Estoque ordenado pela quantidade decrescente, com produtos zerados ao final.
4. Contas a pagar ordenadas pelo vencimento decrescente; datas sem horário são
   exibidas sem conversão para o dia anterior.
5. Em Comprar Produtos, “Crédito a prazo” permite escolher quantidade de parcelas
   e primeiro vencimento futuro. Entrada de estoque, compra e parcelas são criadas
   em uma única transação, sem saída de caixa. Cada parcela aparece em Contas a
   Pagar e gera sua saída somente ao ser marcada como paga.
6. Nova Conta aceita valor total ou valor de cada parcela, quantidade e primeiro
   vencimento. A tela mostra todos os meses/valores antes de salvar. O total é
   dividido em centavos sem perda; vencimentos no dia 31 se ajustam a fevereiro
   e voltam ao dia 31 nos meses seguintes. Limite de 120 parcelas.

As compras e contas antigas não são convertidas para parcelamento. As colunas
novas das contas são opcionais e não alteram valores, vencimentos ou pagamentos
anteriores. Não há pagamento automático no vencimento: é preciso marcar a parcela
como paga para registrar a saída efetiva do caixa.

## PIN de abertura

Após o primeiro login com e-mail e senha, o usuário cadastra e confirma um PIN de
4 números neste aparelho. O aplicativo solicita o PIN em cada carregamento e
quando volta do segundo plano. A navegação interna mantém o desbloqueio.
O PIN é um bloqueio local da interface e não substitui a sessão autenticada nem
as regras de acesso do banco. O aparelho salva um verificador derivado com salt
aleatório e PBKDF2; o PIN não é salvo em texto. Após cinco tentativas incorretas,
as próximas tentativas têm espera progressiva. Para redefinir o PIN, é necessário
confirmar a senha da mesma conta. Em outro aparelho, o PIN é cadastrado novamente.
Os números do PIN serão escolhidos pelo usuário na interface, sem compartilhamento
no chat e sem qualquer alteração nos dados de vendas/estoque/financeiro.

## Instalação preservando os registros

1. Guardar um backup íntegro do banco e confirmar o projeto Supabase de destino.
2. Conferir o histórico de migrações aplicado no servidor. **Não executar todas
   as migrações antigas indiscriminadamente:** há arquivos antigos com comandos
   de recálculo de estoque, fora do escopo desta entrega.
3. Instalar somente as três migrações de preparação, nesta ordem e em transação:
   - `supabase/migrations/20261016120000_atomic_operations.sql`
   - `supabase/migrations/20261016121000_atomic_backups.sql`
   - `supabase/migrations/20261016122000_installment_payables.sql`
4. A primeira cria duas tabelas auxiliares, copia apenas os identificadores das
   contas atuais para a lista de autorização e instala funções novas sem substituir
   a função FIFO antiga nem as políticas das tabelas existentes. A segunda
   apenas instala funções de backup. A terceira adiciona metadados opcionais de
   parcelamento às contas e funções de compra a prazo/geração de parcelas.
   A instalação não executa as funções de
   restauração, não modifica vendas/compras/estoque/caixa existentes e não altera
   credenciais de usuários.
   Se não houver contas cadastradas, a instalação é interrompida antes de alterar
   o acesso. Colunas opcionais `sales.paid_at` e `purchases.supplier` são adicionadas
   somente se estiverem ausentes no esquema do servidor.
5. Publicar o aplicativo depois das três migrações de preparação. A versão nova recusa operar se as
   funções necessárias não estiverem instaladas, em vez de gravar parcialmente.
6. Após a publicação, instalar `20261016123000_activate_member_policies.sql` para
   restringir as tabelas aos usuários autorizados e revogar o FIFO legado.
7. Validar login, PIN e exportação no ambiente de destino. Testes de criação/alteração
   devem usar um ambiente de homologação, não os registros reais.

## Validação local

- Verificação TypeScript sem erros.
- Testes de interface/lógica: `npm test` (25 testes, incluindo o demonstrativo).
- Análise de código: `npm run lint` (sem erros; avisos preexistentes de Fast Refresh).
- Compilação: `npm run build`.
- Integração das migrações: `scripts/verify-transactions.mjs` utiliza PostgreSQL
  em memória via PGlite, sem carregar `.env` e sem acesso ao Supabase real.
  A ferramenta PGlite é externa e não é uma dependência do aplicativo. Para
  repetir, disponibilizar `@electric-sql/pglite` ao script ou indicar seu módulo
  com a variável `PGLITE_MODULE`.

As verificações de banco cobrem instalação sem alteração dos registros iniciais,
rollback de venda/compra por erro no caixa, estoque insuficiente, edição e
exclusão com estorno, pagamentos repetidos, backup com mais de mil registros,
restauração completa e rollback por chave estrangeira inválida, compatibilidade
1.1, preservação dos usuários atuais e recusa de acesso por conta não autorizada.
O motor local não substitui homologação com a configuração real do Supabase.

Parcelamento validado também com compra a prazo sem movimentação de caixa,
pagamento individual de parcela, geração de meses seguintes e rollback de toda
a compra/conta se qualquer parcela falhar. O roteiro de integração cobre 27
verificações de banco, com dados fictícios. Há também uma verificação adicional
de compatibilidade do frontend anterior durante a fase de preparação (28 no total).

## Indicadores por recebimento

- Dashboard, meta diária, gráficos e relatórios de vendas/lucro contam somente
  vendas pagas, na data da entrada vinculada no caixa (ou `paid_at`). Vendas antigas
  sem `paid_at` usam o recebimento histórico, sem reescrever o registro original.
- Pendências continuam no histórico de vendas e em A Receber; seu lucro é
  identificado como previsto. O saldo projetado continua separado do caixa recebido.
- Produtos nos relatórios seguem o mesmo período de recebimento. Descontos e
  centavos são distribuídos entre os itens para fechar com os totais líquidos.
- Consultas financeiras paginadas evitam totais incompletos acima do limite da API.
- Não há migração ou atualização de registros: a baixa de estoque continua na
  criação da venda, e a entrada de caixa somente na confirmação do pagamento.
- Validação: 46 testes do aplicativo e 31 verificações locais de transações,
  incluindo ausência de caixa em venda pendente e nenhuma nova baixa de estoque
  ao receber o pagamento.
