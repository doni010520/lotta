"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { MessageSquare, Bot, User, Clock } from "lucide-react";

export default function ConversasPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        loadConversations();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (selected && payload.new.conversation_id === selected.id) {
          setMessages((prev) => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selected?.id]);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);
    setConversations(data ?? []);
    setLoading(false);
  }

  async function selectConversation(conv: any) {
    setSelected(conv);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data ?? []);

    // Mark as read
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conv.id);
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cafe mb-6">Conversas</h1>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        {/* Conversation list */}
        <div className="w-80 bg-white rounded-xl border overflow-y-auto flex-shrink-0">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">Nenhuma conversa ainda</div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full p-3 border-b text-left hover:bg-gray-50 ${
                  selected?.id === conv.id ? "bg-paprica/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{conv.contact_name || conv.contact_phone}</p>
                  {conv.unread_count > 0 && (
                    <span className="bg-paprica/100 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {conv.status === "bot" && <Bot className="w-3 h-3 text-purple-400" />}
                  {conv.status === "human" && <User className="w-3 h-3 text-blue-400" />}
                  <span className="text-xs text-gray-400 capitalize">{conv.status}</span>
                  {conv.last_message_at && (
                    <span className="text-xs text-gray-300 ml-auto">
                      {new Date(conv.last_message_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-xl border flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-300">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Selecione uma conversa</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{selected.contact_name || selected.contact_phone}</p>
                  <p className="text-xs text-gray-400">{selected.contact_phone}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  selected.status === "bot" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                }`}>
                  {selected.status === "bot" ? "Bot ativo" : "Atendimento humano"}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                      msg.direction === "out"
                        ? "bg-paprica text-white rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}>
                      {msg.body || `[${msg.content_type}]`}
                      <div className={`text-[10px] mt-0.5 ${msg.direction === "out" ? "text-paprica-light/50" : "text-gray-400"}`}>
                        {msg.sender_type === "bot" && "🤖 "}
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
