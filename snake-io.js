(()=>{
 const $=(selector,root=document)=>root.querySelector(selector),$$=(selector,root=document)=>[...root.querySelectorAll(selector)];
 const canvas=$("#ioBoard"),ctx=canvas.getContext("2d"),world={width:5000,height:3400},skins={
  rattlesnake:{name:"Cascavel",colors:["#e3cf9b","#b48a51","#76573a"],pattern:"diamond"},
  boa:{name:"Jiboia",colors:["#d0bd8a","#87744a","#4f5136"],pattern:"saddle"},
  coral:{name:"Coral",colors:["#f2dfc0","#c83c35","#302b2a"],pattern:"bands"}
 },difficultySettings={
  easy:{speed:.82,turn:1.55,think:520,look:115},
  medium:{speed:.93,turn:2.05,think:300,look:190},
  hard:{speed:1,turn:2.55,think:180,look:275}
 },botNames=["Mandacaru","Carcará","Asa-branca","Jurema","Tatu-bola","Acauã","Umbuzeiro","Calango","Seriema","Juazeiro"],botColors=["#387d62","#d26d43","#697fc2","#ae5b91","#8d7840","#3e9ba3","#b35544","#6e9a47","#815bb0","#b68748"];
 const foods=[],snakes=[];
 let viewWidth=canvas.width,viewHeight=canvas.height,dpr=1,player=null,gameState="ready",lastFrame=0,lastRankUpdate=0,frameRequest=0,selectedSkin=localStorage.getItem("discovery-caatinga-snake-skin")||"rattlesnake",pointerTarget=null,keys=new Set(),gameTime=0;
 const foodKinds=[{value:5,color:"#e87846",radius:7},{value:10,color:"#d84e55",radius:9},{value:20,color:"#e9bd4d",radius:11}];
 const normalizeAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
 const distanceSquared=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y};
 const random=(min,max)=>min+Math.random()*(max-min);
 function resizeCanvas(){
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  dpr=Math.min(window.devicePixelRatio||1,1.5);viewWidth=rect.width;viewHeight=rect.height;
  canvas.width=Math.round(viewWidth*dpr);canvas.height=Math.round(viewHeight*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
 }
 function makeSnake({name,color,skin,ai=false,difficulty="medium",x,y,angle=random(0,Math.PI*2)}){
  const start={x,y},trail=[];
  for(let i=0;i<18;i++)trail.push({x:x-Math.cos(angle)*i*8,y:y-Math.sin(angle)*i*8});
  return {name,color,skin,ai,difficulty,x,y,angle,targetAngle:angle,trail,length:128,score:0,alive:true,speed:ai?random(132,158):168,turn:ai?random(1.7,2.4):2.9,thinkAt:0,targetFood:null,personality:random(-.5,.5),lastHead:{...start}};
 }
 function spawnFood(count=1){
  for(let i=0;i<count;i++){
   for(let tries=0;tries<40;tries++){
    const food={x:random(60,world.width-60),y:random(60,world.height-60),...foodKinds[Math.random()<.75?0:Math.random()<.82?1:2]};
    if(snakes.some(snake=>snake.alive&&Math.hypot(snake.x-food.x,snake.y-food.y)<110))continue;
    foods.push(food);break;
   }
  }
 }
 function setSkin(skin){
  if(!skins[skin])return;
  selectedSkin=skin;localStorage.setItem("discovery-caatinga-snake-skin",skin);
  $$("[data-io-skin]").forEach(button=>{const selected=button.dataset.ioSkin===skin;button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected))});
 }
 function positionBots(){
  const positions=[];
  for(let i=0;i<botNames.length;i++){
   let point,attempts=0;
   do{point={x:random(330,world.width-330),y:random(330,world.height-330)};attempts++}while(attempts<60&&positions.some(other=>distanceSquared(point,other)<420000));
   positions.push(point);
   const bot=makeSnake({name:botNames[i],color:botColors[i],skin:["rattlesnake","boa","coral"][i%3],ai:true,difficulty:$("#ioDifficulty").value,x:point.x,y:point.y});
   bot.personality=(i%3-1)*.34;snakes.push(bot);
  }
 }
 function updateHud(){
  const alive=snakes.filter(snake=>snake.alive),ranked=[...alive].sort((a,b)=>b.score-a.score||b.length-a.length);
  $("#ioScore").textContent=String(player?.score||0);$("#ioLength").textContent=String(Math.floor((player?.length||128)/10));
  $("#ioAlive").textContent=String(Math.max(0,alive.length-1));$("#ioRank").textContent=player?.alive?(ranked.findIndex(snake=>snake===player)+1)+" / "+ranked.length:"—";
  const list=$("#ioRanking");list.replaceChildren();
  ranked.slice(0,6).forEach((snake,index)=>{
   const item=document.createElement("li"),swatch=document.createElement("i"),name=document.createElement("span"),score=document.createElement("strong");
   swatch.className="io-rank-swatch";swatch.style.backgroundColor=snake.color;name.textContent=(index+1)+". "+snake.name+(snake===player?" (você)":"");score.textContent=String(snake.score);
   item.classList.toggle("is-player",snake===player);item.append(swatch,name,score);list.append(item);
  });
  $("#ioPlayerLabel").textContent=player?.name||"Explorador";
 }
 function startMatch(){
  if(frameRequest)cancelAnimationFrame(frameRequest);
  foods.length=0;snakes.length=0;keys.clear();pointerTarget=null;gameTime=0;
  const name=$("#ioPlayerName").value.trim().slice(0,18)||"Explorador",skin=selectedSkin;
  player=makeSnake({name,color:"#d29343",skin,x:world.width/2,y:world.height/2,angle:0});snakes.push(player);positionBots();spawnFood(420);
  gameState="running";$("#ioStartOverlay").hidden=true;$("#ioPauseOverlay").hidden=true;$("#ioOverOverlay").hidden=true;
  canvas.focus({preventScroll:true});
  $("#ioPause").disabled=false;$("#ioPause").textContent="Pausar";$("#ioStatus").textContent="Colete frutos e evite os corpos e as bordas da arena.";
  updateHud();resizeCanvas();lastFrame=performance.now();frameRequest=requestAnimationFrame(frame);
 }
 function togglePause(){
  if(gameState==="running"){gameState="paused";if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=0;$("#ioPauseOverlay").hidden=false;$("#ioPause").textContent="Continuar";$("#ioStatus").textContent="Partida pausada."}
  else if(gameState==="paused"){gameState="running";$("#ioPauseOverlay").hidden=true;$("#ioPause").textContent="Pausar";$("#ioStatus").textContent="Partida retomada.";lastFrame=performance.now();frameRequest=requestAnimationFrame(frame)}
 }
 function gameOver(){
  if(gameState!=="running")return;
  gameState="over";$("#ioPause").disabled=true;
  const best=Number(localStorage.getItem("discovery-caatinga-io-best"))||0;
  if(player.score>best)localStorage.setItem("discovery-caatinga-io-best",String(player.score));
  $("#ioBest").textContent=String(Math.max(best,player.score));$("#ioFinalScore").textContent="Você fez "+player.score+" pontos e ficou em "+($("#ioRank").textContent==="—"?"—":$("#ioRank").textContent)+" no ranking.";
  $("#ioOverTitle").textContent="Boa tentativa, "+player.name+"!";$("#ioOverOverlay").hidden=false;$("#ioStatus").textContent="Você foi eliminado. Inicie outra partida para tentar novamente.";updateHud();
 }
 function changeDirection(snake,dt){
  const turn=normalizeAngle(snake.targetAngle-snake.angle),maxTurn=snake.turn*dt;
  snake.angle=normalizeAngle(snake.angle+Math.max(-maxTurn,Math.min(maxTurn,turn)));
 }
 function pointsAlong(snake,spacing=22,limit=snake.length){
  const result=[{x:snake.x,y:snake.y}];let covered=0,previous=result[0];
  for(const point of snake.trail){
   const dx=previous.x-point.x,dy=previous.y-point.y,distance=Math.hypot(dx,dy);
   if(distance<.001)continue;
   let along=spacing-(covered%spacing);
   while(along<=distance&&result.length*spacing<limit){result.push({x:previous.x-dx*along/distance,y:previous.y-dy*along/distance});along+=spacing}
   covered+=distance;previous=point;
   if(result.length*spacing>=limit)break;
  }
  return result;
 }
 function steerAI(snake,now,settings){
  if(now<snake.thinkAt)return;
  snake.thinkAt=now+settings.think*random(.78,1.25);
  const dangerDistance=settings.look,forward={x:Math.cos(snake.angle),y:Math.sin(snake.angle)};
  let turnAway=0,danger=0;
  for(let step=1;step<=5;step++){
   const look=step*dangerDistance/5,probe={x:snake.x+forward.x*look,y:snake.y+forward.y*look};
   const wall=Math.min(probe.x,world.width-probe.x,probe.y,world.height-probe.y);
   if(wall<100){danger+=(100-wall)/100*(6-step);turnAway+=probe.x<130||probe.x>world.width-130?-(probe.y<world.height/2?-1:1):0;turnAway+=probe.y<130||probe.y>world.height-130?-(probe.x<world.width/2?1:-1):0}
   for(const other of snakes){
    if(!other.alive||other===snake)continue;
    const body=other._body||[];
    for(let i=3;i<body.length;i+=3){
     const point=body[i],dist=Math.hypot(point.x-probe.x,point.y-probe.y);
     if(dist<54){danger+=(54-dist)/54*(6-step);turnAway+=Math.sign((probe.x-point.x)*-forward.y-(probe.y-point.y)*-forward.x)*(54-dist)/54}
    }
   }
  }
  let target=snake.targetFood;
  if(!target||!foods.includes(target)||now%1700<settings.think)target=null;
  if(!target){
   let nearest=Infinity;
   for(const food of foods){const d=distanceSquared(snake,food);if(d<nearest){nearest=d;target=food}}
   snake.targetFood=target;
  }
  let desired=target?Math.atan2(target.y-snake.y,target.x-snake.x):snake.angle+snake.personality;
  if(danger>0)desired=normalizeAngle(desired+Math.max(-1.5,Math.min(1.5,turnAway))*Math.min(1,danger*.22));
  snake.targetAngle=normalizeAngle(desired+snake.personality*.14);
 }
 function moveSnake(snake,dt,now){
  if(!snake.alive)return;
  if(snake.ai)steerAI(snake,now,difficultySettings[snake.difficulty]||difficultySettings.medium);
  else{
   const horizontal=(keys.has("ArrowRight")||keys.has("d")||keys.has("D")?1:0)-(keys.has("ArrowLeft")||keys.has("a")||keys.has("A")?1:0);
   const vertical=(keys.has("ArrowDown")||keys.has("s")||keys.has("S")?1:0)-(keys.has("ArrowUp")||keys.has("w")||keys.has("W")?1:0);
   if(horizontal||vertical)snake.targetAngle=Math.atan2(vertical,horizontal);
   else if(pointerTarget){snake.targetAngle=Math.atan2(pointerTarget.y,pointerTarget.x)}
  }
  changeDirection(snake,dt);
  const settings=snake.ai?difficultySettings[snake.difficulty]:null,speed=snake.speed*(settings?.speed||1)*(1+Math.min(snake.score/1400,.18));
  snake.x=Math.max(0,Math.min(world.width,snake.x+Math.cos(snake.angle)*speed*dt));snake.y=Math.max(0,Math.min(world.height,snake.y+Math.sin(snake.angle)*speed*dt));
  if(Math.hypot(snake.x-snake.trail[0].x,snake.y-snake.trail[0].y)>7){
   snake.trail.unshift({x:snake.x,y:snake.y});
   const maxPoints=Math.ceil((snake.length+600)/7);if(snake.trail.length>maxPoints)snake.trail.length=maxPoints;
  }
 }
 function collectFood(){
  for(const snake of snakes){if(!snake.alive)continue;
   for(let i=foods.length-1;i>=0;i--){const food=foods[i];if(distanceSquared(snake,food)<(food.radius+17)**2){
    foods.splice(i,1);snake.score+=food.value;snake.length+=food.value*1.65;snake.targetFood=null;spawnFood(1);
    if(snake===player){const best=Number(localStorage.getItem("discovery-caatinga-io-best"))||0;if(snake.score>best){localStorage.setItem("discovery-caatinga-io-best",String(snake.score));$("#ioBest").textContent=String(snake.score)}}
   }}
  }
 }
 function dropSnakeFood(snake){
  const body=snake._body||pointsAlong(snake,24);
  for(let i=4;i<body.length;i+=4){if(Math.random()<.6)foods.push({x:body[i].x,y:body[i].y,...foodKinds[Math.random()<.6?1:2]})}
 }
 function resolveCollisions(){
  for(const snake of snakes){if(!snake.alive)continue;snake._body=pointsAlong(snake,18)}
  const dead=new Set();
  for(const snake of snakes){
   if(!snake.alive)continue;
   if(snake.x<18||snake.y<18||snake.x>world.width-18||snake.y>world.height-18){dead.add(snake);continue}
   const own=snake._body||[];
   for(let i=5;i<own.length;i+=2){if(distanceSquared(snake,own[i])<24**2){dead.add(snake);break}}
   if(dead.has(snake))continue;
   for(const other of snakes){
    if(!other.alive||other===snake)continue;
    const body=other._body||[];
    for(let i=2;i<body.length;i+=2){if(distanceSquared(snake,body[i])<25**2){dead.add(snake);break}}
    if(dead.has(snake))break;
    if(distanceSquared(snake,other)<24**2){dead.add(snake);dead.add(other);break}
   }
  }
  for(const snake of dead){snake.alive=false;dropSnakeFood(snake);if(snake===player)gameOver()}
  if(dead.size)snakes.forEach(snake=>{delete snake._body});
 }
 function camera(){return {x:Math.max(0,Math.min(world.width-viewWidth,player.x-viewWidth/2)),y:Math.max(0,Math.min(world.height-viewHeight,player.y-viewHeight/2))}}
 function drawSnake(snake,cam){
  if(!snake.alive)return;
  const visibleMargin=70;if(snake.x<cam.x-visibleMargin||snake.x>cam.x+viewWidth+visibleMargin||snake.y<cam.y-visibleMargin||snake.y>cam.y+viewHeight+visibleMargin)return;
  const body=snake._body||pointsAlong(snake,18),skin=skins[snake.skin]||skins.rattlesnake;
  if(body.length<2)return;
  ctx.save();ctx.translate(-cam.x,-cam.y);ctx.lineJoin="round";ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(body[0].x,body[0].y);for(let i=1;i<body.length;i++)ctx.lineTo(body[i].x,body[i].y);
  ctx.shadowColor="rgba(25,34,20,.32)";ctx.shadowBlur=snake===player?10:6;ctx.shadowOffsetY=snake===player?5:3;ctx.strokeStyle="rgba(33,38,25,.75)";ctx.lineWidth=snake===player?25:22;ctx.stroke();
  const grad=ctx.createLinearGradient(0,snake.y-13,0,snake.y+13);grad.addColorStop(0,skin.colors[0]);grad.addColorStop(.52,skin.colors[1]);grad.addColorStop(1,skin.colors[2]);
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle=grad;ctx.lineWidth=snake===player?20:17;ctx.stroke();
  for(let i=3;i<body.length-1;i+=2){const p=body[i];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(body[i-1].y-body[i+1].y,body[i-1].x-body[i+1].x));ctx.fillStyle=snake.skin==="coral"?(i%6<2?"#c83c35":i%6<4?"#302b2a":"#f2dfc0"):skin.colors[2];ctx.beginPath();if(skin.pattern==="diamond"){ctx.moveTo(-4,0);ctx.lineTo(0,-6);ctx.lineTo(4,0);ctx.lineTo(0,6)}else ctx.ellipse(0,0,3.8,5.2,0,0,Math.PI*2);ctx.closePath();ctx.fill();ctx.restore()}
  ctx.fillStyle=snake.color;ctx.beginPath();ctx.ellipse(snake.x,snake.y,14,12,snake.angle,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff";for(const side of [-1,1]){const ex=snake.x+Math.cos(snake.angle+side*.68)*7,ey=snake.y+Math.sin(snake.angle+side*.68)*7;ctx.beginPath();ctx.arc(ex,ey,3.2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#171b17";ctx.beginPath();ctx.arc(ex+Math.cos(snake.angle),ey+Math.sin(snake.angle),1.5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff"}
  ctx.font="600 11px system-ui, sans-serif";ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="rgba(20,25,18,.72)";ctx.strokeText(snake.name,snake.x,snake.y-23);ctx.fillStyle="#fff";ctx.fillText(snake.name,snake.x,snake.y-23);
  ctx.restore();
 }
 function render(now){
  if(!player)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const cam=camera(),dark=document.documentElement.dataset.theme==="dark";
  ctx.fillStyle=dark?"#1b281f":"#e7ebd8";ctx.fillRect(0,0,viewWidth,viewHeight);
  ctx.save();ctx.translate(-cam.x,-cam.y);
  ctx.strokeStyle=dark?"rgba(194,216,176,.055)":"rgba(54,75,43,.07)";ctx.lineWidth=1;
  const grid=90,startX=Math.floor(cam.x/grid)*grid,startY=Math.floor(cam.y/grid)*grid;
  for(let x=startX;x<cam.x+viewWidth+grid;x+=grid){ctx.beginPath();ctx.moveTo(x,cam.y);ctx.lineTo(x,cam.y+viewHeight);ctx.stroke()}
  for(let y=startY;y<cam.y+viewHeight+grid;y+=grid){ctx.beginPath();ctx.moveTo(cam.x,y);ctx.lineTo(cam.x+viewWidth,y);ctx.stroke()}
  for(const food of foods){if(food.x<cam.x-20||food.x>cam.x+viewWidth+20||food.y<cam.y-20||food.y>cam.y+viewHeight+20)continue;ctx.fillStyle=food.color;ctx.shadowColor=food.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(food.x,food.y,food.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,.8)";ctx.beginPath();ctx.arc(food.x-food.radius*.3,food.y-food.radius*.3,food.radius*.22,0,Math.PI*2);ctx.fill()}
  ctx.shadowBlur=0;ctx.strokeStyle="#bd7652";ctx.lineWidth=18;ctx.strokeRect(0,0,world.width,world.height);ctx.strokeStyle="rgba(255,233,200,.55)";ctx.lineWidth=3;ctx.strokeRect(9,9,world.width-18,world.height-18);ctx.restore();
  for(const snake of snakes)drawSnake(snake,cam);
  const vignette=ctx.createRadialGradient(viewWidth/2,viewHeight/2,Math.min(viewWidth,viewHeight)*.27,viewWidth/2,viewHeight/2,Math.max(viewWidth,viewHeight)*.7);
  vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(1,dark?"rgba(0,0,0,.2)":"rgba(29,48,31,.1)");ctx.fillStyle=vignette;ctx.fillRect(0,0,viewWidth,viewHeight);
  if(now-lastRankUpdate>450){updateHud();lastRankUpdate=now}
 }
 function frame(now){
  frameRequest=0;
  if(gameState!=="running")return;
  const dt=Math.min(.04,Math.max(0,(now-lastFrame)/1000));lastFrame=now;gameTime+=dt;
  for(const snake of snakes)moveSnake(snake,dt,now);
  collectFood();resolveCollisions();render(now);
  if(gameState==="running")frameRequest=requestAnimationFrame(frame);
 }
 function aimAt(clientX,clientY){
  const rect=canvas.getBoundingClientRect(),dx=clientX-(rect.left+rect.width/2),dy=clientY-(rect.top+rect.height/2);
  if(Math.hypot(dx,dy)>12)pointerTarget={x:dx,y:dy};
 }
 canvas.addEventListener("pointermove",event=>{if(event.pointerType==="mouse"||event.buttons)aimAt(event.clientX,event.clientY)});
 canvas.addEventListener("pointerdown",event=>{canvas.setPointerCapture?.(event.pointerId);aimAt(event.clientX,event.clientY)});
 canvas.addEventListener("pointerup",()=>{if(gameState==="running")pointerTarget=null});
 window.addEventListener("keydown",event=>{
  if(event.target.matches("input,select,textarea,button"))return;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","W","A","S","D"].includes(event.key)){
   if(gameState==="running"){keys.add(event.key);event.preventDefault()}
  }else if(event.key==="Escape"&&["running","paused"].includes(gameState)){togglePause();event.preventDefault()}
 });
 window.addEventListener("keyup",event=>keys.delete(event.key));window.addEventListener("blur",()=>keys.clear());
 $$("[data-io-direction]").forEach(button=>{
  const direction=button.dataset.ioDirection,vector={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction];
  button.addEventListener("pointerdown",event=>{event.preventDefault();pointerTarget={x:vector[0],y:vector[1]};if(gameState==="running")player.targetAngle=Math.atan2(vector[1],vector[0])});
  button.addEventListener("click",()=>{if(player&&gameState==="running"){player.targetAngle=Math.atan2(vector[1],vector[0]);pointerTarget={x:vector[0],y:vector[1]}}});
 });
 $("#ioPlay").addEventListener("click",startMatch);$("#ioPlayAgain").addEventListener("click",startMatch);$("#ioResume").addEventListener("click",togglePause);
 $("#ioPause").addEventListener("click",togglePause);$("#ioRestart").addEventListener("click",startMatch);
 $$("[data-io-skin]").forEach(button=>button.addEventListener("click",()=>setSkin(button.dataset.ioSkin)));
 $("#ioBest").textContent=String(Number(localStorage.getItem("discovery-caatinga-io-best"))||0);
 const savedName=localStorage.getItem("discovery-caatinga-io-name");if(savedName)$("#ioPlayerName").value=savedName;
 $("#ioPlayerName").addEventListener("change",()=>localStorage.setItem("discovery-caatinga-io-name",$("#ioPlayerName").value.trim().slice(0,18)));
 setSkin(skins[selectedSkin]?selectedSkin:"rattlesnake");resizeCanvas();window.addEventListener("resize",resizeCanvas);
})();
