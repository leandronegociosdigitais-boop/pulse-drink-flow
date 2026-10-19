# Pulse Drink Flow — gestão de vendas de bebidas

Aplicativo em produção, também identificado como **Bebidas Manager** na interface
e **Neon Ledger** no painel do Lovable.

## Onde acessar

| Recurso | Endereço / identificação |
| --- | --- |
| Aplicativo publicado | https://pulse-drink-flow.lovable.app |
| Projeto no Lovable | https://lovable.dev/projects/100a57a4-f2c4-405f-9b03-1990dc999d0b |
| Workspace / proprietário no Lovable | Petcia's Lovable / Petcia Banhotosa |
| GitHub oficial | https://github.com/petciabanhotosa-png/pulse-drink-flow |
| Branch de produção | `main` |
| Banco | Supabase gerenciado pelo **Lovable Cloud**, referência `ivaydxuisdzpdvqmfxfo` |

**Comece por [ACESSO-E-MANUTENCAO.md](ACESSO-E-MANUTENCAO.md)** antes de alterar,
publicar ou trabalhar no banco. O guia explica os acessos, o estado da entrega,
as regras de negócio e a manutenção com preservação dos dados.

## Estado atualizado em 19/10/2026

- Correções de integridade, seis ajustes, parcelamento, login e proteção do banco:
  [PR #5](https://github.com/petciabanhotosa-png/pulse-drink-flow/pull/5), integrado e publicado.
- PIN mantém acesso durante o mesmo login no aparelho, inclusive se o Android
  recriar a janela ao trocar de app. Não bloqueia por inatividade ou recarga;
  sair da conta ou iniciar outro login exige o PIN. Esta regra substitui o prazo de 15 minutos
  instalado inicialmente pelo [PR #6](https://github.com/petciabanhotosa-png/pulse-drink-flow/pull/6).
- Indicadores e lucro contam somente vendas pagas, na data do recebimento:
  [PR #7](https://github.com/petciabanhotosa-png/pulse-drink-flow/pull/7), integrado e publicado.
- As quatro migrações de 16/10/2026 já foram aplicadas no banco de produção.
  **Não reaplicar a instalação inicial.** Os dados existentes foram preservados.

Detalhes em [CORRECOES-2026-10-16.md](CORRECOES-2026-10-16.md).

## Aplicativo instalado sem receber atualizações

O topo da tela mostra a versão carregada e o botão **Atualizar app**. Para uma
instalação antiga sem esse botão, abrir no mesmo aparelho:
https://pulse-drink-flow.lovable.app/api/atualizar.html

A recuperação exige internet, confirma a versão publicada e troca somente os
arquivos offline do aplicativo. Login, PIN e dados comerciais não são apagados.
Salvar formulários em andamento antes de atualizar. Não limpar os dados do site.

## Desenvolvimento local

Stack: React 18, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query,
Supabase e PWA.

```sh
git clone https://github.com/petciabanhotosa-png/pulse-drink-flow.git
cd pulse-drink-flow
npm ci
npm run dev
```

O servidor local usa a porta `8080`. Confira [.env.example](.env.example) e o
backend configurado antes de testar gravações: executar localmente não cria um
banco separado.

```sh
npm test
npm run lint
npm run build
```

A publicação é feita no **Publish** do projeto correto no Lovable, após conferir
a integração da alteração na `main` do GitHub oficial.
