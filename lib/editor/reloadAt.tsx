
/**
 *
 * @param setMessages
 * @param messages
 * @param append
 * @param messageId
 * @param chatRequestOptions
 */
import { UseChatHelpers } from "@ai-sdk/react";
import {ChatRequestOptions, Message, UIMessage} from "ai";
import {getMessageById} from "@/lib/db/queries";

export async function reloadAt(
    setMessages: UseChatHelpers["setMessages"],
    messages: UseChatHelpers["messages"],
    reload: UseChatHelpers["reload"],
    messageId: string,
    chatRequestOptions?: ChatRequestOptions
) {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) { throw new Error(`Message with id "${messageId}" not found.`); }

    const before = messages.slice(0, messageIndex) as Message[];
    const target = messages[messageIndex] as Message;
    const after = messages.slice(messageIndex + 1) as Message[];
    console.log(`before ${JSON.stringify(before)}}`)
    console.log(`target ${JSON.stringify(target)}`)
    console.log(`After ${JSON.stringify(after)}}`)
    console.log("messageIndex", messageIndex);
    console.log("messages.length", messages.length);
    console.log("messages[messageIndex]", messages[messageIndex]);
    if (target.role !== "assistant") { throw new Error("Can only regenerate assistant messages."); }

    const lastUserMessage = [...before].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) { throw new Error("No preceding user message found."); }

    const lastUserIndex = before.findIndex((m) => m.id === lastUserMessage.id);
    const messagesToKeep = before.slice(0, lastUserIndex + 1);

    setMessages(messagesToKeep);
    await reload()
    setMessages((current) => [...current, ...after]);
}
