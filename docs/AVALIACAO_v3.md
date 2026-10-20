# Auditoria Cuidador(a) v3 — 20/10/2026

## Principais riscos encontrados

- Navegação de cinco abas ocupava grid de quatro colunas; corrigido para seis colunas acessíveis incluindo Sala.
- Um backup JSON era a única transferência entre aparelhos; agora há sala opt-in cifrada por AES-GCM e identificadores aleatórios.
- Sons apenas por oscilador único e vibração ausente; agora há três padrões, volume e vibração opcional (dependentes de gesto/permissão/OS).
- Ausência de exclusão em lote de rotinas; adicionada confirmação específica, com histórico local preservado.
- Dependência de notificações enquanto app está aberto: NÃO corrigível só com PWA estático. O app não garante alarmes quando fechado.
- A antiga implantação Cloudflare Worker buscava arquivos estáticos de um commit fixado; v3 requer redeploy manual ao publicar novo commit, a menos que um pipeline com credenciais adequadas seja configurado.

## Sala de Pacientes — consentimento e segurança

- O app guarda link secreto apenas no dispositivo e na parte `#fragment` do URL compartilhado.
- Criptografia no navegador: AES-GCM 256-bit com nonce aleatório, autenticação vinculada ao ID da sala.
- O banco Cloudflare D1 armazena ID aleatório, hash do token de edição, nonce, ciphertext e versão.
- O servidor não recebe a chave de descriptografia nem nomes/dosagens em texto simples.
- **Quem recebe o link pode visualizar e editar tudo que está na sala**. O compartilhamento deve ser feito apenas com pessoas de confiança.
- Sala compartilha horários e preferências; nome, histórico de doses concluídas e alertas disparados ficam exclusivamente no dispositivo.
- Atualização otimista evita sobrescrever silenciosamente mudanças simultâneas. Conflitos precisam de escolha do usuário.
- Funciona offline com cópias locais; sincroniza quando o app é reaberto/está online. Mudanças conflitantes podem necessitar backup/importação.
- Excluir sala remove o ciphertext no banco, mas cópias em outros aparelhos e backups não são apagadas.
- Sem controle de identidade, registro de acesso ou recuperação de senha: link é uma chave compartilhada, não um sistema clínico com prontuário ou controle por cuidador.
- Não há garantia de acesso permanente: serviços gratuitos sujeitos a cotas diárias e eventual bloqueio quando excedidas.

## Critérios de aceite

- npm run build (testes de lógica/criptografia/API/pacote estático)
- Chromium smoke em 320/360/390/430/844, visual, navegação e overflow
- HTTPS real, GET/POST/PUT/DELETE no Worker + D1, teste de criptografia de ponta a ponta
- Testes Firefox/WebKit/Android físico recomendados antes de uso com medicamentos críticos
- Nunca compartilhar informações pessoais dos pacientes em logs, erros ou links de exemplo

## v3.1 — autorização e revogação

- Convite **somente leitura** dá chave criptográfica para ver os dados, mas **não** o segredo independente de edição. GET nas salas novas exige token de leitura. PUT e DELETE exigem token de edição.
- Convite **editor** pode alterar e revogar; o aplicativo impede que um visualizador modifique os horários compartilhados.
- O titular pode revogar **todos os convites**, criando uma sala nova e excluindo a antiga; isso não apaga cópias locais nem revoga pessoas individualmente.
- Salas v3 anteriores continuam acessíveis ao editor já vinculado naquele navegador. Convites antigos de duas partes entram em modo de visualização. A migração é por revogação e criação da nova sala.
- Atualização de esquema: coluna opcional `read_hash` na tabela `rooms`, preservando dados anteriores.
- Sem push web confiável em segundo plano, contas por pessoa, confirmação de leitura ou trilha auditável: limites explícitos.

## v3.2 — otimização incremental

- GET condicional retorna 304 apenas após autenticação por token, sem vazar conteúdo cifrado.
- Não consulta a sala em segundo plano quando a página não está visível; reconecta ao voltar ou ao ficar online.
- Mantém sinalizador de conflito após recarregar, impedindo PUTs repetidos que não poderiam vencer o controle de versão.
- Botão de substituir recebe e valida primeiro, preservando dados locais se houver erro na conexão.
- Atualiza a hora da última consulta bem-sucedida e indica status offline / pendente / conflito.
- A criptografia e o modelo de convite não mudaram; salas antigas preservadas.
