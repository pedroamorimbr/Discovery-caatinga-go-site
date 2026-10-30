const MAX_MESSAGES = 8;
const MAX_USER_MESSAGE_LENGTH = 1200;
const MAX_CONTEXT_LENGTH = 12000;
const MAX_REQUEST_BYTES = 50000;
const MAX_REPLY_LENGTH = 5000;
const SYSTEM_PROMPT = "Você é CaatIA, a assistente educativa do Discovery Caatinga Go. Responda em português brasileiro padrão, com clareza e cordialidade, priorizando informações corretas sobre a Caatinga, biodiversidade e conservação. Revise cada resposta antes de enviá-la para corrigir ortografia, acentuação, concordância, regência e pontuação. Use texto simples, sem Markdown, sem asteriscos para negrito ou itálico, sem cerquilhas para títulos e sem crases. Se não souber algo, diga isso claramente. Não invente fontes, dados ou certezas. Suas respostas são educativas e não substituem orientação profissional.";

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.json(body);
}

function getProviderError(status) {
  const messages = {
    400: "O OpenRouter rejeitou o modelo ou o formato da solicitação. Confira AI_MODEL e se o modelo aceita chat.",
    401: "A chave AI_API_KEY foi recusada. Confira se ela é uma chave válida do OpenRouter.",
    402: "A conta do OpenRouter está sem créditos ou atingiu o limite de gastos.",
    403: "O acesso foi bloqueado pelo OpenRouter. Confira os limites e as permissões da chave.",
    404: "O modelo configurado em AI_MODEL não foi encontrado ou não está disponível.",
    429: "O OpenRouter recebeu muitas solicitações. Aguarde um pouco e tente novamente."
  };
  return messages[status] || "O OpenRouter está temporariamente indisponível. Tente novamente mais tarde.";
}

function removeMarkdownFormatting(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^\s*\*\s+/gm, "• ")
    .replace(/__/g, "")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/~~/g, "")
    .replace(/`{1,3}/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

function getMessages(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) return null;
  if (body.messages.length < 1 || body.messages.length > MAX_MESSAGES) return null;

  const messages = [];
  for (const message of body.messages) {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") return null;
    const content = message.content.trim();
    const maxLength = message.role === "user" ? MAX_USER_MESSAGE_LENGTH : MAX_REPLY_LENGTH;
    if (!content || content.length > maxLength) return null;
    messages.push({ role: message.role, content });
  }
  const contextLength = messages.reduce((total, message) => total + message.content.length, 0);
  return messages.at(-1).role === "user" && contextLength <= MAX_CONTEXT_LENGTH ? messages : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Método não permitido." });
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_REQUEST_BYTES) return sendJson(res, 413, { error: "A mensagem excede o limite permitido." });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { error: "Não foi possível ler a mensagem enviada." });
    }
  }
  const messages = getMessages(body);
  if (!messages) return sendJson(res, 400, { error: "Envie até oito mensagens válidas; perguntas podem ter até 1.200 caracteres e o contexto até 12.000." });

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    console.error("AI_API_KEY e AI_MODEL precisam estar configuradas na Vercel.");
    return sendJson(res, 503, { error: "O assistente ainda não está configurado. Adicione a chave e o modelo nas variáveis da Vercel." });
  }

  const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiUrl);
  } catch {
    console.error("AI_API_URL não é uma URL válida.");
    return sendJson(res, 500, { error: "A URL do serviço de IA está configurada incorretamente." });
  }
  if (parsedApiUrl.protocol !== "https:") {
    console.error("AI_API_URL precisa usar HTTPS.");
    return sendJson(res, 500, { error: "A URL do serviço de IA precisa usar HTTPS." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetch(parsedApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 500,
        temperature: 0.6
      }),
      signal: controller.signal
    });

    if (!upstream.ok) {
      console.error(`O provedor de IA respondeu com HTTP ${upstream.status}.`);
      return sendJson(res, 502, { error: getProviderError(upstream.status) });
    }

    let result;
    try {
      result = await upstream.json();
    } catch {
      console.error("O provedor de IA retornou uma resposta inválida.");
      return sendJson(res, 502, { error: "O serviço de IA retornou uma resposta inválida." });
    }

    const rawReply = result?.choices?.[0]?.message?.content;
    if (typeof rawReply !== "string" || !rawReply.trim() || rawReply.length > MAX_REPLY_LENGTH) {
      console.error("A resposta do provedor de IA está vazia ou fora do limite.");
      return sendJson(res, 502, { error: "O serviço de IA retornou uma resposta inválida." });
    }
    const reply = removeMarkdownFormatting(rawReply);
    if (!reply) return sendJson(res, 502, { error: "O serviço de IA retornou uma resposta inválida." });
    return sendJson(res, 200, { reply });
  } catch (error) {
    console.error("Falha na chamada ao provedor de IA:", error instanceof Error ? error.message : "erro desconhecido");
    return sendJson(res, 502, { error: "Não foi possível conectar ao serviço de IA. Tente novamente." });
  } finally {
    clearTimeout(timeout);
  }
};
