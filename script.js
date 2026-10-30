const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
$("#year").textContent=new Date().getFullYear();

const introStrip=$(".intro-strip"),introStripTrack=$(".intro-strip-inner");
function updateIntroStripMotion(){
 introStripTrack.style.animationPlayState=introStrip.matches(":hover")||introStrip.contains(document.activeElement)?"paused":"running";
}
introStrip.addEventListener("pointerenter",updateIntroStripMotion);
introStrip.addEventListener("pointerleave",updateIntroStripMotion);
introStrip.addEventListener("focusin",updateIntroStripMotion);
introStrip.addEventListener("focusout",updateIntroStripMotion);

// Persist the visitor's theme choice between visits.
const themeToggle=$("#themeToggle"),themeColor=$('meta[name="theme-color"]');
function applyTheme(theme){
 const isDark=theme==="dark";
 document.documentElement.dataset.theme=isDark?"dark":"light";
 themeToggle.setAttribute("aria-pressed",String(isDark));
 themeToggle.setAttribute("aria-label",isDark?"Ativar tema claro":"Ativar tema escuro");
 $(".theme-toggle-icon",themeToggle).textContent=isDark?"☀":"☾";
 $(".theme-toggle-label",themeToggle).textContent=isDark?"Tema claro":"Tema escuro";
 themeColor.content=isDark?"#111b16":"#152e23";
}
const savedTheme=localStorage.getItem("discovery-caatinga-theme");
applyTheme(savedTheme==="dark"?"dark":"light");
themeToggle.addEventListener("click",()=>{
 const nextTheme=document.documentElement.dataset.theme==="dark"?"light":"dark";
 applyTheme(nextTheme);
 localStorage.setItem("discovery-caatinga-theme",nextTheme);
});

// Persist accessible text sizing and contrast preferences.
const accessibilityRoot=document.documentElement;
const textSizeLevels=["normal","large","larger"];
const textSizeLabels={normal:"Texto padrão",large:"Texto ampliado",larger:"Texto extra grande"};
const textScaleFactors={normal:1,large:1.15,larger:1.3};
const textScaleSelector="h1,h2,h3,h4,p,a,button,input,textarea,label,small,strong,b,li,dt,dd,figcaption,.eyebrow,.section-note,.team-social";
const textSizeBaselines=new WeakMap();
const textSizeLabel=$("#textSizeLabel"),contrastToggle=$("#contrastToggle");
function scaleTextElements(root=document.body){
 const elements=[];
 if(root instanceof Element&&root.matches(textScaleSelector))elements.push(root);
 if(root.querySelectorAll)elements.push(...root.querySelectorAll(textScaleSelector));
 const factor=textScaleFactors[accessibilityRoot.dataset.textSize]||1;
 elements.forEach(element=>{
  if(!textSizeBaselines.has(element)){
   textSizeBaselines.set(element,parseFloat(getComputedStyle(element).fontSize));
  }
  const baseline=textSizeBaselines.get(element);
  if(factor===1)element.style.removeProperty("font-size");
  else element.style.fontSize=`${baseline*factor}px`;
 });
}
function applyTextSize(size){
 const normalizedSize=textSizeLevels.includes(size)?size:"normal";
 scaleTextElements();
 accessibilityRoot.dataset.textSize=normalizedSize;
 scaleTextElements();
 textSizeLabel.textContent=textSizeLabels[normalizedSize];
 localStorage.setItem("discovery-caatinga-text-size",normalizedSize);
}
function applyHighContrast(enabled){
 accessibilityRoot.dataset.highContrast=String(enabled);
 contrastToggle.setAttribute("aria-pressed",String(enabled));
 contrastToggle.textContent=enabled?"Desativar alto contraste":"Ativar alto contraste";
 localStorage.setItem("discovery-caatinga-high-contrast",String(enabled));
}
applyTextSize(localStorage.getItem("discovery-caatinga-text-size"));
applyHighContrast(localStorage.getItem("discovery-caatinga-high-contrast")==="true");
new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
 if(node instanceof Element)scaleTextElements(node);
}))).observe(document.body,{childList:true,subtree:true});
$("#textSmaller").addEventListener("click",()=>{
 const current=textSizeLevels.indexOf(accessibilityRoot.dataset.textSize);
 applyTextSize(textSizeLevels[Math.max(0,current-1)]);
});
$("#textLarger").addEventListener("click",()=>{
 const current=textSizeLevels.indexOf(accessibilityRoot.dataset.textSize);
 applyTextSize(textSizeLevels[Math.min(textSizeLevels.length-1,current+1)]);
});
$("#textReset").addEventListener("click",()=>applyTextSize("normal"));
contrastToggle.addEventListener("click",()=>{
 applyHighContrast(accessibilityRoot.dataset.highContrast!=="true");
});

