# Cuidador(a) 3.5 — PWA de rotinas e salas
Site: https://cuidadora-pwa.pabloguui21.workers.dev/ · Código público: https://github.com/pabloguilherme1121/Cuidador-a-

Organizador mobile-first de refeições, medicamentos e pausas, com histórico local, backup JSON, calendário ICS, timer, personalização e PWA offline. Salas opcionais sincronizam rotinas cifradas AES-GCM; links de leitura/edição têm capacidades distintas. Chat cifrado disponível para participantes.

## Escala gratuita
A Cloudflare Workers Free limita requisições a 100.000 por dia e o D1 Free tem quotas separadas de leitura/gravação. Os arquivos estáticos também passam pelo Worker. O app reduz requisições com sincronização da Sala a cada 4 minutos enquanto estiver visível, e chat adaptativo de 1 a 5 minutos com backoff e botão de atualização manual. **Milhares de usuários registrados ou instalados podem caber no plano; milhares simultâneos ou intensivos em chat não estão garantidos.** Veja docs/OPERACAO_ESCALA_FREE.md.

## Execução e testes
```bash
npm ci --ignore-scripts
npm run build
python tests/browser-smoke-local.py
python tests/browser-smoke.py
```
O Node 22 usa node:test. O CI executa build, testes e Chromium (incluindo PWA offline). A pasta dist/ é a única saída pública de arquivos estáticos.

## Publicação e limites
Hospedagem atual: Cloudflare Workers Free + D1, com arquivos fixados em SHA de commit GitHub. O deploy continua manual e deve preservar o binding CARE_ROOMS e ser validado em CI e HTTPS. Não há backend de contas individuais, auditoria por cuidador nem garantia de avisos com o aplicativo fechado. **Não usar como único alarme de medicamento crítico**.

[Privacidade](PRIVACIDADE.md) · [Segurança](SECURITY.md) · [Termos](TERMOS.md) · [Operação e escala](docs/OPERACAO_ESCALA_FREE.md)
