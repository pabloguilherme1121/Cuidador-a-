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
