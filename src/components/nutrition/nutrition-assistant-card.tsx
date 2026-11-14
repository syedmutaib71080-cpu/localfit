"use client";

import * as React from "react";
import {
  Sparkles,
  Send,
  Loader2,
  RotateCcw,
  RefreshCw,
  Utensils,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  AssistantChatMessage,
  NutritionAssistantResponse,
} from "@/types/assistant";
import { MANDATORY_MEDICAL_DISCLAIMER } from "@/lib/ai-assistant";

export interface MessageWithMeta extends AssistantChatMessage {
  id: string;
  isEmergency?: boolean;
  contextUsed?: NutritionAssistantResponse["contextUsed"];
  isError?: boolean;
  retryMessage?: string;
  userMessageId?: string;
}

export function buildHistoryForSubmission(
  messages: MessageWithMeta[],
  beforeUserMsgId?: string
): AssistantChatMessage[] {
  let pool = messages;
  if (beforeUserMsgId) {
    const idx = messages.findIndex((m) => m.id === beforeUserMsgId);
    if (idx !== -1) {
      pool = messages.slice(0, idx);
    }
  }

  // Collect only complete, successful [user, assistant] exchanges
  const completedPairs: Array<[AssistantChatMessage, AssistantChatMessage]> = [];

  for (let i = 0; i < pool.length - 1; i++) {
    const current = pool[i];
    const next = pool[i + 1];

    if (
      current.role === "user" &&
      current.id !== "welcome-1" &&
      !current.isError &&
      typeof current.content === "string" &&
      current.content.trim() &&
      next.role === "assistant" &&
      next.id !== "welcome-1" &&
      !next.isError &&
      typeof next.content === "string" &&
      next.content.trim()
    ) {
      completedPairs.push([
        { role: "user", content: current.content.trim() },
        { role: "assistant", content: next.content.trim() },
      ]);
      // Advance past the assistant message so pairs are disjoint
      i++;
    }
  }

  // Enforce 4-message limit without splitting a completed exchange (at most 2 pairs)
  const recentPairs = completedPairs.slice(-2);
  const result: AssistantChatMessage[] = [];
  for (const pair of recentPairs) {
    result.push(pair[0], pair[1]);
  }

  return result;
}

export function prepareRetryConversation(
  messages: MessageWithMeta[],
  retryErrorId: string
): {
  nextMessages: MessageWithMeta[];
  userMsgToRetry: MessageWithMeta;
  historyPayload: AssistantChatMessage[];
} | null {
  const errorMsg = messages.find((m) => m.id === retryErrorId);
  if (!errorMsg) return null;

  // 1. Locate original user message using explicit userMessageId, with safe fallback
  let userMsg: MessageWithMeta | null = null;
  if (errorMsg.userMessageId) {
    userMsg = messages.find((m) => m.id === errorMsg.userMessageId) || null;
  }

  if (!userMsg) {
    const errorIdx = messages.findIndex((m) => m.id === retryErrorId);
    if (errorIdx > 0 && messages[errorIdx - 1].role === "user") {
      userMsg = messages[errorIdx - 1];
    } else if (errorMsg.retryMessage) {
      userMsg = {
        id: `user-msg-fallback-${retryErrorId}`,
        role: "user",
        content: errorMsg.retryMessage,
      };
    }
  }

  if (!userMsg) return null;

  // 2. Remove old error bubble and the user message from their existing positions
  const filtered = messages.filter(
    (m) => m.id !== retryErrorId && m.id !== userMsg!.id
  );

  // 3. Build history using completed exchanges in filtered (preceding the retried message's new position)
  const historyPayload = buildHistoryForSubmission(filtered);

  // 4. Move that existing user message to the end of the conversation
  const nextMessages = [...filtered, userMsg];

  return {
    nextMessages,
    userMsgToRetry: userMsg,
    historyPayload,
  };
}

export function applyRetrySuccess(
  messages: MessageWithMeta[],
  retryErrorId: string,
  assistantMsg: MessageWithMeta
): MessageWithMeta[] {
  const idx = messages.findIndex((m) => m.id === retryErrorId);
  if (idx !== -1) {
    return messages.map((m) => (m.id === retryErrorId ? assistantMsg : m));
  }
  return [...messages, assistantMsg];
}

