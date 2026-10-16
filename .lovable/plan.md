
# 🍺 Bebidas Manager - Sistema de Gestão de Vendas

> Plano inicial mantido como histórico. Para regras atuais, acessos e entregas
> publicadas, consultar `README.md`, `AGENTS.md` e `ACESSO-E-MANUTENCAO.md` na raiz.
> Vendas pendentes não geram caixa nem lucro recebido. O PIN bloqueia após 15
> minutos sem uso. O alerta de estoque da tela inicial foi removido. Conferir o
> comportamento atual antes de implementar novamente qualquer parte deste plano.

Um Micro-SaaS mobile-first com design dark mode futurista e verde neon para gestão completa de vendas de bebidas.

---

## 🎨 Design & Experiência

- **Dark mode** como padrão com cards modernos e sombras suaves
- **Verde neon** (#00ff88) como cor de destaque em botões, gráficos e indicadores
- **Interface mobile-first** otimizada para uso rápido no celular
- **Navegação por abas** na parte inferior (Dashboard, Vendas, Estoque, Financeiro, Relatórios)
- **Botão flutuante** "Nova Venda" sempre visível para acesso rápido
- **Feedback visual** com animações suaves e notificações toast

---

## 📱 Telas e Funcionalidades

### 1. Dashboard Principal
- Cards de KPIs: vendas do dia, vendas do mês, lucro total, saldo de caixa
- Alertas visuais de produtos com estoque baixo
- Gráfico de vendas com filtros (dia/semana/mês)
- Acesso rápido às principais ações

### 2. Gestão de Produtos
- Cadastro de bebidas com nome, categoria, preço de custo e preço de venda
- Cálculo automático do lucro unitário
- Controle de estoque atual e estoque mínimo
- Alertas se preço de venda for menor que custo
- Listagem com filtros e busca

### 3. Registro de Vendas
- Seleção rápida de produtos com quantidade
- Formas de pagamento: Dinheiro, PIX, Cartão
- Campo opcional para nome do cliente
- Ao confirmar: baixa automática do estoque e registro no caixa
- Bloqueio de venda se não houver estoque

### 4. Controle de Estoque
- Visão geral do estoque de todos os produtos
- Indicadores visuais de estoque crítico (vermelho) e baixo (amarelo)
- Entrada automática ao registrar compras
- Baixa automática ao registrar vendas

### 5. Registro de Compras
- Seleção de produto e quantidade
- Valor total e forma de pagamento
- Ao confirmar: atualiza estoque e registra saída no caixa

### 6. Clientes
- Cadastro simples apenas com nome
- Histórico de compras do cliente
- Listagem com busca

### 7. Fluxo de Caixa
- Visão de todas as entradas (vendas) e saídas (compras, despesas)
- Saldo em tempo real
- Filtros por período (hoje, semana, mês, personalizado)

### 8. Contas a Pagar
- Cadastro com descrição, valor e data de vencimento
- Status: Pago ou Pendente
- Alertas visuais para contas vencidas
- Marcar como pago com um toque

### 9. Módulo de Relatórios
Uma seção dedicada com relatórios detalhados:

- **Relatório de Vendas**: total vendido, quantidade, ticket médio, vendas por forma de pagamento
- **Relatório de Lucro**: lucro total, lucro por produto, margem de lucro %
- **Relatório de Estoque**: estoque atual, produtos críticos, produtos sem giro
- **Relatório Financeiro**: entradas x saídas, saldo por período, contas pagas/pendentes
- **Rankings**: produtos mais vendidos, mais lucrativos, categorias mais rentáveis

Todos com filtros por período e visualizações em gráficos elegantes.

---

## 🗄️ Banco de Dados (Lovable Cloud)

Tabelas principais:
- **products**: bebidas com preços, custos e estoque
- **sales**: registro de vendas com produtos e valores
- **sale_items**: itens de cada venda
- **customers**: cadastro de clientes
- **purchases**: registro de compras de estoque
- **cash_flow**: movimentações de caixa
- **bills**: contas a pagar

---

## 🚀 Pronto para Crescer

A estrutura será preparada para futuras expansões:
- Adição de autenticação multi-usuário
- Múltiplos pontos de venda
- Integração com sistemas de pagamento
- App instalável (PWA)
