# Discovery Caatinga Go — Site institucional

Site responsivo com arquivos estáticos e uma função serverless opcional para o assistente de IA.

## Como abrir
- Mantenha todos os arquivos juntos na mesma pasta. Para jogar, abra `index.html`; a arena e os adversários funcionam localmente sem conexão, inclusive em `file://`.
- Para instalar e ativar o cache offline, publique em HTTPS ou abra por `localhost` (por exemplo, com a extensão Live Server do VS Code) e carregue a página uma vez com conexão. Use a opção **Instalar aplicativo** do navegador. O navegador não permite Service Workers em `file://`; depois do primeiro cache, a página, o jogo, os estilos e as imagens funcionam sem internet.
- O assistente de IA precisa ser publicado na Vercel e configurado com as variáveis de ambiente indicadas abaixo. Ele não funciona ao abrir o HTML diretamente nem na publicação do GitHub Pages.
## Arquivos
- `index.html`: conteúdo e seções do site.
- `style.css`, `memory-game.css`, `discovery-day.css`, `premium.css` e `snake-io.css`: estilos da página e dos jogos.
- `script.js`: interações da interface, acessibilidade, filtros e jogo da memória.
- `snake-io.js`: lógica local da arena, movimento, alimentos, colisões, bots e ranking.
- `ai-chat.js` e `ai-chat.css`: interface do assistente de IA.
- `api/chat.js`: função serverless que encaminha as mensagens ao provedor sem expor a chave no navegador.
- `.env.example`: exemplo das variáveis necessárias; não contém uma chave válida.
- `service-worker.js`: cache offline para a página, o jogo, estilos e imagens.
- `manifest.webmanifest`, `logo.png` e `pwa-icon-512.png`: metadados e ícones para instalar o site como aplicativo.
- Imagens e vídeos (`logo.png`, arquivos de espécies, `demo-app.mp4` e `discovery.mp4`): recursos visuais referenciados diretamente na raiz.
- `discovery-caatinga-go.apk`: aplicativo Android para download.

Todos os caminhos locais no HTML e no JavaScript são relativos a esta pasta.

## Ativar o assistente de IA na Vercel
1. Importe este repositório na Vercel e publique a pasta raiz do projeto. A pasta `api` é detectada automaticamente como funções serverless; não é necessário criar um servidor separado.
2. No painel do projeto, abra **Settings → Environment Variables** e adicione:
   - `AI_API_KEY`: chave secreta fornecida pelo seu provedor.
   - `AI_MODEL`: identificador do modelo habilitado na sua conta.
   - `AI_API_URL` (opcional): URL HTTPS completa do endpoint de chat compatível com o formato OpenAI Chat Completions. Se omitida, será usada `https://api.openai.com/v1/chat/completions`.
3. Marque os ambientes desejados (Production e, se necessário, Preview), salve e faça um novo deploy para as variáveis entrarem em vigor.
4. Acesse o domínio da Vercel e teste **Pergunte à IA**. A publicação atual no GitHub Pages é apenas estática; para ativar o endpoint, use o endereço da Vercel ou configure seu domínio para apontar para ela.

O nome e o formato do modelo e do endpoint dependem do provedor. Use um serviço compatível com Chat Completions e configure o endpoint completo em `AI_API_URL`; não coloque a chave no HTML, JavaScript, GitHub ou em mensagens públicas. Se a chave já tiver sido compartilhada, revogue-a e crie outra. Para desenvolvimento local, copie `.env.example` para `.env.local`, preencha os valores e use a Vercel CLI (`vercel dev`).

O endpoint limita cada pergunta a 1.200 caracteres, aceita até oito mensagens de contexto e define um limite de resposta. Antes de gerar uma resposta, a IA classifica se a pergunta está relacionada ao site ou ao bioma Caatinga; solicitações fora do tema recebem uma recusa educada, e esse contexto não é enviado nas perguntas seguintes. A classificação é feita pelo próprio modelo e ajuda a orientar o comportamento, mas não é um filtro determinístico. Como a rota é pública e cada pergunta dentro do escopo gera uma chamada de classificação e outra de resposta, configure também limites de uso e monitoramento do provedor/Vercel antes de divulgar amplamente o site; esses controles variam conforme o plano e o provedor.

## Jogos
- Jogo da memória: encontre os oito pares de espécies.
- Cobra da Caatinga: a partida começa ao selecionar **JOGAR**, com 10 adversários controlados por IA local. Escolha entre cascavel, jiboia e coral, informe seu nome e selecione a dificuldade.
- Mire com o mouse; use setas ou W, A, S e D, arraste na arena ou toque nos controles móveis para mudar a direção. Colete frutos para pontuar e crescer, evite os corpos e as bordas, acompanhe o ranking e pause ou reinicie quando quiser. Cobra eliminada deixa alimentos.
- Recorde e aparência da cobra ficam salvos no navegador. Nenhuma lógica ou recurso de rede é usado pela partida. A IA, o mapa, os alimentos e as colisões são executados localmente.
- O cache offline não inclui os vídeos (`demo-app.mp4` e `discovery.mp4`) nem o APK, para evitar o download automático de dezenas de megabytes.

## Atualizar vídeos
- `demo-app.mp4` é o vídeo da área de destaque.
- `discovery.mp4` é o vídeo demonstrativo da seção “Veja na prática”.

Para trocar um vídeo, substitua o arquivo correspondente na raiz mantendo o mesmo nome e extensão; depois recarregue a página.

## Personalizações futuras
- Atualize dados dos desenvolvedores, orientador e instituição se necessário.
- Adicione o endereço oficial de distribuição do aplicativo quando existir.
- Revise o conteúdo técnico quando houver mudanças no aplicativo.
- A galeria de biodiversidade apresenta cartões demonstrativos com imagens do pacote Android; ela não representa todas as telas do app.

## Observações
- O site é estático e não tem login nem coleta intencional de dados.
- O conteúdo sobre espécies é introdutório e educativo.
- As opções de acessibilidade incluem ampliação do texto, alto contraste, atalho para o conteúdo e leitura em voz alta pela síntese de fala disponível no navegador.
- O vídeo oficial e links de contato/distribuição não foram fornecidos, portanto não foram inventados.
