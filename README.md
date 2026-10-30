# Discovery Caatinga Go — Site institucional

Site estático responsivo. O HTML, CSS, JavaScript, imagens, vídeos e APK ficam juntos na raiz desta pasta.

## Como abrir
- Mantenha todos os arquivos juntos na mesma pasta. Para jogar, abra `index.html`; a arena e os adversários funcionam localmente sem conexão, inclusive em `file://`.
- Para instalar e ativar o cache offline, publique em HTTPS ou abra por `localhost` (por exemplo, com a extensão Live Server do VS Code) e carregue a página uma vez com conexão. Use a opção **Instalar aplicativo** do navegador. O navegador não permite Service Workers em `file://`; depois do primeiro cache, a página, o jogo, os estilos e as imagens funcionam sem internet.
## Arquivos
- `index.html`: conteúdo e seções do site.
- `style.css`, `memory-game.css`, `discovery-day.css`, `premium.css` e `snake-io.css`: estilos da página e dos jogos.
- `script.js`: interações da interface, acessibilidade, filtros e jogo da memória.
- `snake-io.js`: lógica local da arena, movimento, alimentos, colisões, bots e ranking.
- `service-worker.js`: cache offline para a página, o jogo, estilos e imagens.
- `manifest.webmanifest`, `logo.png` e `pwa-icon-512.png`: metadados e ícones para instalar o site como aplicativo.
- Imagens e vídeos (`logo.png`, arquivos de espécies, `demo-app.mp4` e `discovery.mp4`): recursos visuais referenciados diretamente na raiz.
- `discovery-caatinga-go.apk`: aplicativo Android para download.

Todos os caminhos locais no HTML e no JavaScript são relativos a esta pasta.

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
