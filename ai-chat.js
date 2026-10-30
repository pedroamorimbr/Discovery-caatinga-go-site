(()=>{
 const panel=document.querySelector("#aiChatPanel");
 const launcher=document.querySelector("#aiChatLauncher");
 const closeButton=document.querySelector("#aiChatClose");
 const form=document.querySelector("#aiChatForm");
 const input=document.querySelector("#aiChatInput");
 const sendButton=document.querySelector("#aiChatSend");
 const messagesElement=document.querySelector("#aiChatMessages");
 const statusElement=document.querySelector("#aiChatStatus");
 const conversation=[];
 let pending=false;

 function setOpen(open){
  panel.hidden=!open;
  launcher.setAttribute("aria-expanded",String(open));
  if(open)input.focus();
  else launcher.focus();
 }

 function addMessage(role,text){
  const message=document.createElement("p");
  message.className=`ai-chat-message ai-chat-${role}`;
  message.textContent=text;
  messagesElement.append(message);
  messagesElement.scrollTop=messagesElement.scrollHeight;
 }

 launcher.addEventListener("click",()=>setOpen(panel.hidden));
 closeButton.addEventListener("click",()=>setOpen(false));
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!panel.hidden)setOpen(false);
 });
 input.addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey){
   event.preventDefault();
   form.requestSubmit();
  }
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(pending)return;
  const message=input.value.trim();
  if(!message)return;

  addMessage("user",message);
  input.value="";
  conversation.push({role:"user",content:message});
  pending=true;
  sendButton.disabled=true;
  input.disabled=true;
  statusElement.textContent="A IA está preparando uma resposta...";

  try{
   const response=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({messages:conversation.slice(-8)})
   });
   const result=await response.json().catch(()=>null);
   if(!response.ok){
    if(response.status===404)throw new Error("O endpoint da IA não foi encontrado. Publique o projeto na Vercel para ativar o chat.");
    throw new Error(result?.error||"Não foi possível obter uma resposta agora. Tente novamente.");
   }
   if(typeof result?.reply!=="string"||!result.reply.trim())throw new Error("A IA retornou uma resposta vazia. Tente novamente.");
   conversation.push({role:"assistant",content:result.reply});
   addMessage("assistant",result.reply);
   statusElement.textContent="";
  }catch(error){
   console.error("Falha ao conversar com o assistente:",error);
   statusElement.textContent=error instanceof Error?error.message:"Não foi possível conectar à IA. Tente novamente.";
   conversation.pop();
  }finally{
   pending=false;
   sendButton.disabled=false;
   input.disabled=false;
   input.focus();
  }
 });
})();
