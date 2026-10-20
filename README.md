# Cuidador(a) 3.6 — PWA de rotinas, salas e chat

**Publicação vigente:** https://cuidadora-pwa.pabloguui21.workers.dev/ · **Código:** https://github.com/pabloguilherme1121/Cuidador-a- 

Aplicativo gratuito mobile-first para organizar refeições, medicamentos, pausas e comunicação entre cuidadores. A rotina funciona offline após a instalação. A Sala de Pacientes e o chat são opcionais e exigem conexão.

## Recursos

- Refeições e medicamentos com dias/horários, edição e exclusão em Rotina ou diretamente na linha do tempo Hoje; filtros por tipo e situação, busca e histórico local de conclusão.
- Timer persistente entre recargas, sons selecionáveis, vibração quando suportada, temas claro/escuro e paletas configuráveis.
- Sala com convites de **leitura ou edição**; rotinas e preferências cifradas AES-GCM antes de serem enviadas à Cloudflare D1.
- Chat da Sala com conteúdo cifrado e permissões de acesso; histórico limitado a 200 mensagens por sala. Não serve para urgências.
- Dados de histórico de conclusão e perfil permanecem locais. Backups JSON e calendários ICS podem ser exportados.
- Lembretes da Web somente enquanto o aplicativo estiver ativo; com o aplicativo fechado **não existe alarme garantido**. Use também os alarmes/calendário do telefone para medicações críticas.

## Escala gratuita e confiabilidade

A versão 3.6 adiciona um controle por janelas de criação de salas: 8 criações por 15 minutos e 32 por dia para uma identidade de rede temporária protegida por HMAC, armazenada sem IP bruto. Em caso de limite a API responde 429 e `Retry-After`; se a proteção estiver desconfigurada, novas salas falham de forma segura, sem bloquear rotinas locais. Isso reduz abuso simples, mas **não elimina ataques distribuídos** ou falsos positivos de redes compartilhadas. O endpoint `GET /api/health` informa versão do Worker sem consultar ou expor dados do D1. Logs personalizados amostram sucessos e registram 429/5xx por categoria de rota sem tokens, IDs ou texto de pacientes. Os logs da própria plataforma exigem revisão separada.



O plano gratuito da Cloudflare Workers impõe cotas, incluindo **100 mil requisições/dia**; D1 limita linhas lidas e escritas. Muitos usuários com chat aberto podem ultrapassar esse teto. As verificações de Sala agora ocorrem a cada 4 minutos, e o chat usa intervalo adaptativo de 1 a 5 minutos, com botão para atualização manual e backoff de falhas. O aplicativo não é chat em tempo real garantido. Não existe SLO ou garantia de disponibilidade para milhares de usuários simultâneos. Veja [operação e escala](docs/OPERACAO_ESCALA_FREE.md) antes de divulgar amplamente.

## Instalação e testes

```bash
npm ci --ignore-scripts
npm run build
python tests/browser-smoke-local.py
python tests/browser-smoke.py
```

O projeto usa ES modules nativos e testes `node:test`, sem dependências externas de runtime. Browser smoke exige Playwright e Chromium. O build publica somente os arquivos permitidos em `dist/`. A suíte HTTP real e testes offline executam no CI GitHub, pois alguns ambientes bloqueiam navegação ao servidor local.

## Publicação e operação

Hospedagem: Cloudflare Workers Free + D1 (não é Cloudflare Pages). O Worker serve arquivos de um commit GitHub fixado e oferece a API de Salas/Chat. O **deploy NÃO é automático**: novos commits precisam passar pelo CI e, depois, o Worker deve ser implantado fixando o SHA aprovado. A publicação manual deve preservar o binding D1 e ser seguida de testes HTTPS e integração.

Documentação:
- [Operação, limites e riscos do plano gratuito](docs/OPERACAO_ESCALA_FREE.md)
- [Privacidade](PRIVACIDADE.md)
- [Segurança](SECURITY.md)
- [Termos](TERMOS.md)

## Limitações para uso profissional

Salas são protegidas por *links-capacidade*, não por contas individuais. Não há identificação verificada de quem editou uma rotina, trilha de auditoria por pessoa, moderação, recuperação segura de chaves perdidas, nem revogação de uma única pessoa. Não há garantias de alarmes em segundo plano, nem verificação regulatória para administração médica. Antes de utilização clínica ou divulgação pública ampla são necessárias identificação do operador, canal de atendimento, controles de abuso, revisão LGPD, testes Android físico e ensaios de carga controlados. Nenhum dado real de pacientes deve aparecer no repositório público.
