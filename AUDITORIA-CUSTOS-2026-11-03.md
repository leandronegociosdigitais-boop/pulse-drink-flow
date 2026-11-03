# Auditoria de custos, vendas e lucro mensal — 03/11/2026

## Resultado e escopo

Correções aplicadas no código local. Não houve publicação, migração, gravação
no banco ou recálculo de vendas históricas. Os dados reais de produção não foram
consultados nesta auditoria. A referência a comissão foi esclarecida pelo usuário
como lucro estimado do mês.

## Problemas corrigidos

1. A prévia de venda usava o custo do cadastro. Agora calcula os lotes disponíveis
   por PEPS/FIFO, na mesma ordem de criação e identificador usada no banco.
2. A prévia escondia prejuízos mostrando zero. Agora preserva o valor negativo.
3. Estoque e detalhe do produto exibiam custo e margem do cadastro desatualizado.
   Agora mostram custo e lucro da próxima unidade, pelo lote disponível.
4. O desconto percentual podia ter fração de centavo na prévia. Agora é arredondado
   antes da confirmação, e subtotal, desconto e total usam a mesma função na
   criação e edição de vendas. Descontos negativos não aumentam a venda.
5. O custo total por produto podia diferir em centavos por multiplicar o custo
   unitário médio arredondado. Agora é obtido por receita líquida menos lucro salvo.
6. Leituras de lotes, investimento em estoque, produtos e investimento mensal
   foram paginadas para evitar cortes no limite de registros da API.
7. O valor investido podia permanecer em cache após entradas e saídas. Agora as
   operações invalidam também os valores derivados do estoque.
8. Somas de vendas e lucro no dashboard, gráficos e relatórios usam centavos.

## Regras confirmadas no código

- A venda salva usa custo dos lotes consumidos, não o custo do cadastro.
- Descontos reduzem receita e lucro. O total da venda continua calculado no banco.
- Vendas pendentes baixam estoque, mas não compõem os recebimentos mensais.
- Lucro recebido do mês usa a data de pagamento, inclusive para vendas antigas.
- Totais por produto fecham com receita e lucro líquidos das vendas pagas.
- O campo de custo do cadastro vale para estoque inicial e novas entradas manuais;
  sua edição não modifica o custo dos lotes existentes. Rótulos explicam essa regra.
- O lucro exibido é o resultado das vendas após custo dos produtos e descontos;
  não é o lucro líquido contábil após todas as despesas do negócio.

## Validação

- Suíte geral: 77 testes aprovados antes da última verificação adicional.
- Verificação final de custos e relatórios: 14 testes aprovados, incluindo a
  verificação adicional de 1.105 lotes. Ao todo, 9 testes de regressão adicionados.
- Casos cobertos: compras a preços diferentes, consumo de vários lotes,
  desempate FIFO, lotes esgotados, falta de lotes, prejuízo, desconto percentual,
  somas em centavos, mais de mil vendas e mais de mil lotes, recebimento posterior,
  exclusão de pendentes e custo unitário médio arredondado.
- Análise de código: sem erros, com nove avisos preexistentes de Fast Refresh.
- Build e verificação de tipos aprovados na validação principal.

## Implantação

Seguir o guia ACESSO-E-MANUTENCAO.md: revisar apenas estas alterações, preservar
as demais alterações locais, integrar no GitHub oficial, sincronizar no Lovable e
publicar. Não aplicar migrações antigas nem reconstruir o histórico para esta mudança.