// Read the main content aloud with the browser's built-in speech synthesis.
const readPageButton=$("#readPage"),stopReadingButton=$("#stopReading"),voiceStatus=$("#voiceStatus");
const speechSynthesisApi=window.speechSynthesis;
let speechChunks=[],speechChunkIndex=0;
function setReadingState(isReading,message){
 readPageButton.disabled=isReading;
 stopReadingButton.disabled=!isReading;
 voiceStatus.textContent=message;
}
function splitSpeechText(text,maxLength=220){
 const sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)||[text];
 const chunks=[];
 let chunk="";
 sentences.forEach(sentence=>{
  const trimmed=sentence.trim();
  if(!trimmed)return;
  if(chunk&&(chunk.length+trimmed.length+1)>maxLength){
   chunks.push(chunk);
   chunk="";
  }
  if(trimmed.length>maxLength){
   if(chunk){
    chunks.push(chunk);
    chunk="";
   }
   const words=trimmed.split(/\s+/);
   words.forEach(word=>{
    if(chunk&&(chunk.length+word.length+1)>maxLength){
     chunks.push(chunk);
     chunk="";
    }
    chunk=chunk?`${chunk} ${word}`:word;
   });
  }else{
   chunk=chunk?`${chunk} ${trimmed}`:trimmed;
  }
 });
 if(chunk)chunks.push(chunk);
 return chunks;
}
function speakNextChunk(){
 if(speechChunkIndex>=speechChunks.length){
  setReadingState(false,"Leitura concluída.");
  return;
 }
 const utterance=new SpeechSynthesisUtterance(speechChunks[speechChunkIndex]);
 utterance.lang="pt-BR";
 const voices=speechSynthesisApi.getVoices();
 utterance.voice=voices.find(voice=>voice.lang.toLowerCase()==="pt-br")
  ||voices.find(voice=>voice.lang.toLowerCase().startsWith("pt"))
  ||null;
 utterance.onend=()=>{
  speechChunkIndex++;
  speakNextChunk();
 };
 utterance.onerror=event=>{
  if(event.error==="canceled"||event.error==="interrupted")return;
  speechSynthesisApi.cancel();
  setReadingState(false,"Não foi possível reproduzir a leitura. Verifique as configurações de voz do navegador.");
 };
 speechSynthesisApi.speak(utterance);
}
if(!("speechSynthesis"in window)||!("SpeechSynthesisUtterance"in window)){
 readPageButton.disabled=true;
 stopReadingButton.disabled=true;
 voiceStatus.textContent="Leitura em voz alta não disponível neste navegador.";
}else{
 readPageButton.addEventListener("click",()=>{
  const content=$("#main-content").innerText.replace(/\s+/g," ").trim();
  if(!content){
   voiceStatus.textContent="Não há conteúdo disponível para leitura.";
   return;
  }
  speechSynthesisApi.cancel();
  speechChunks=splitSpeechText(content);
  speechChunkIndex=0;
  setReadingState(true,"Leitura em andamento. Use “Parar” para interromper.");
  speakNextChunk();
 });
 stopReadingButton.addEventListener("click",()=>{
  speechChunks=[];
  speechChunkIndex=0;
  speechSynthesisApi.cancel();
  setReadingState(false,"Leitura interrompida.");
 });
}

// Mobile navigation
const nav=$("#mainNav"),menuToggle=$("#menuToggle");
menuToggle.addEventListener("click",()=>{const opened=nav.classList.toggle("open");menuToggle.setAttribute("aria-expanded",String(opened));menuToggle.setAttribute("aria-label",opened?"Fechar menu":"Abrir menu")});
$$(".main-nav a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menuToggle.setAttribute("aria-expanded","false")}));

// Keep the navigation aligned with the section currently in view.
const navSections=$$(".main-nav a[href^='#']").map(link=>$(link.getAttribute("href"))).filter(Boolean);
if("IntersectionObserver"in window){
 const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  $$(".main-nav a[href^='#']").forEach(link=>{
   if(link.getAttribute("href")==="#"+entry.target.id)link.setAttribute("aria-current","location");
   else link.removeAttribute("aria-current");
  });
 }),{rootMargin:"-35% 0px -55% 0px"});
 navSections.forEach(section=>sectionObserver.observe(section));
}

// Reading progress indicator
function updateReading(){const max=document.documentElement.scrollHeight-innerHeight;$("#progressLine").style.width=(max>0?scrollY/max*100:0)+"%"}
addEventListener("scroll",updateReading,{passive:true});updateReading();

// Reveal animations, with reduced-motion fallback
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
if("IntersectionObserver"in window&&!reduced){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target)}}),{threshold:.11});$$(".reveal").forEach(el=>observer.observe(el))}
else $$(".reveal").forEach(el=>el.classList.add("visible"));

// Animate factual highlights when they enter the viewport.
const impactCounts=$$("[data-count]");
function animateImpactCount(element){
 const target=Number(element.dataset.count);
 if(!Number.isFinite(target))return;
 if(reduced){element.textContent=String(target).padStart(2,"0");return}
 let startTime;
 function tick(time){
  if(startTime===undefined)startTime=time;
  const progress=Math.min((time-startTime)/900,1);
  const eased=1-Math.pow(1-progress,3);
  element.textContent=String(Math.round(target*eased)).padStart(2,"0");
  if(progress<1)requestAnimationFrame(tick);
 }
 requestAnimationFrame(tick);
}
if("IntersectionObserver"in window){
 const impactObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){
   animateImpactCount(entry.target);
   impactObserver.unobserve(entry.target);
  }
 }),{threshold:.6});
 impactCounts.forEach(element=>impactObserver.observe(element));
}else impactCounts.forEach(animateImpactCount);

