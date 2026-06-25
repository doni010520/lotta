import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface AgentConfig {
  restaurantId: string;
  agentName: string;
  agentPersona: string;
  restaurantName: string;
}

interface ConversationContext {
  conversationId: string;
  customerPhone: string;
  customerName?: string;
}

// ── Build system prompt with restaurant data ─────────────────────────
async function buildSystemPrompt(config: AgentConfig): Promise<string> {
  // Load catalog
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", config.restaurantId)
    .eq("is_active", true)
    .order("sort_order");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, promo_price, category_id, option_groups(name, min_select, max_select, is_required, options(name, price))")
    .eq("restaurant_id", config.restaurantId)
    .eq("is_active", true)
    .order("sort_order");

  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("name, fee, estimated_min")
    .eq("restaurant_id", config.restaurantId)
    .eq("is_active", true);

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("is_open, min_order, avg_prep_time, slug")
    .eq("id", config.restaurantId)
    .single();

  // Build catalog XML
  let catalogXml = "<cardapio>\n";
  for (const cat of categories ?? []) {
    catalogXml += `  <categoria nome="${cat.name}">\n`;
    const catProducts = (products ?? []).filter((p) => p.category_id === cat.id);
    for (const prod of catProducts) {
      const price = prod.promo_price ?? prod.price;
      catalogXml += `    <produto id="${prod.id}" nome="${prod.name}" preco="${price.toFixed(2)}"`;
      if (prod.description) catalogXml += ` descricao="${prod.description}"`;
      catalogXml += ">\n";
      for (const group of prod.option_groups ?? []) {
        catalogXml += `      <opcoes grupo="${group.name}" obrigatorio="${group.is_required}" min="${group.min_select}" max="${group.max_select}">\n`;
        for (const opt of (group as any).options ?? []) {
          catalogXml += `        <opcao nome="${opt.name}" preco="${opt.price.toFixed(2)}" />\n`;
        }
        catalogXml += "      </opcoes>\n";
      }
      catalogXml += "    </produto>\n";
    }
    catalogXml += "  </categoria>\n";
  }
  catalogXml += "</cardapio>";

  let zonesXml = "<zonas_entrega>\n";
  for (const z of zones ?? []) {
    zonesXml += `  <zona nome="${z.name}" taxa="${z.fee.toFixed(2)}" tempo="${z.estimated_min}min" />\n`;
  }
  zonesXml += "</zonas_entrega>";

  return `Você é ${config.agentName}, assistente virtual do restaurante ${config.restaurantName}.

<personalidade>
${config.agentPersona}
</personalidade>

<regras>
- Você atende pedidos de delivery via WhatsApp
- Seja simpático, direto e eficiente
- Sempre confirme o pedido completo antes de finalizar
- Sugira complementos quando fizer sentido (ex: bebida com hambúrguer, sobremesa após refeição)
- Quando o cliente pedir algo que não existe no cardápio, informe educadamente e sugira alternativas
- Para consultar status de pedido, peça o número do pedido
- Se o cliente pedir para falar com um humano, transfira imediatamente
- Nunca invente produtos ou preços que não estão no cardápio
- Pedido mínimo: R$ ${restaurant?.min_order?.toFixed(2) ?? "0.00"}
- Tempo médio de preparo: ${restaurant?.avg_prep_time ?? 30} minutos
- Restaurante está ${restaurant?.is_open ? "ABERTO" : "FECHADO"}
- Link do cardápio digital: lotta.app/${restaurant?.slug}
</regras>

${catalogXml}

${zonesXml}

<ferramentas>
Quando o cliente confirmar o pedido completo, responda com um bloco XML:
<criar_pedido>
  <itens>
    <item produto_id="..." nome="..." quantidade="..." preco_unitario="..." opcoes="opção1, opção2" observacao="..." />
  </itens>
  <endereco rua="..." numero="..." bairro="..." complemento="..." />
  <pagamento metodo="pix|dinheiro|maquininha" />
  <observacao>...</observacao>
</criar_pedido>

Para consultar status de um pedido:
<consultar_pedido numero="123" />

Para transferir para humano:
<transferir_humano motivo="..." />
</ferramentas>`;
}

