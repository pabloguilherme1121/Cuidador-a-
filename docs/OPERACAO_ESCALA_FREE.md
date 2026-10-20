# Operação e escala — Cuidador(a) v3.5

**Infraestrutura em uso**: Cloudflare Workers Free + D1. O Worker serve assets e endpoints privados de Sala e Chat. GitHub Actions testa o código; a publicação no Worker ainda é manual, fixada em SHA imutável.

## Limites de quota
- Workers Free: 100.000 requisições diárias e CPU de 10 ms por invocação.
- D1 Free: 5 milhões de linhas lidas/dia, 100.000 gravadas/dia, 5 GB de armazenamento.
- Fonte: https://developers.cloudflare.com/workers/platform/limits/ e https://developers.cloudflare.com/d1/platform/pricing/
- Exceder cotas pode interromper operações remotas até a renovação diária. Não ativar planos pagos sem autorização.

## Otimizações da v3.5
- Sala: intervalo de 45 segundos para quatro minutos. Atualização também ao voltar ao app, retomar conexão, editar ou pressionar Sincronizar.
- Chat: polling adaptativo de 1–5 min, backoff quando offline/erro e 15 min em 429; botão Atualizar mensagens.
- GET de rotinas usa autorização e ETag/304 quando a versão remota não mudou; sem transmissão dos dados clínicos em claro.
- Histórico e registros de conclusão são locais. Dados conflitantes não são sobrescritos automaticamente.
- Correção da mensagem Hoje, separando atrasos e pendências de cuidados concluídos.

## Planejamento de capacidade
1.000 participantes com 1h de uso ativo podem realizar aproximadamente 15.000 consultas de rotina e entre 12.000 e 60.000 consultas de chat, além dos downloads de recursos e ações manuais. O limite diário pode ser consumido rapidamente; números são estimativas, não benchmarks. Evitar 1.000 conexões permanentes sem dimensionamento real.

## Riscos P0 para uso amplo/profissional
1. Proteção antiabuso de criação de salas e API para não esgotar a cota (o limite por sala no chat não basta).
2. Migrar estáticos para Workers Static Assets/Pages e manter as URLs/dados locais via plano de migração assistida.
3. CI/CD automático seguro com rollback; branch protection, revisão e monitoramento.
4. Definir responsável legal, contato LGPD, retenção, identidade de cuidadores, auditoria por pessoa e revogação individual.
5. Medir Workers requests/erros/CPU e D1 rows/storage; alertar em 50%, 75%, 90% do consumo.
6. Ensaios de carga pequenos e controlados em staging e teste Android físico. Nunca gerar carga massiva no Worker gratuito público.
7. Alarmes Web não são garantidos com app fechado. Recomendar alarmes nativos para medicamentos de risco.

## Incidente e indisponibilidade
Preservar rotinas e histórico locais. Exibir falha ao sincronizar; jamais informar sincronização concluída sem resposta válida. Usuários podem gerar backup JSON. Se convite vazar, revogar a sala e distribuir novo link; cópias antigas nos celulares não podem ser revogadas. Se cota estourar, aguardar reset em vez de contratar plano pago sem autorização.
