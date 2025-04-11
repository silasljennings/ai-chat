
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
import {getMessageById, saveMessages} from "@/lib/db/queries";
import {reGenerateTextFromUserMessage} from "@/app/(chat)/actions";

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
    console.log("messageIndex", messageIndex);
    console.log("messages.length", messages.length);
    console.log("messages[messageIndex]", messages[messageIndex]);
    const newResponse = await reGenerateTextFromUserMessage({ message: messages[messageIndex] as Message })
    messages[messageIndex].content = newResponse;
    setMessages(messages);

    const all = structuredClone(messages) as Message[];
    console.log(`all ${JSON.stringify(all)}}`)
    const before = messages.slice(0, messageIndex) as Message[];
    console.log(`before ${JSON.stringify(before)}}`)

    // setMessages(before);
    // await reload();
    // setMessages(all)
}
