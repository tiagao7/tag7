# TAg7

Agendamento online para barbearias e salões. O cliente agenda por um link, sem instalar nada e **sem depender do WhatsApp**; o barbeiro acompanha a agenda em tempo real pelo celular (PWA).

> Código disponível para estudo e uso não comercial ([PolyForm Noncommercial 1.0.0](LICENSE)). Uso comercial: entre em contato.

![CI](https://github.com/SEU-USUARIO/tag7/actions/workflows/ci.yml/badge.svg)

## Status

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Monorepo, CI, licença, ADRs | ✅ |
| 1 | `@tag7/core`: horários livres, conflitos, políticas, tokens | ✅ |
| 2 | API (Cloudflare Workers + D1) e página pública de agendamento | ⏳ |
| 3 | PWA do barbeiro: agenda, tempo real, Web Push | ⏳ |
| 4 | Configurações do salão, login seguro, backup | ⏳ |
| 5 | Licença, multi-salão, módulo WhatsApp opcional | ⏳ |

## Como funciona

1. O salão divulga um link (`/<slug-do-salao>`) no Instagram, QR code ou Google Meu Negócio.
2. O cliente escolhe serviço, dia (hoje, D+1, D+2...) e horário **realmente livre**.
3. Recebe um **link secreto** para cancelar ou reagendar, sem login.
4. O barbeiro vê tudo na agenda do celular, com atualização em tempo real.

## Arquitetura

```
apps/api         Cloudflare Worker (Hono) + D1 (SQLite)      [fase 2]
apps/web         PWA: página do cliente + agenda do barbeiro [fases 2-3]
packages/core    Regras de negócio puras em TypeScript (testadas)
docs/adr         Decisões de arquitetura
```

O `core` não depende de framework nem de I/O: recebe dados e devolve horários livres. Isso o torna testável e reutilizável na API e no front.

### Decisões de engenharia

- **Concorrência:** a regra de conflito roda dentro de transação e há um índice único parcial no banco (`uq_active_slot`) como última defesa contra duplo agendamento.
- **Fuso horário:** tudo em UTC no banco; conversão para o fuso do salão via `Intl`, sem bibliotecas.
- **Link de gerenciar:** token de 256 bits; só o **hash** (SHA-256) é armazenado.
- **Multi-tenant:** toda tabela tem `shop_id`; regras por salão (jornada, pausa, antecedência, folga, prazo de cancelamento).
- **LGPD:** só nome e telefone, com registro de consentimento e trilha de auditoria.

## Rodando

Requisitos: Node 20+.

```bash
npm install
npm test          # 25 testes do core
npm run typecheck
```

## Segurança

Segredos ficam fora do Git (`.env.example` documenta as variáveis). A chave privada de licenças nunca entra no repositório; o código só carrega a chave pública de verificação.

## Licença

[PolyForm Noncommercial 1.0.0](LICENSE). Não é "open source" no sentido formal: é *source-available*.
