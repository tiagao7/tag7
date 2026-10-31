# ADR-002: Hospedagem e licenciamento

**Status:** aceito

## Hospedagem
Celular como servidor foi descartado: CGNAT, Android encerrando processos em segundo plano e dependência de bateria/rede inviabilizam um link público estável. **Backend na camada gratuita da Cloudflare (Workers + D1)**; o celular do barbeiro é o cliente (PWA). Desenvolvimento 100% local com Wrangler.

## Licenciamento
Repositório público sob **PolyForm Noncommercial 1.0.0**: o código pode ser lido e avaliado (portfólio), mas o uso comercial exige autorização. Chave privada de licenças fica fora do repositório. Revisar com advogado antes de vender.
