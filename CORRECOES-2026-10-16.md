# Correções de integridade — 16/10/2026

## Estado da entrega

Código corrigido e validado em cópia local. Nenhuma conexão ao banco de produção,
restauração, exclusão ou alteração de registros reais foi executada.
As três migrações novas ainda precisam ser instaladas no Supabase antes de
publicar esta versão do aplicativo. Não publicar apenas o frontend.

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

## Instalação preservando os registros

1. Guardar um backup íntegro do banco e confirmar o projeto Supabase de destino.
2. Conferir o histórico de migrações aplicado no servidor. **Não executar todas
   as migrações antigas indiscriminadamente:** há arquivos antigos com comandos
   de recálculo de estoque, fora do escopo desta entrega.
3. Instalar somente as novas migrações, nesta ordem, cada uma em uma transação:
   - `supabase/migrations/20261016120000_atomic_operations.sql`
   - `supabase/migrations/20261016121000_atomic_backups.sql`
   - `supabase/migrations/20261016122000_installment_payables.sql`
4. A primeira cria duas tabelas auxiliares, copia apenas os identificadores das
   contas atuais para a lista de autorização e instala regras/funções. A segunda
   apenas instala funções de backup. A terceira adiciona metadados opcionais de
   parcelamento às contas e funções de compra a prazo/geração de parcelas.
   A instalação não executa as funções de
   restauração, não modifica vendas/compras/estoque/caixa existentes e não altera
   credenciais de usuários.
   Se não houver contas cadastradas, a instalação é interrompida antes de alterar
   o acesso. Colunas opcionais `sales.paid_at` e `purchases.supplier` são adicionadas
   somente se estiverem ausentes no esquema do servidor.
5. Publicar o aplicativo depois das migrações. A versão nova recusa operar se as
   funções necessárias não estiverem instaladas, em vez de gravar parcialmente.
6. Validar login e exportação no ambiente de destino. Testes de criação/alteração
   devem usar um ambiente de homologação, não os registros reais.

## Validação local

- Verificação TypeScript sem erros.
- Testes de interface/lógica: `npm test` (20 testes, incluindo o demonstrativo).
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
verificações de banco, com dados fictícios.
