
/**
 *
 * @param setMessages
 * @param messages
 * @param append
 * @param messageId
 * @param chatRequestOptions
 */
import {UseAssistantHelpers, UseChatHelpers} from "@ai-sdk/react";
import {ChatRequestOptions, Message, UIMessage} from "ai";
import {getMessageById} from "@/lib/db/queries";

export async function reloadAt(
    setMessages: UseChatHelpers["setMessages"],
    messages: UseChatHelpers["messages"],
    reload: UseChatHelpers["reload"],
    append: UseChatHelpers["append"],
    messageId: string,
    chatRequestOptions?: ChatRequestOptions
) {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) { throw new Error(`Message with id "${messageId}" not found.`); }

    const all = structuredClone(messages);
    console.log(`all ${JSON.stringify(all)}}`)
    const before = messages.slice(0, messageIndex) as Message[];
    console.log(`before ${JSON.stringify(before)}}`)
    console.log("messageIndex", messageIndex);
    console.log("messages.length", messages.length);
    console.log("messages[messageIndex]", messages[messageIndex]);
    setMessages(before);
    await reload();
    setMessages((current) => {
        const currentIds = new Set(current.map((msg) => msg.id));
        const allMap = new Map(all.map((msg) => [msg.id, msg]));

        // Override with current versions first
        const merged = current.map((msg) => allMap.get(msg.id) || msg);

        // Then append messages in "all" that are not in current
        for (const msg of all) {
            if (!currentIds.has(msg.id)) {
                merged.push(msg);
            }
        }

        return merged;
    });

}