// Interactive feature switcher
const featureData=[
 {number:"01",title:"Cada espécie guarda\numa descoberta.",text:"Navegue pelo catálogo, explore categorias e encontre informações sobre plantas, animais, aves e répteis. A busca ajuda você a chegar mais rápido ao que deseja conhecer.",bullets:["Explore por categorias","Pesquise espécies pelo nome","Conheça características e curiosidades"],image:"mandacaru.webp",alt:"Mandacaru no ambiente da Caatinga"},
 {number:"02",title:"Aprender também\npode ser uma aventura.",text:"A área de aprendizagem reúne módulos e lições educativas. Depois, os quizzes ajudam a revisar ideias e transformar estudo em uma experiência ativa.",bullets:["Acesse os módulos disponíveis","Leia as lições no seu ritmo","Pratique com quizzes"],image:"mod-adaptacoes.jpg",alt:"Conteúdo de aprendizagem sobre adaptações"},
 {number:"03",title:"Guarde aquilo que\nchamou sua atenção.",text:"Com os favoritos, você pode salvar espécies que deseja rever e criar um caminho pessoal pelas descobertas do catálogo.",bullets:["Marque espécies como favoritas","Reencontre os itens salvos","Organize suas descobertas"],image:"tatu-bola.webp",alt:"Tatu-bola, exemplo de espécie para explorar"},
];
let featureIndex=0;
function setFeature(index){featureIndex=(index+featureData.length)%featureData.length;const f=featureData[featureIndex],img=$("#featureImage img");img.style.opacity="0";setTimeout(()=>{img.src=f.image;img.alt=f.alt;img.onload=()=>img.style.opacity="1";if(img.complete)img.style.opacity="1"},120);$("#featureNumber").textContent=f.number;$("#featureTitle").textContent=f.title;$("#featureText").textContent=f.text;$("#featureBullets").innerHTML=f.bullets.map(x=>`<li>${x}</li>`).join("");$(".image-count").innerHTML=f.number+` <span>/ ${String(featureData.length).padStart(2,"0")}</span>`;$$(".feature-tab").forEach((b,i)=>{b.classList.toggle("active",i===featureIndex);b.setAttribute("aria-selected",String(i===featureIndex))});$$("#featureDots button").forEach((b,i)=>b.classList.toggle("active",i===featureIndex))}
$$(".feature-tab").forEach((b,i)=>b.addEventListener("click",()=>setFeature(i)));
$("#nextFeature").addEventListener("click",()=>setFeature(featureIndex+1));
$$("#featureDots button").forEach((b,i)=>b.addEventListener("click",()=>setFeature(i)));

// Biodiversity cards: search and category filtering
let activeFilter="Todas";const cards=$$(".species-card");
function filterSpecies(){const q=$("#speciesSearch").value.trim().toLocaleLowerCase("pt-BR");let count=0;cards.forEach(card=>{const matchKind=activeFilter==="Todas"||card.dataset.kind===activeFilter;const matchText=(card.dataset.name+" "+card.dataset.scientific).toLocaleLowerCase("pt-BR").includes(q);const show=matchKind&&matchText;card.hidden=!show;if(show)count++});$("#noResults").hidden=count>0}
$$(".filter").forEach(btn=>btn.addEventListener("click",()=>{activeFilter=btn.dataset.filter;$$(".filter").forEach(x=>x.classList.toggle("active",x===btn));filterSpecies()}));
$("#speciesSearch").addEventListener("input",filterSpecies);

// Species details dialog
const modal=$("#speciesModal");
function showSpecies(card){$("#modalImage").src=card.dataset.image;$("#modalImage").alt=card.dataset.name;$("#modalTitle").textContent=card.dataset.name;$("#modalScientific").textContent=card.dataset.scientific;$("#modalAbout").textContent=card.dataset.about;$("#modalKind").textContent=card.dataset.kind.toUpperCase();modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("locked");$(".modal-close").focus()}
function closeSpecies(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("locked")}
cards.forEach(card=>card.addEventListener("click",()=>showSpecies(card)));
const discoveryDayButton=$("#discoveryDayLearn"),discoveryDayImage=$("#discoveryDayImage");
if(cards.length&&discoveryDayButton&&discoveryDayImage){
 const today=new Date(),dayNumber=Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())/86400000);
 const discoveryCard=cards[((dayNumber%cards.length)+cards.length)%cards.length];
 const discoveryName=discoveryCard.dataset.name;
 discoveryDayImage.src=discoveryCard.dataset.image;
 discoveryDayImage.alt=discoveryName+" — descoberta do dia";
 $("#discoveryDayKind").textContent=discoveryCard.dataset.kind.toUpperCase()+" EM DESTAQUE";
 $("#discoveryDayName").textContent=discoveryName;
 $("#discoveryDayScientific").textContent=discoveryCard.dataset.scientific;
 $("#discoveryDayAbout").textContent=discoveryCard.dataset.about;
 $("#discoveryDayDate").textContent="Descoberta de "+today.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
 discoveryDayButton.addEventListener("click",()=>showSpecies(discoveryCard));
}
$$("[data-close]").forEach(el=>el.addEventListener("click",closeSpecies));
addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("open"))closeSpecies()});

// Accessible FAQ: keep the interaction lightweight
$$(".faq-list details").forEach(item=>item.addEventListener("toggle",()=>{if(item.open)$$(".faq-list details").filter(other=>other!==item).forEach(other=>other.open=false)}));

// Demo area explains how the project package can be upgraded when the video exists.
const toast=$("#toast");let toastTimer;
function announce(msg){toast.textContent=msg;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2800)}

