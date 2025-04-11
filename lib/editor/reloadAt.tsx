import {UseChatHelpers} from "@ai-sdk/react";
import {ChatRequestOptions} from "ai";

/**
 *
 * @param setMessages
 * @param messages
 * @param append
 * @param messageId
 * @param chatRequestOptions
 */
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

    // Trim messages up to the selected message
    const truncatedMessages = messages.slice(0, messageIndex + 1);

    // Find the last user message in the truncated list
    const lastUserMessage = [...truncatedMessages]
        .reverse()
        .find((m) => m.role === "user");

    if (!lastUserMessage) {
        throw new Error("No user message found to regenerate from.");
    }

    // Reset state
    setMessages(truncatedMessages);

    // Trigger regeneration
    append(
        { role: "user", content: lastUserMessage.content, id: lastUserMessage.id },
        chatRequestOptions
    );
}