export function applyRetryFailure(
  messages: MessageWithMeta[],
  retryErrorId: string,
  errorContent: string,
  retryMessage: string,
  userMessageId?: string
): MessageWithMeta[] {
  const idx = messages.findIndex((m) => m.id === retryErrorId);
  if (idx !== -1) {
    return messages.map((m) =>
      m.id === retryErrorId
        ? {
            ...m,
            content: errorContent,
            retryMessage,
            ...(userMessageId ? { userMessageId } : {}),
          }
        : m
    );
  }
  const errorBubble: MessageWithMeta = {
    id: retryErrorId,
    role: "assistant",
    content: errorContent,
    isError: true,
    retryMessage,
    userMessageId,
  };
  return [...messages, errorBubble];
}

const INITIAL_WELCOME_MESSAGE: MessageWithMeta = {
  id: "welcome-1",
  role: "assistant",
  content:
    "Hello! I am your **LocalFit AI Nutrition Assistant**.\n\n" +
    "You can ask me questions about food, macros, and balanced meal ideas. I am familiar with Indian and Coastal Karnataka cuisines (such as Bhatkal Biryani, Neer Dosa, and Pomfret Curry) and can contextualize answers using today's diary.\n\n" +
    "*Please note: I am an educational guide, not a physician or dietitian. I cannot diagnose medical conditions or evaluate acute symptoms.*",
};

const SUGGESTED_QUESTIONS = [
  "How is my protein intake today?",
  "Suggest a healthy Coastal Karnataka snack",
  "What are the macros for Bhatkal Biryani?",
  "What can I eat for dinner to meet my calorie goal?",
];

