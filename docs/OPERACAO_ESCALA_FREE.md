# Cuidador(a) — operação profissional com orçamento zero (v3.6)

## Status e limites oficiais

Workers Free: **100.000 invocações por dia**, **10 ms de CPU por invocação**; D1 Free: **5 milhões de linhas lidas/dia**, **100.000 gravadas/dia** e **5 GB armazenados** (confirmar no painel e documentação oficial; sujeitos a mudanças). Ao atingir limite, a aplicação pode responder com erros até a renovação da cota. Não confundir 1 usuário com 1 requisição: abrir a página, pedir JS/CSS, atualizar sala e chat consomem requisições. O Worker serve arquivos estáticos e APIs; isso torna o limite da camada web especialmente importante. Cache do navegador reduz cargas repetidas, mas não garante orçamento no primeiro acesso.

## Orçamento aproximado (não é teste de carga)

Um participante que mantém o app visível por 1 h pode consultar a sala ~15 vezes (a cada 4 min) e o chat ~12–60 vezes dependendo de atualizações e atividade, além dos recursos estáticos e ações explícitas. **1.000 pessoas ativas por 1h** podem somar dezenas de milhares de requisições; 2.000 usuários ativos durante várias horas podem ultrapassar os limites Workers Free. Não prometer simultaneidade ilimitada nem uptime contratual em plano gratuito.

## Medidas aplicadas

- Sala: check automático de 45 s para **4 min**, além das verificações por retorno ao app, retomada da rede e alterações locais. GET mantém If-None-Match/304 após autenticação; não transfere carga cifrada quando igual.
- Chat: sai do polling fixo de 15 s; começa em 60 s, amplia gradualmente até 5 min sem novidades, usa backoff em falhas e até 15 min em 429. Botão **Atualizar mensagens** oferece acesso sob demanda. Polling fica restrito à aba Sala e ao app visível.
- Dados pessoais e conclusão ficam locais. Apenas rotinas escolhidas e mensagens cifradas vão ao servidor; não há upload automático de logs.
- Salas mantêm conflito otimista; não sobrescrevem alteração de outro aparelho silenciosamente.
- Worker bloqueia outras rotas estáticas, não publica segredos, e autoriza consulta/alteração de dados.

## Ações P0 antes de anunciar uso em larga escala

1. **Antiabuso reforçado**: a criação de salas tem limite de 8/15min e 32/dia por chave HMAC temporária de rede. Há risco de bloqueio em NAT e de evasão por IPs distribuídos; acompanhar 429, 403 e 5xx e considerar desafio anti-bot se houver abuso. O chat mantém 12 msgs/min/sala.
2. **Separar estáticos da API**: usar Cloudflare Pages / Workers Static Assets (sem intervenção Worker em cada asset), mantendo domínio ou preparando migração assistida de localStorage. Integrar Git CI/CD com rollback, sem publicar dados de saúde nos artefatos.
3. **Identidade e LGPD**: identificar operador, canal de atendimento, bases legais, retenção, revisão jurídica, registro de consentimento, recuperação e revogação individual antes de comercializar ou usar profissionalmente.
4. **SLO e observabilidade**: no painel Cloudflare, acompanhar requests/dia, erros e CPU; no D1 acompanhar linhas lidas/escritas e storage. Estabelecer alertas/limiares 50%, 75%, 90% do orçamento; validar mecanismo real sem ativar planos pagos.
5. **Prova de escala**: testes de carga controlados em *staging* e com orçamento de requisições, verificando percentis p95, falhas, duplicidade de mensagens, conflitos e consumo do banco. **Não** disparar milhares de requisições no site público Free.
6. **Aceite Android físico**: testar em aparelho real acesso offline, reinstalação, permissões, timer, som, bateria e limites de background; alarmes web não substituem alertas nativos.

## Playbook de incidente

- Caso chat ou D1 fique indisponível: manter rotinas e histórico local; não eliminar alterações não sincronizadas. Mostrar falha e oferecer exportação JSON local.
- Se um link vazar: revogar todos os convites e criar nova sala; avisar que aparelhos antigos podem manter cópias locais.
- Se houver falha após deploy: restaurar versão anterior do Worker pela Cloudflare. Sem deploy Git automático, sempre registrar SHA validado e URL de CI.
- Se cota diária estourar: consultas remotas podem falhar. Não afirmar que as salas estão atualizadas; manter uso offline. Aguardar renovação do Free em vez de ativar pagamento sem autorização.

## Fontes oficiais
https://developers.cloudflare.com/workers/platform/limits/
https://developers.cloudflare.com/d1/platform/pricing/

## Regras v3.6 e protocolo de aceite

- **Privacidade operacional:** nunca registrar conteúdo de mensagens, dados médicos, URLs de convite, cabeçalhos de autenticação, IP ou chaves criptográficas em `console.log`. Os logs de aplicação mostram apenas categoria da rota, método, status e tempo de execução; a telemetria padrão da Cloudflare pode registrar metadados HTTP, que precisam de revisão de retenção e acesso.
- **Segredo:** a variável secreta `ABUSE_SALT` deve permanecer configurada no Worker. Não está no Git, no bundle PWA ou no código; se ausente, a criação de salas falha com 503 e o resto do aplicativo permanece ativo. Não expor o valor em logs. O binding `CARE_ROOMS` precisa ser preservado em todos os deploys.
- **Retenção de throttling:** bucket de HMAC por janela; uma limpeza oportunista remove amostras expiradas em pequenos lotes durante criações futuras, e uma limpeza manual da D1 pode ser feita após incidentes. Não remover tabelas de `rooms` nem `room_messages` em procedimentos de limpeza de quotas.
- **Monitoramento gratuito:** Cloudflare → Workers & Pages → `cuidadora-pwa` → Observability: requests, invocations com erro, CPU p95 e 429; Cloudflare D1 → `cuidadora-rooms` → Metrics: linhas lidas, escritas e armazenamento. Revisar manualmente perto de 50%, 75% e 90% das cotas; não inferir alertas automáticos se não estiverem configurados.
- **Saúde:** `GET /api/health` responde `status: ok` quando o Worker atende; não verifica o D1 e não é um teste da saúde clínica. Os testes reais com dados fictícios comprovam leitura/escrita do D1 separadamente.
- **Modelo de orçamento:** `node scripts/capacity-model.mjs` gera projeções diárias com hipóteses explícitas, **não um benchmark**. No perfil padrão (30 min/dia, 50% de tela com sala, 20% com chat, uma consulta de chat a cada 3 min, 3 arquivos e 2 ações por pessoa), 3 mil usuários ativos/dia projetam 32.250 requisições; 10 mil projetam 107.500, acima da cota diária Workers Free. Arquivos estáticos também consomem invocações.
- **Teste de carga controlado:** começar em *staging*, com dados sintéticos, taxa e máximo de requisições definidos, nunca disparar 1.000+ acessos reais contra a produção gratuita. Registrar p95, CPU, D1 read/write, 429, 5xx, conflitos e disponibilidade antes de afirmar capacidade.
- **Rollback:** caso o deploy novo falhe, restaurar imediatamente a versão Cloudflare anterior registrada pelo ID de deployment; tabela `creation_quotas` é aditiva e pode permanecer sem afetar versões antigas. A publicação de arquivos estáticos exige SHA GitHub verificado.

**Aceite de segurança para produção:** nenhum segredo em Git, rotas privadas não cacheadas, criação excessiva resulta em 429 e `Retry-After`, falha de segredo resulta em 503 somente para criação de salas, não existem dados de pacientes em logs customizados, e o CI deve passar no SHA publicado.
