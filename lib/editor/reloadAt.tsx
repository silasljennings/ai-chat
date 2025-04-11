
/**
 *
 * @param setMessages
 * @param messages
 * @param append
 * @param messageId
 * @param chatRequestOptions
 */
import { UseChatHelpers } from "@ai-sdk/react";
import { ChatRequestOptions, Message } from "ai";

export async function reloadAt(
    setMessages: UseChatHelpers["setMessages"],
    messages: UseChatHelpers["messages"],
    append: UseChatHelpers["append"],
    messageId: string,
    chatRequestOptions?: ChatRequestOptions
) {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
        throw new Error(`Message with id "${messageId}" not found.`);
    }

    const before = messages.slice(0, messageIndex);
    const target = messages[messageIndex];
    const after = messages.slice(messageIndex);

    if (target.role !== "assistant") {
        throw new Error("Can only regenerate assistant messages.");
    }

    const lastUserMessage = [...before].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
        throw new Error("No preceding user message found.");
    }

    const lastUserIndex = before.findIndex((m) => m.id === lastUserMessage.id);
    const messagesToKeep = before.slice(0, lastUserIndex + 1);

    // Step 1: temporarily set UI to only show messages up to user prompt
    // setMessages(messagesToKeep);

    // Step 2: regenerate assistant message via append
    await append(
        { role: "user", content: lastUserMessage.content, id: lastUserMessage.id },
        chatRequestOptions
    );

    // Step 3: restore remaining messages to the UI (excluding regenerated assistant message)
    setMessages((currentMessages) => [...currentMessages, ...after]);
}