// Caatinga memory game
const memorySpecies=[
 {id:"barauna",name:"Baraúna",image:"memory-barauna.jpg"},
 {id:"carnauba",name:"Carnaúba",image:"memory-carnauba.jpg"},
 {id:"faveleira",name:"Faveleira",image:"memory-faveleira.jpg"},
 {id:"mandacaru",name:"Mandacaru",image:"memory-mandacaru.webp"},
 {id:"anu-preto",name:"Anu-preto",image:"memory-anu-preto.jpg"},
 {id:"cancao",name:"Cancão",image:"memory-cancao.jpg"},
 {id:"carcara",name:"Carcará",image:"memory-carcara.jpg"},
 {id:"galo-campina",name:"Galo-de-campina",image:"memory-galo-campina.jpg"}
];
const memoryGrid=$("#memoryGrid"),memoryStatus=$("#memoryStatus"),memoryShuffle=$("#memoryShuffle");
let memoryCards=[],memoryFlipped=[],memoryMatched=0,memoryMoves=0,memoryStartedAt=null,memoryTimerId=null,memoryMismatchId=null;
function shuffleCards(cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}return cards}
function updateMemoryTime(){if(memoryStartedAt===null)return;const seconds=Math.floor((Date.now()-memoryStartedAt)/1000);$("#memoryTime").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0")}
function startMemoryRound(){
 clearInterval(memoryTimerId);clearTimeout(memoryMismatchId);memoryTimerId=null;memoryMismatchId=null;
 memoryFlipped=[];memoryMatched=0;memoryMoves=0;memoryStartedAt=null;
 memoryCards=shuffleCards(memorySpecies.flatMap(species=>[{...species,cardId:species.id+"-a"},{...species,cardId:species.id+"-b"}]));
 $("#memoryMoves").textContent="0";$("#memoryPairs").textContent="0 / 8";$("#memoryTime").textContent="00:00";
 memoryStatus.textContent="Encontre os 8 pares para completar a rodada.";
 memoryShuffle.innerHTML='<span aria-hidden="true">⤨</span> Embaralhar cartas';
 memoryGrid.innerHTML=memoryCards.map((card,index)=>`<button class="memory-card" type="button" data-card-id="${card.cardId}" aria-label="Carta fechada ${index+1}"><span class="memory-card-inner"><span class="memory-card-face memory-card-back" aria-hidden="true"><span>✳</span></span><span class="memory-card-face memory-card-front" aria-hidden="true"><img src="${card.image}" alt=""><span>${card.name}</span></span></span></button>`).join("");
}
function flipMemoryCard(button){
 if(memoryFlipped.length===2||button.classList.contains("is-flipped")||button.classList.contains("is-matched"))return;
 const card=memoryCards.find(item=>item.cardId===button.dataset.cardId);
 if(!card)return;
 button.classList.add("is-flipped");button.setAttribute("aria-label",card.name);
 memoryFlipped.push({button,card});
 if(memoryStartedAt===null){memoryStartedAt=Date.now();memoryTimerId=setInterval(updateMemoryTime,1000)}
 if(memoryFlipped.length<2)return;
 memoryMoves++;$("#memoryMoves").textContent=String(memoryMoves);
 const [first,second]=memoryFlipped;
 if(first.card.id===second.card.id){
  first.button.classList.add("is-matched");second.button.classList.add("is-matched");
  first.button.disabled=true;second.button.disabled=true;
  first.button.setAttribute("aria-label",first.card.name+"; par encontrado");second.button.setAttribute("aria-label",second.card.name+"; par encontrado");
  memoryMatched++;$("#memoryPairs").textContent=memoryMatched+" / 8";memoryFlipped=[];
  if(memoryMatched===memorySpecies.length){
   clearInterval(memoryTimerId);memoryTimerId=null;updateMemoryTime();
   memoryStatus.textContent="Parabéns! Você encontrou todos os pares em "+memoryMoves+" jogadas.";
   memoryShuffle.innerHTML='<span aria-hidden="true">⤨</span> Embaralhar para nova rodada';
   announce("Rodada concluída! Embaralhe as cartas para jogar novamente.");
  }else memoryStatus.textContent="Par encontrado: "+first.card.name+". Continue procurando.";
  return;
 }
 memoryStatus.textContent="Não formou um par. Tente novamente.";
 memoryMismatchId=setTimeout(()=>{first.button.classList.remove("is-flipped");second.button.classList.remove("is-flipped");first.button.setAttribute("aria-label","Carta fechada "+(memoryCards.indexOf(first.card)+1));second.button.setAttribute("aria-label","Carta fechada "+(memoryCards.indexOf(second.card)+1));memoryFlipped=[];memoryMismatchId=null},850);
}
memoryGrid.addEventListener("click",event=>{const button=event.target.closest(".memory-card");if(button)flipMemoryCard(button)});
memoryShuffle.addEventListener("click",startMemoryRound);
startMemoryRound();

// Caatinga snake game
if($("#snakeBoard")){
const snakeCanvas=$("#snakeBoard"),snakeContext=snakeCanvas.getContext("2d"),snakeScore=$("#snakeScore"),snakeBest=$("#snakeBest"),snakeStatus=$("#snakeStatus"),snakeStart=$("#snakeStart"),snakePause=$("#snakePause"),snakeRestart=$("#snakeRestart");
const snakeCellSize=20,snakeBoardColumns=snakeCanvas.width/snakeCellSize,snakeBoardRows=snakeCanvas.height/snakeCellSize,snakeDirections={up:{x:0,y:-1},right:{x:1,y:0},down:{x:0,y:1},left:{x:-1,y:0}};
const snakeSkins={
 rattlesnake:{label:"Cascavel",body:["#e1c98d","#c5a268","#987346","#745639"],outline:"#4d3a24",diamond:"#6c4a2d",diamondLight:"#e5cb91",spot:"rgba(99,67,38,.86)",head:["#a68148","#ddc184","#a17a43"],rattle:true},
 boa:{label:"Jiboia",body:["#c1a875","#a58a56","#786544","#584b36"],outline:"#403625",diamond:"#4d5634",diamondLight:"#d1bd86",spot:"rgba(68,76,45,.9)",head:["#6c7147","#c9b57d","#817344"],rattle:false},
 coral:{label:"Coral",body:["#f0dfc0","#ead7b4","#c7a77b","#806246"],outline:"#342d28",diamond:"#c83c35",diamondLight:"#f5ead6",spot:"#342d28",head:["#bd342e","#f4e3c9","#332d2b"],rattle:false}
};
const savedSnakeSkin=localStorage.getItem("discovery-caatinga-snake-skin");
let snakeSkin=snakeSkins[savedSnakeSkin]?savedSnakeSkin:"rattlesnake",snakeSegments=[],snakePreviousSegments=[],snakeDirection="right",snakeNextDirection="right",snakeFood={x:14,y:10},snakePoints=0,snakeBestScore=Number(localStorage.getItem("discovery-caatinga-snake-best"))||0,snakeTimer=null,snakeLastFrame=null,snakeAccumulator=0,snakeRunning=false,snakeGameOver=false;
snakeBest.textContent=String(snakeBestScore);
function drawSnake(interpolation=1){
 const ctx=snakeContext,size=snakeCellSize;
 const isDark=document.documentElement.dataset.theme==="dark";
 const skin=snakeSkins[snakeSkin];
 ctx.fillStyle=isDark?"#202d23":"#f2f4e9";ctx.fillRect(0,0,snakeCanvas.width,snakeCanvas.height);
 ctx.strokeStyle=isDark?"rgba(205,225,190,.07)":"rgba(57,86,52,.07)";ctx.lineWidth=1;
 for(let column=0;column<=snakeBoardColumns;column++){const position=column*size;ctx.beginPath();ctx.moveTo(position,0);ctx.lineTo(position,snakeCanvas.height);ctx.stroke()}
 for(let row=0;row<=snakeBoardRows;row++){const position=row*size;ctx.beginPath();ctx.moveTo(0,position);ctx.lineTo(snakeCanvas.width,position);ctx.stroke()}
 const center=point=>({x:(point.x+.5)*size,y:(point.y+.5)*size}),bodyPoints=snakeSegments.map((segment,index)=>{
  const previous=snakePreviousSegments[Math.min(index,snakePreviousSegments.length-1)]||segment,point=center({x:previous.x+(segment.x-previous.x)*interpolation,y:previous.y+(segment.y-previous.y)*interpolation});
  if(index===0||index===snakeSegments.length-1)return point;
  const before=snakeSegments[index-1],after=snakeSegments[index+1],tangent={x:after.x-before.x,y:after.y-before.y},length=Math.hypot(tangent.x,tangent.y)||1,wave=Math.sin(performance.now()/190-index*.78)*1.2;
  return {x:point.x-tangent.y/length*wave,y:point.y+tangent.x/length*wave};
 });
 ctx.save();ctx.translate((snakeFood.x+.5)*size,(snakeFood.y+.5)*size);
 ctx.fillStyle="#34734a";ctx.strokeStyle="#24583a";ctx.lineWidth=1.5;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(-2,7);ctx.lineTo(-2,-5);ctx.lineTo(-6,-9);ctx.moveTo(2,7);ctx.lineTo(2,-7);ctx.lineTo(6,-11);ctx.moveTo(-2,-1);ctx.lineTo(-6,-5);ctx.moveTo(2,1);ctx.lineTo(6,-3);ctx.stroke();
 ctx.fillStyle="#76a75b";ctx.beginPath();ctx.ellipse(0,3,6,9,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(-6,-6,2.4,5,-.55,0,Math.PI*2);ctx.ellipse(6,-4,2.4,5,.55,0,Math.PI*2);ctx.fill();
 ctx.restore();
 if(bodyPoints.length){
  ctx.save();ctx.lineJoin="round";ctx.lineCap="round";
  const spine=()=>{ctx.beginPath();ctx.moveTo(bodyPoints[0].x,bodyPoints[0].y);for(let i=1;i<bodyPoints.length-1;i++){const midpoint={x:(bodyPoints[i].x+bodyPoints[i+1].x)/2,y:(bodyPoints[i].y+bodyPoints[i+1].y)/2};ctx.quadraticCurveTo(bodyPoints[i].x,bodyPoints[i].y,midpoint.x,midpoint.y)}if(bodyPoints.length>1)ctx.lineTo(bodyPoints[bodyPoints.length-1].x,bodyPoints[bodyPoints.length-1].y)};
  ctx.shadowColor=isDark?"rgba(0,0,0,.38)":"rgba(44,48,25,.22)";ctx.shadowBlur=3;ctx.shadowOffsetY=3;
  spine();ctx.strokeStyle=isDark?"#342b20":skin.outline;ctx.lineWidth=18;ctx.stroke();
  const bodyGradient=ctx.createLinearGradient(0,bodyPoints[0].y-size,0,bodyPoints[0].y+size);
  bodyGradient.addColorStop(0,isDark?skin.body[0]:skin.body[0]);bodyGradient.addColorStop(.35,skin.body[1]);bodyGradient.addColorStop(.72,skin.body[2]);bodyGradient.addColorStop(1,skin.body[3]);
  spine();ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle=bodyGradient;ctx.lineWidth=15;ctx.stroke();
  const spineSamples=[];
  for(let i=0;i<bodyPoints.length-1;i++){
   const from=bodyPoints[i],to=bodyPoints[i+1],distance=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(distance/5));
   for(let step=0;step<steps;step++){const t=step/steps;spineSamples.push({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,angle:Math.atan2(to.y-from.y,to.x-from.x)})}
  }
  if(bodyPoints.length)spineSamples.push({...bodyPoints[bodyPoints.length-1],angle:spineSamples.length?spineSamples[spineSamples.length-1].angle:0});
  for(let i=1;i<spineSamples.length-1;i+=2){
   const sample=spineSamples[i];
   ctx.save();ctx.translate(sample.x,sample.y);ctx.rotate(sample.angle);
   if(snakeSkin==="rattlesnake"){
    ctx.fillStyle=isDark?"#594128":skin.diamond;ctx.beginPath();ctx.moveTo(-5.4,0);ctx.lineTo(0,-6.5);ctx.lineTo(5.4,0);ctx.lineTo(0,6.5);ctx.closePath();ctx.fill();
    ctx.fillStyle=skin.diamondLight;ctx.beginPath();ctx.moveTo(-3.2,0);ctx.lineTo(0,-4);ctx.lineTo(3.2,0);ctx.lineTo(0,4);ctx.closePath();ctx.fill();
    for(const side of [-1,1]){ctx.fillStyle=skin.spot;ctx.beginPath();ctx.ellipse(0,side*5.1,2.7,1.35,0,0,Math.PI*2);ctx.fill()}
   }else if(snakeSkin==="boa"){
    ctx.fillStyle=skin.spot;ctx.beginPath();ctx.ellipse(0,0,4.2,6.1,.12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=skin.diamondLight;ctx.beginPath();ctx.ellipse(0,-.8,2.3,3.8,.12,0,Math.PI*2);ctx.fill();
    for(const side of [-1,1]){ctx.fillStyle="rgba(64,54,37,.62)";ctx.beginPath();ctx.ellipse(0,side*5.3,2.4,1.2,0,0,Math.PI*2);ctx.fill()}
   }else{
    const band=Math.floor(i/2)%3;
    ctx.strokeStyle=band===0?"#c83c35":band===1?"#332d2b":"#f2dfc0";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-5.8,0);ctx.lineTo(5.8,0);ctx.stroke();
    ctx.fillStyle=skin.spot;ctx.beginPath();ctx.ellipse(0,-4.7,2.6,1.25,0,0,Math.PI*2);ctx.ellipse(0,4.7,2.6,1.25,0,0,Math.PI*2);ctx.fill();
   }
   ctx.strokeStyle=isDark?"rgba(92,65,39,.48)":"rgba(104,72,39,.46)";ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.stroke();
   ctx.restore();
  }
  for(let i=0;i<spineSamples.length-1;i+=2){
   const sample=spineSamples[i],tangent={x:Math.cos(sample.angle),y:Math.sin(sample.angle)},across={x:-tangent.y,y:tangent.x};
   ctx.strokeStyle=isDark?"rgba(239,219,170,.24)":"rgba(255,244,208,.42)";ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(sample.x-across.x*6,sample.y-across.y*6);ctx.lineTo(sample.x+across.x*6,sample.y+across.y*6);ctx.stroke();
  }
  if(bodyPoints.length>1&&skin.rattle){
   const tail=bodyPoints[bodyPoints.length-1],beforeTail=bodyPoints[bodyPoints.length-2],tailAngle=Math.atan2(tail.y-beforeTail.y,tail.x-beforeTail.x);
   ctx.save();ctx.translate(tail.x,tail.y);ctx.rotate(tailAngle);ctx.strokeStyle=isDark?"#62492d":"#795631";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(9,0);ctx.stroke();
   for(let ring=0;ring<4;ring++){ctx.fillStyle=ring%2===0?"#e0ca94":"#856744";ctx.beginPath();ctx.ellipse(9+ring*3.2,0,4.2-ring*.38,3.7-ring*.3,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(68,49,32,.65)";ctx.lineWidth=.65;ctx.stroke()}
   ctx.fillStyle="#e0ca94";ctx.beginPath();ctx.ellipse(22,0,4.2,3.7,.15,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#715437";ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(22,0,4.2,3.7,.15,0,Math.PI*2);ctx.stroke();ctx.restore();
  }else if(bodyPoints.length>1){
   const tail=bodyPoints[bodyPoints.length-1],beforeTail=bodyPoints[bodyPoints.length-2],angle=Math.atan2(tail.y-beforeTail.y,tail.x-beforeTail.x),tip={x:tail.x+Math.cos(angle)*9,y:tail.y+Math.sin(angle)*9};
   ctx.fillStyle=skin.body[2];ctx.beginPath();ctx.moveTo(tail.x-Math.sin(angle)*5,tail.y+Math.cos(angle)*5);ctx.quadraticCurveTo(tip.x,tip.y,tail.x+Math.sin(angle)*5,tail.y-Math.cos(angle)*5);ctx.closePath();ctx.fill();
  }
  const head=bodyPoints[0],direction=snakeDirections[snakeDirection],forward={x:direction.x,y:direction.y},side={x:-direction.y,y:direction.x};
  const move=(point,along,across=0)=>({x:point.x+forward.x*along+side.x*across,y:point.y+forward.y*along+side.y*across});
  const headGradient=ctx.createLinearGradient(head.x-side.x*9,head.y-side.y*9,head.x+side.x*9,head.y+side.y*9);headGradient.addColorStop(0,skin.head[0]);headGradient.addColorStop(.48,skin.head[1]);headGradient.addColorStop(1,skin.head[2]);
  ctx.shadowColor=isDark?"rgba(0,0,0,.4)":"rgba(44,34,20,.3)";ctx.shadowBlur=3;ctx.shadowOffsetY=1;
  ctx.fillStyle=isDark?"#382b20":skin.outline;ctx.beginPath();ctx.moveTo(move(head,12).x,move(head,12).y);ctx.quadraticCurveTo(move(head,11,8).x,move(head,11,8).y,move(head,3,8).x,move(head,3,8).y);ctx.lineTo(move(head,-7,6).x,move(head,-7,6).y);ctx.quadraticCurveTo(move(head,-12,0).x,move(head,-12,0).y,move(head,-7,-6).x,move(head,-7,-6).y);ctx.lineTo(move(head,3,-8).x,move(head,3,-8).y);ctx.quadraticCurveTo(move(head,11,-8).x,move(head,11,-8).y,move(head,12).x,move(head,12).y);ctx.fill();
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.fillStyle=headGradient;ctx.beginPath();ctx.moveTo(move(head,10.5).x,move(head,10.5).y);ctx.quadraticCurveTo(move(head,9,6.5).x,move(head,9,6.5).y,move(head,3,6.5).x,move(head,3,6.5).y);ctx.lineTo(move(head,-6,4.7).x,move(head,-6,4.7).y);ctx.quadraticCurveTo(move(head,-10,0).x,move(head,-10,0).y,move(head,-6,-4.7).x,move(head,-6,-4.7).y);ctx.lineTo(move(head,3,-6.5).x,move(head,3,-6.5).y);ctx.quadraticCurveTo(move(head,9,-6.5).x,move(head,9,-6.5).y,move(head,10.5).x,move(head,10.5).y);ctx.fill();
  ctx.strokeStyle=isDark?"rgba(90,61,36,.72)":"rgba(108,75,43,.72)";ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(move(head,7,-4).x,move(head,7,-4).y);ctx.quadraticCurveTo(move(head,3,0).x,move(head,3,0).y,move(head,7,4).x,move(head,7,4).y);ctx.stroke();
  for(const eyeSide of [-1,1]){
   const eye=move(head,3.8,eyeSide*5.2);ctx.fillStyle="#f4d989";ctx.beginPath();ctx.ellipse(eye.x,eye.y,2.5,3.1,Math.atan2(side.y,side.x),0,Math.PI*2);ctx.fill();
   ctx.fillStyle="#202018";ctx.beginPath();ctx.ellipse(eye.x+forward.x*.45,eye.y+forward.y*.45,.9,2,Math.atan2(forward.y,forward.x),0,Math.PI*2);ctx.fill();
   ctx.fillStyle="rgba(255,255,255,.82)";ctx.beginPath();ctx.arc(eye.x-forward.x*.55-side.x*.35,eye.y-forward.y*.55-side.y*.35,.65,0,Math.PI*2);ctx.fill();
   const nostril=move(head,9.3,eyeSide*2.8);ctx.fillStyle="#493522";ctx.beginPath();ctx.arc(nostril.x,nostril.y,.85,0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle=isDark?"rgba(82,53,32,.78)":"rgba(93,61,37,.8)";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(move(head,-5,-3).x,move(head,-5,-3).y);ctx.quadraticCurveTo(move(head,-7,0).x,move(head,-7,0).y,move(head,-5,3).x,move(head,-5,3).y);ctx.stroke();
  const tongueFlick=snakeRunning&&Date.now()%1100<230;
  if(tongueFlick){const tip=move(head,14);ctx.strokeStyle="#b93d48";ctx.lineWidth=1.5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(move(head,8).x,move(head,8).y);ctx.lineTo(tip.x,tip.y);ctx.lineTo(move(tip,3,2).x,move(tip,3,2).y);ctx.moveTo(tip.x,tip.y);ctx.lineTo(move(tip,3,-2).x,move(tip,3,-2).y);ctx.stroke()}
  ctx.restore();
 }
}
function resetSnake(){
 cancelAnimationFrame(snakeTimer);snakeTimer=null;snakeLastFrame=null;snakeAccumulator=0;snakeRunning=false;snakeGameOver=false;snakeSegments=[{x:11,y:10},{x:10,y:10},{x:9,y:10},{x:8,y:10},{x:8,y:11},{x:8,y:12},{x:9,y:12}];snakePreviousSegments=snakeSegments.map(segment=>({...segment}));snakeDirection="right";snakeNextDirection="right";snakePoints=0;
 snakeScore.textContent="0";snakeStart.textContent="Iniciar jogo";snakePause.disabled=true;snakePause.textContent="Pausar";snakeStatus.textContent="Pressione Iniciar para jogar. Use as setas ou W, A, S e D para mover.";placeSnakeFood();drawSnake(1);
}
function placeSnakeFood(){
 const emptyCells=[];for(let y=0;y<snakeBoardRows;y++)for(let x=0;x<snakeBoardColumns;x++)if(!snakeSegments.some(segment=>segment.x===x&&segment.y===y))emptyCells.push({x,y});
 if(!emptyCells.length){finishSnake("Parabéns! Você preencheu todo o tabuleiro.");return}
 snakeFood=emptyCells[Math.floor(Math.random()*emptyCells.length)];
}
function finishSnake(message){
 snakeTimer=null;snakeLastFrame=null;snakeAccumulator=0;snakeRunning=false;snakeGameOver=true;snakeStart.textContent="Jogar novamente";snakePause.disabled=true;snakeStatus.textContent=message+" Pontuação: "+snakePoints+".";
}
function advanceSnake(){
 snakeDirection=snakeNextDirection;const direction=snakeDirections[snakeDirection],head={x:snakeSegments[0].x+direction.x,y:snakeSegments[0].y+direction.y},eating=head.x===snakeFood.x&&head.y===snakeFood.y;
 const bodyToCheck=eating?snakeSegments:snakeSegments.slice(0,-1);
 if(head.x<0||head.y<0||head.x>=snakeBoardColumns||head.y>=snakeBoardRows||bodyToCheck.some(segment=>segment.x===head.x&&segment.y===head.y)){finishSnake("Fim de jogo!");return}
 snakePreviousSegments=snakeSegments.map(segment=>({...segment}));
 snakeSegments.unshift(head);if(eating){snakePoints+=10;snakeScore.textContent=String(snakePoints);if(snakePoints>snakeBestScore){snakeBestScore=snakePoints;snakeBest.textContent=String(snakeBestScore);localStorage.setItem("discovery-caatinga-snake-best",String(snakeBestScore))}placeSnakeFood()}else snakeSegments.pop();
}
function animateSnake(timestamp){
 if(!snakeRunning)return;
 if(snakeLastFrame===null)snakeLastFrame=timestamp;
 snakeAccumulator+=Math.min(timestamp-snakeLastFrame,50);snakeLastFrame=timestamp;
 const stepDuration=Math.max(85,135-Math.floor(snakePoints/50)*5);
 while(snakeAccumulator>=stepDuration&&snakeRunning){snakeAccumulator-=stepDuration;advanceSnake()}
 drawSnake(snakeRunning?snakeAccumulator/stepDuration:1);
 if(snakeRunning)snakeTimer=requestAnimationFrame(animateSnake);
}
function startSnake(){
 if(snakeGameOver)resetSnake();
 if(snakeRunning)return;
 snakeRunning=true;snakeLastFrame=null;snakeAccumulator=0;snakeStart.textContent="Em andamento";snakePause.textContent="Pausar";snakePause.disabled=false;snakeStatus.textContent="Jogo em andamento. Use as setas, W, A, S e D ou os controles na tela.";snakeTimer=requestAnimationFrame(animateSnake);
}
function pauseSnake(){
 if(!snakeRunning)return;
 cancelAnimationFrame(snakeTimer);snakeTimer=null;snakeRunning=false;snakeLastFrame=null;snakeAccumulator=0;snakeStart.textContent="Continuar";snakePause.disabled=true;snakePause.textContent="Pausado";snakeStatus.textContent="Jogo pausado. Pressione Continuar para retomar.";drawSnake(1);
}
function selectSnakeSkin(skinName){
 if(!snakeSkins[skinName])return;
 snakeSkin=skinName;localStorage.setItem("discovery-caatinga-snake-skin",skinName);
 $$("[data-snake-skin]").forEach(button=>{const selected=button.dataset.snakeSkin===skinName;button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected))});
 if(!snakeRunning&&!snakeGameOver)snakeStatus.textContent=snakeSkins[skinName].label+" selecionada. Pressione Iniciar para jogar.";
 drawSnake(1);
}
function setSnakeDirection(direction){
 const current=snakeDirections[snakeNextDirection],next=snakeDirections[direction];if(!next||current.x+next.x===0&&current.y+next.y===0)return;
 snakeNextDirection=direction;
}
snakeStart.addEventListener("click",startSnake);snakePause.addEventListener("click",pauseSnake);snakeRestart.addEventListener("click",resetSnake);
$$("[data-snake-skin]").forEach(button=>button.addEventListener("click",()=>selectSnakeSkin(button.dataset.snakeSkin)));
themeToggle.addEventListener("click",drawSnake);
$$("[data-snake-direction]").forEach(button=>button.addEventListener("click",()=>setSnakeDirection(button.dataset.snakeDirection)));
document.addEventListener("keydown",event=>{
 if(!snakeRunning||$(".modal.open")||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))return;
 const keys={ArrowUp:"up",w:"up",W:"up",ArrowRight:"right",d:"right",D:"right",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left"};
 const direction=keys[event.key];if(!direction)return;
 if(event.key.startsWith("Arrow"))event.preventDefault();
 setSnakeDirection(direction);
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&snakeRunning)pauseSnake()});
resetSnake();
selectSnakeSkin(snakeSkin);
}