export function NutritionAssistantCard() {
  const [messages, setMessages] = React.useState<MessageWithMeta[]>([
    INITIAL_WELCOME_MESSAGE,
  ]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [includeDiaryContext, setIncludeDiaryContext] = React.useState(true);
  const msgCounterRef = React.useRef(0);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string, retryErrorId?: string) => {
    if (isLoading) return;

    let targetUserMsg: MessageWithMeta | null = null;
    let historyPayload: AssistantChatMessage[] = [];
    let trimmed = "";

    if (retryErrorId) {
      const prepared = prepareRetryConversation(messages, retryErrorId);
      if (!prepared) return;

      targetUserMsg = prepared.userMsgToRetry;
      trimmed = (prepared.userMsgToRetry.content || textToSend || "").trim();
      if (!trimmed) return;

      historyPayload = prepared.historyPayload;
      // Immediately move the retried user message to the end and remove its old error bubble
      setMessages(prepared.nextMessages);
    } else {
      const rawMessage = textToSend || inputValue;
      trimmed = rawMessage.trim();
      if (!trimmed) return;

      if (!textToSend) setInputValue("");
      msgCounterRef.current += 1;
      const userMsgId = `user-msg-${msgCounterRef.current}`;
      targetUserMsg = {
        id: userMsgId,
        role: "user",
        content: trimmed,
      };

      // History contains only completed exchanges preceding this new message
      historyPayload = buildHistoryForSubmission(messages);
      setMessages((prev) => [...prev, targetUserMsg!]);
    }

    setIsLoading(true);

    // Detect browser IANA timezone safely
    let userTimezone = "UTC";
    try {
      userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      userTimezone = "UTC";
    }

    try {
      const res = await fetch("/api/ai/nutrition-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: historyPayload,
          timezone: userTimezone,
          includeUserContext: includeDiaryContext,
        }),
      });

      const data = (await res.json()) as NutritionAssistantResponse;

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Your session has expired. Please sign in in another tab, then tap Retry.");
        }
        if (res.status === 429) {
          throw new Error("Assistant query limit reached (20 requests per 5 minutes). Please wait a few moments.");
        }
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }

      // Create assistant response
      msgCounterRef.current += 1;
      const assistantMsg: MessageWithMeta = {
        id: `assistant-msg-${msgCounterRef.current}`,
        role: "assistant",
        content: data.message,
        isEmergency: data.isEmergency,
        contextUsed: data.contextUsed,
      };

      // Append assistant response after targetUserMsg (which is at the end)
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Network error communicating with AI assistant.";
      const errorContent = `⚠️ **Unable to complete response**\n\n${errText}`;

      msgCounterRef.current += 1;
      const errorBubble: MessageWithMeta = {
        id: `error-msg-${msgCounterRef.current}`,
        role: "assistant",
        content: errorContent,
        isError: true,
        retryMessage: trimmed,
        userMessageId: targetUserMsg?.id, // Explicit user message association
      };

      // Append error bubble after targetUserMsg (which is at the end)
      setMessages((prev) => [...prev, errorBubble]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConversation = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setInputValue("");
  };

  return (
    <Card variant="cream" className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5DD]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E2ECE4] border border-[#C7DBD0] flex items-center justify-center text-[#375A41]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1F1D]">LocalFit AI Nutrition Assistant</h2>
              <p className="text-xs text-[#575E59]">
                Interactive guidance for meals, macros, and Indian &amp; Coastal Karnataka cuisines
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Context Toggle & Reset */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#575E59] cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-[#E8E5DD] hover:border-[#437151] transition-colors">
            <input
              type="checkbox"
              checked={includeDiaryContext}
              onChange={(e) => setIncludeDiaryContext(e.target.checked)}
              className="rounded border-[#C7DBD0] text-[#437151] focus:ring-[#437151] h-3.5 w-3.5"
            />
            <span className="font-medium text-[11px]">Include Today&apos;s Diary</span>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetConversation}
            icon={<RotateCcw size={13} />}
            iconPosition="left"
            className="text-xs text-[#575E59]"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-[#575E59] uppercase tracking-wider block">
          Suggested Questions:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[#E8E5DD] bg-white text-[#263B2C] hover:bg-[#FAF8F5] hover:border-[#437151] transition-colors disabled:opacity-50 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Message List */}
      <div className="space-y-3 min-h-[300px] max-h-[460px] overflow-y-auto p-3 rounded-xl bg-white border border-[#E8E5DD]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#E2ECE4] text-[#1C1F1D] border border-[#C7DBD0] rounded-br-xs"
                  : msg.isEmergency
                  ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] rounded-bl-xs shadow-xs"
                  : msg.isError
                  ? "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] rounded-bl-xs"
                  : "bg-[#FAF8F5] text-[#1C1F1D] border border-[#E8E5DD] rounded-bl-xs"
              }`}
            >
              <div className="whitespace-pre-wrap space-y-2">
                {msg.content}
              </div>

              {/* Context Pill (if attached to assistant response) */}
              {msg.contextUsed && (
                <div className="mt-2 pt-2 border-t border-[#E8E5DD] flex items-center gap-1.5 text-[10px] text-[#575E59]">
                  <Utensils size={11} className="text-[#375A41]" />
                  <span>
                    Context used: {msg.contextUsed.date} &bull;{" "}
                    {msg.contextUsed.hasLoggedMeals
                      ? `${msg.contextUsed.caloriesLogged} kcal logged (${msg.contextUsed.proteinLogged}g P)`
                      : "No meals logged today"}
                    {msg.contextUsed.calorieGoal ? ` &bull; Goal: ${msg.contextUsed.calorieGoal} kcal` : ""}
                  </span>
                </div>
              )}

              {/* Inline Retry Button for errors */}
              {msg.isError && msg.retryMessage && (
                <div className="mt-2 pt-2 border-t border-[#FDE68A] flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSendMessage(msg.retryMessage, msg.id)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#92400E] hover:underline disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
                    <span>Retry Question</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-[#FAF8F5] border border-[#E8E5DD] rounded-2xl rounded-bl-xs p-3 text-xs text-[#575E59] flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-[#437151]" />
              <span>Analyzing nutrition &amp; consulting culinary database...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a nutrition question (e.g. 'How much protein in 2 eggs and 1 roti?')..."
            disabled={isLoading}
            maxLength={1000}
            className="flex-1 rounded-xl border border-[#E8E5DD] bg-white px-3.5 py-2.5 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] placeholder:text-[#A8A29E]"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading || !inputValue.trim()}
            icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            iconPosition="right"
            className="text-xs shrink-0 py-2.5 px-4"
          >
            Ask
          </Button>
        </div>

        {/* Mandatory Medical Disclaimer Banner */}
        <p className="text-[10px] text-[#717A73] leading-relaxed px-1">
          {MANDATORY_MEDICAL_DISCLAIMER}
        </p>
      </form>
    </Card>
  );
}