// ── Transcribe audio via Whisper ─────────────────────────────────────
async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    const audioRes = await fetch(audioUrl);
    const buffer = Buffer.from(await audioRes.arrayBuffer());

    const file = new File([buffer], "audio.ogg", { type: "audio/ogg" });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "pt",
    });
    return transcription.text;
  } catch (err) {
    console.error("Whisper transcription failed:", err);
    return "[áudio não reconhecido]";
  }
}

// ── Process tool calls from agent response ───────────────────────────
async function processToolCalls(
  response: string,
  config: AgentConfig,
  ctx: ConversationContext,
): Promise<{ action: string; data?: any } | null> {
  // Check for order creation
  const orderMatch = response.match(/<criar_pedido>([\s\S]*?)<\/criar_pedido>/);
  if (orderMatch) {
    return { action: "create_order", data: orderMatch[1] };
  }

  // Check for order status query
  const statusMatch = response.match(/<consultar_pedido\s+numero="(\d+)"/);
  if (statusMatch) {
    const orderNum = parseInt(statusMatch[1]);
    const { data: order } = await supabase
      .from("orders")
      .select("status, created_at, total")
      .eq("restaurant_id", config.restaurantId)
      .eq("order_number", orderNum)
      .single();

    return { action: "order_status", data: order };
  }

  // Check for human handoff
  if (response.includes("<transferir_humano")) {
    return { action: "handoff" };
  }

  return null;
}

// ── Create order with verify-after-write ─────────────────────────────
async function createOrderFromAgent(
  xmlData: string,
  config: AgentConfig,
  ctx: ConversationContext,
): Promise<{ success: boolean; orderNumber?: number; error?: string }> {
  try {
    // Parse items from XML (simplified parser)
    const itemMatches = [...xmlData.matchAll(/<item\s+([^/]*?)\/>/g)];
    if (itemMatches.length === 0) return { success: false, error: "Nenhum item encontrado" };

    const items: any[] = [];
    let subtotal = 0;

    for (const match of itemMatches) {
      const attrs = match[1];
      const getId = (name: string) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";

      const qty = parseInt(getId("quantidade")) || 1;
      const price = parseFloat(getId("preco_unitario")) || 0;
      const total = price * qty;
      subtotal += total;

      items.push({
        product_id: getId("produto_id") || null,
        product_name: getId("nome"),
        quantity: qty,
        unit_price: price,
        total_price: total,
        options: getId("opcoes") ? getId("opcoes").split(",").map((o: string) => ({
          group_name: "", option_name: o.trim(), price: 0,
        })) : [],
        notes: getId("observacao") || null,
      });
    }

    // Parse payment
    const paymentMatch = xmlData.match(/metodo="([^"]*)"/);
    const paymentMethod = paymentMatch?.[1] === "pix" ? "pix"
      : paymentMatch?.[1] === "maquininha" ? "card_on_delivery"
      : "cash";

    // Find or create customer
    const phone = ctx.customerPhone.replace(/\D/g, "");
    let { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("restaurant_id", config.restaurantId)
      .eq("phone", phone)
      .single();

    if (!customer) {
      const { data: newCust } = await supabase
        .from("customers")
        .insert({
          restaurant_id: config.restaurantId,
          name: ctx.customerName || null,
          phone,
          source: "whatsapp",
        })
        .select("id")
        .single();
      customer = newCust;
    }

    // WRITE: Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: config.restaurantId,
        customer_id: customer?.id,
        channel: "whatsapp",
        status: paymentMethod === "pix" ? "pending" : "confirmed",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "pix" ? "pending" : "paid",
        subtotal,
        delivery_fee: 0,
        total: subtotal,
        customer_name: ctx.customerName || null,
        customer_phone: phone,
      })
      .select("id, order_number")
      .single();

    if (orderErr) return { success: false, error: orderErr.message };

    // Insert items
    await supabase.from("order_items").insert(
      items.map((item) => ({
        ...item,
        order_id: order!.id,
        restaurant_id: config.restaurantId,
      })),
    );

    // Status history
    await supabase.from("order_status_history").insert({
      order_id: order!.id,
      restaurant_id: config.restaurantId,
      to_status: paymentMethod === "pix" ? "pending" : "confirmed",
      notes: "Pedido criado via WhatsApp IA",
    });

    // VERIFY-AFTER-WRITE: Read back and confirm
    const { data: verification } = await supabase
      .from("orders")
      .select("id, order_number, total, status")
      .eq("id", order!.id)
      .single();

    if (!verification || verification.total !== subtotal) {
      // Rollback
      await supabase.from("order_items").delete().eq("order_id", order!.id);
      await supabase.from("orders").delete().eq("id", order!.id);
      return { success: false, error: "Verificação pós-escrita falhou. Pedido não confirmado." };
    }

    // Update customer stats
    await supabase.rpc("increment_customer_stats", {
      p_customer_id: customer?.id,
      p_total: subtotal,
    }).catch(() => {});

    return { success: true, orderNumber: verification.order_number };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Main agent handler ───────────────────────────────────────────────
