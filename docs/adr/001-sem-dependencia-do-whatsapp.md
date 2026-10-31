# ADR-001: Núcleo sem dependência do WhatsApp

**Status:** aceito

## Contexto
O plano inicial usava bot de WhatsApp (Baileys, não oficial). Isso viola os termos da Meta, pode causar banimento do número e é arriscado para um produto vendido a terceiros. A API oficial tem custo por mensagem iniciada pela empresa.

## Decisão
O cliente agenda por **link web**. Confirmação, cancelamento e reagendamento acontecem por **link secreto**. O barbeiro é notificado por **PWA + Web Push** (gratuito). O WhatsApp vira canal **opcional**, via `wa.me` (iniciado pelo cliente/barbeiro) e, no futuro, API oficial atrás de uma interface `MessagingProvider`.

## Consequências
- (+) Sem risco de ban, sem custo, sem sessão que cai.
- (−) Identidade do telefone não é verificada: mitigada com captcha (Turnstile), rate limit, limite de agendamentos ativos e bloqueio de números.
