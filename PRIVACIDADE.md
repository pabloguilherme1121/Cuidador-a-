# Política de privacidade — Cuidador(a)

Última atualização: 20/10/2026.

**Responsável pelo aplicativo**: proprietário do projeto Cuidador(a). O responsável deve publicar identificação, endereço de contato e política revisada antes de lançamento profissional a terceiros.

## Dados tratados
O usuário pode fornecer voluntariamente nome, refeições, medicamentos, doses transcritas de prescrição, observações, horários e registro de conclusão. Esses dados podem revelar informações de saúde e merecem proteção reforçada.

## Onde ficam os dados
Por padrão, rotinas, perfil, histórico de conclusão, timer e preferências ficam no localStorage do navegador, sem criptografia local em repouso. **Ao habilitar uma Sala**, as rotinas e preferências são cifradas no navegador e guardadas na Cloudflare D1; as mensagens e apelidos do chat também são cifrados. O servidor recebe dados técnicos (identificadores, horários e conexões) e não deve receber conteúdo clínico em texto simples. Não há anúncios, analytics ou contas individuais nesta versão.

## Controle e exclusão
O usuário pode editar e excluir horários, apagar todos os dados em Ajustes e exportar backups JSON. Limpar os dados do navegador também apaga os registros. Arquivos exportados ficam sob o controle do usuário e não são excluídos automaticamente.

## Riscos e limitações
Qualquer pessoa com acesso ao perfil do navegador pode visualizar dados. O backup JSON e o calendário ICS não possuem criptografia própria. O navegador pode remover o armazenamento por políticas de dispositivo ou falta de espaço.

## Compartilhamento e retenção
Sem Sala, importação e exportação ocorrem localmente. Na Sala opcional há armazenamento remoto cifrado. Links podem ser repassados e cópias locais de outros aparelhos não são apagadas quando uma sala é excluída. Não há prazo automático de expiração definido.

## Base legal e contato
Antes de oferecer sincronização hospedada a terceiros, o operador deverá publicar identificação, canal de contato, bases legais aplicáveis (incluindo dados sensíveis sob a LGPD), política de retenção, acesso/correção/exclusão e encarregado quando necessário. Este texto descreve a implementação efetiva atual, não substitui avaliação jurídica.

**Hospedagem escolhida:** para reduzir o risco de outras aplicações com acesso ao mesmo `localStorage`, recomenda-se um domínio exclusivo `<projeto>.pages.dev` no Cloudflare Pages. A hospedagem entrega apenas arquivos estáticos; registros médicos da rotina não são enviados ao Cloudflare pelo código atual. O provedor de hospedagem pode registrar informações técnicas de acesso (por exemplo, IP), conforme suas políticas.

### Avisos e notificações da tela bloqueada

Por padrão, os avisos do sistema exibem apenas um lembrete genérico e o horário, **sem o nome nem a dose do medicamento**, para diminuir a divulgação acidental para terceiros próximos do aparelho. Você pode desativar essa proteção em Ajustes, se quiser. A mensagem exibida dentro do aplicativo contém os detalhes porque já está na tela do aplicativo. Os dados não são criptografados em repouso no armazenamento do navegador; proteja a tela e a conta do dispositivo.


## Sala de Pacientes (v3.1, opcional)

A Sala envia à Cloudflare D1 somente uma cópia **criptografada AES-GCM** das rotinas e preferências que você compartilha. Os nomes, as doses e os horários não são enviados ao servidor em texto simples. O histórico de conclusão e seu perfil pessoal continuam locais. O dispositivo armazena a chave de descriptografia e, se tiver autorização, um segredo de edição; eles aparecem apenas no fragmento `#` do convite, não na requisição HTTP ao servidor. O provedor de hospedagem pode processar metadados técnicos da conexão.

Agora há **dois convites**: visualização (permite consultar rotinas sem modificá-las no servidor) e edição (permite modificar e excluir). Ambos são confidenciais: quem possuir o link de leitura poderá conhecer horários e medicamentos. Os links não identificam usuários e não representam autorização individual de um paciente. É possível **revogar todos os convites**, criando uma nova sala criptografada com novos segredos e excluindo a anterior. Não é possível revogar apenas um aparelho sem trocar os links; quem salvou cópias locais pode mantê-las.

A sincronização depende da conexão, não é instantânea e alterações simultâneas podem exigir resolução manual. **Alarmes da web não são garantidos com o aplicativo fechado**. O app não substitui sistemas clínicos, a receita médica ou o calendário nativo do celular.

## Chat de Sala (3.4)

As mensagens enviadas ao chat das salas, incluindo o apelido escolhido, são cifradas no próprio aparelho. O servidor armazena exclusivamente identificador técnico, IV, conteúdo criptografado e horário de envio; não recebe as chaves contidas no fragmento do convite. Pessoas que recebem o link de leitura podem ver a conversa e pessoas com o link de edição podem postar e apagar todo o histórico. Não é possível controlar individualmente cada pessoa que tenha copiado um convite. A conversa é limitada às últimas 200 mensagens no servidor. Não use o chat para comunicação urgente sobre medicamentos. Apagar a sala remove também suas mensagens do servidor, mas não backups ou cópias já exportadas.