export async function handleMessage(
  config: AgentConfig,
  ctx: ConversationContext,
  contentType: string,
  body: string | undefined,
  mediaUrl: string | undefined,
): Promise<{ text: string; action?: string; actionData?: any }> {
  // Transcribe audio
  let userMessage = body ?? "";
  if (contentType === "audio" && mediaUrl) {
    userMessage = await transcribeAudio(mediaUrl);
  } else if (contentType === "image" && !body) {
    userMessage = "[cliente enviou uma imagem]";
  } else if (contentType === "sticker") {
    userMessage = "[figurinha]";
  }

  if (!userMessage.trim()) {
    return { text: "Não consegui entender. Pode repetir, por favor?" };
  }

  // Load conversation history
  const { data: history } = await supabase
    .from("messages")
    .select("direction, body, sender_type")
    .eq("conversation_id", ctx.conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // System prompt
  const systemPrompt = await buildSystemPrompt(config);
  messages.push({ role: "system", content: systemPrompt });

  // Add history (reversed to chronological)
  for (const msg of (history ?? []).reverse()) {
    if (!msg.body) continue;
    messages.push({
      role: msg.direction === "in" ? "user" : "assistant",
      content: msg.body,
    });
  }

  // Current message
  messages.push({ role: "user", content: userMessage });

  // Call LLM
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    max_tokens: 1000,
    temperature: 0.7,
  });

  let response = completion.choices[0]?.message?.content ?? "Desculpe, tive um problema. Tente novamente.";

  // Process tool calls
  const toolResult = await processToolCalls(response, config, ctx);

  if (toolResult?.action === "create_order") {
    const result = await createOrderFromAgent(toolResult.data, config, ctx);
    if (result.success) {
      // Clean XML from response and add confirmation
      response = response.replace(/<criar_pedido>[\s\S]*?<\/criar_pedido>/, "").trim();
      response += `\n\nPedido #${result.orderNumber} criado com sucesso! Vou te manter atualizado sobre o preparo.`;
    } else {
      response = `Ops, tive um problema ao registrar o pedido: ${result.error}. Pode confirmar os itens novamente?`;
    }
    return { text: response, action: "order_created", actionData: result };
  }

  if (toolResult?.action === "order_status") {
    const statusLabels: Record<string, string> = {
      pending: "pendente",
      confirmed: "confirmado",
      preparing: "em preparo",
      ready: "pronto para entrega",
      dispatched: "saiu para entrega",
      delivered: "entregue",
      cancelled: "cancelado",
    };
    const order = toolResult.data;
    if (order) {
      response = response.replace(/<consultar_pedido[^/]*\/>/, "").trim();
      response += `\n\nStatus do pedido: ${statusLabels[order.status] ?? order.status}`;
    }
  }

  if (toolResult?.action === "handoff") {
    // Mark conversation for human
    await supabase
      .from("conversations")
      .update({ status: "human" })
      .eq("id", ctx.conversationId);

    response = response.replace(/<transferir_humano[^/]*\/>/, "").trim();
    return { text: response, action: "handoff" };
  }

  // Clean any remaining XML tags
  response = response.replace(/<[^>]+>/g, "").trim();

  return { text: response };
}
