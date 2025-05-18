import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray, lt, SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  Chat,
} from './schema';
import { ArtifactKind } from '@/components/artifact';
import {reGenerateTextFromUserMessage} from "@/app/(chat)/actions";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<DBMessage>; }) {
  try {
    for (const messageRecord of messages) {
      if (messageRecord.id) {
        const existing = await getMessageById({ id: messageRecord.id });
        console.log(existing);
        if (existing && existing.length > 0) {
          console.log(`message exists: ${existing}`);
          await db.update(message).set(messageRecord).where(eq(message.id, messageRecord.id));
        } else {
          console.log(`new message: ${messageRecord}`);
          await db.insert(message).values(messageRecord);
        }
      } else {
        throw new Error(`Record does not have id: ${messageRecord}`);
      }
    }
    return messages;
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}


export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function deleteMessageById({ id }: { id: string }) {
  try {
    return await db.delete(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to delete message by id');
    throw error;
  }
}

export async function updateChatVisibilityById({ chatId, visibility }: { chatId: string;  visibility: 'private' | 'public'; }) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function reloadAt({ chatId, assistantMessageId, model }: { chatId: string, assistantMessageId: string, model: string }): Promise<DBMessage> {
  try {

    // safely extract the data from the assistant message -> the previous response
    const assistantMessageQueryResults: DBMessage[] = await getMessageById({id: assistantMessageId});
    if (!assistantMessageQueryResults || assistantMessageQueryResults.length === 0) { throw Error('Assistant Message could not be found for re-prompting.'); }
    const assistantMessage: DBMessage = assistantMessageQueryResults[0];
    if (!assistantMessage) { throw new Error('Assistant Message is null or undefined'); }
    if (!assistantMessage.relativeMessageId) { throw new Error('Assistant Message does not have a relative message to re-prompt'); }
    if (!assistantMessage.parts) { throw new Error('Assistant Message does not have message parts to use for re-prompting'); }
    const assistantMessageParts: [{ type: string, text: string }] = assistantMessage.parts as [{ type: string, text: string }];
    const assistantMessagePartsFiltered = assistantMessageParts.filter(part => part.type && part.text) as [{ type: string, text: string }];
    if (assistantMessagePartsFiltered[0].type !== "text") { throw Error('Messages must be of type text'); }
    const response = assistantMessagePartsFiltered[0].text;

    // safely extract the data from the user message - the prompt that generated the previous response
    const userMessageQueryResults: DBMessage[] = await getMessageById({ id: assistantMessage.relativeMessageId });
    if (!userMessageQueryResults || userMessageQueryResults.length === 0) { throw Error('User Message could not be found for re-prompting.'); }
    const userMessage: DBMessage = userMessageQueryResults[0];
    if (!userMessage) { throw new Error('User Message is null or undefined'); }
    if (!userMessage.parts) { throw new Error('User Message does not have message parts to use for re-prompting'); }
    const userMessageParts: [{ type: string, text: string }] = userMessage.parts as [{ type: string, text: string }];
    if (!userMessageParts) { throw Error('Prompt is undefined') }
    if (userMessageParts[0].type !== "text") { throw Error('Prompt must be of type text'); }
    const prompt = userMessageParts[0].text;

    // regenerate a new response
    const newResponse = await reGenerateTextFromUserMessage({ prompt: prompt, response: response, model: model });

    // reset the parts value of the assistant message to the new response value
    const partIndex = assistantMessageParts.findIndex(part => part.type === 'text' && part.text === response);
    if (partIndex !== -1) {
      assistantMessageParts[partIndex].text = newResponse;
    } else { throw new Error('Original message part not found for replacement'); }

    // update the regenerated message to the database
    const newAssistantMessage: DBMessage = {
      id: assistantMessageQueryResults[0].id,
      chatId: chatId,
      role: assistantMessageQueryResults[0].role,
      createdAt: assistantMessageQueryResults[0].createdAt,
      updatedAt: new Date(),
      parts: assistantMessageParts,
      attachments:  assistantMessageQueryResults[0].attachments ?? [],
      relativeMessageId: assistantMessageQueryResults[0].relativeMessageId,
    };
    await saveMessages({ messages: [newAssistantMessage] });

    // return the assistant message for ui
    return newAssistantMessage;
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}


