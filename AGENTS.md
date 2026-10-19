# Orientação para manutenção deste projeto

- Ler `README.md` e `ACESSO-E-MANUTENCAO.md` antes de trabalhar.
- Pulse Drink Flow / Bebidas Manager aparece como Neon Ledger no Lovable,
  projeto `100a57a4-f2c4-405f-9b03-1990dc999d0b`.
- GitHub oficial: `petciabanhotosa-png/pulse-drink-flow`, branch `main`.
  Forks de contribuição não são a origem de produção.
- Backend: Supabase gerenciado pelo Lovable Cloud, referência
  `ivaydxuisdzpdvqmfxfo`. Confirmar o destino antes de operar.
- As quatro migrações de 16/10/2026 já foram aplicadas. Consultar o histórico
  real antes de criar migrações novas; não reaplicar migrações antigas em lote.
- Preservar dados existentes. Não criar vendas/pagamentos de teste em produção
  nem restaurar/limpar a base como parte de uma alteração de código.
- Venda pendente baixa estoque na criação, sem recebimento. Pagamento entra
  uma única vez no caixa, sem baixar estoque novamente. Indicadores de receita
  e lucro usam a data do recebimento, também para vendas antigas.
- Manter operações críticas atômicas; não substituir uma RPC com erro por
  gravações independentes que deixem a operação pela metade.
- Desde 19/10/2026, o PIN é solicitado ao iniciar uma nova sessão. Não bloquear
  por inatividade, recarga, troca de aba ou retorno do segundo plano enquanto
  a sessão permanecer aberta. Sair da conta remove o desbloqueio.
- Nunca incluir credenciais, PINs ou backups no repositório público.
- Validar o comportamento afetado e seguir GitHub → Lovable → publicação.
  Documentar mudanças de regras ou acessos no guia de manutenção.
