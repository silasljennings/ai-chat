import type { Message } from 'ai';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';

import {CopyIcon, LogoAnthropic, LogoGoogle, LogoOpenAI, SparklesIcon, ThumbDownIcon, ThumbUpIcon} from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import React, {memo, useState} from 'react';
import equal from 'fast-deep-equal';
import { toast } from 'sonner';
import {saveChatModelAsCookie} from "@/app/(chat)/actions";

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  handleRegenerate,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
  handleRegenerate: (assistantMessageId: string) => void;
}) {
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const { mutate } = useSWRConfig();

  const [_, copyToClipboard] = useCopyToClipboard();
    if (isLoading) return null;
    if (message.role === 'user') return null;

    const handleRegenerationClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setIsRegenerating(true);
        const assistantMessageId = e.currentTarget.id.split(';')[1];
        await saveChatModelAsCookie(e.currentTarget.id.split(';')[0]);
        await handleRegenerate(assistantMessageId);
        setIsRegenerating(false);
    };

    return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2 w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-upvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              disabled={vote?.isUpvoted}
              variant="outline"
              onClick={async () => {
                const upvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'up',
                  }),
                });

                toast.promise(upvote, {
                  loading: 'Upvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: true,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Upvoted Response!';
                  },
                  error: 'Failed to upvote response.',
                });
              }}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-downvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              variant="outline"
              disabled={vote && !vote.isUpvoted}
              onClick={async () => {
                const downvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'down',
                  }),
                });

                toast.promise(downvote, {
                  loading: 'Downvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: false,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Downvoted Response!';
                  },
                  error: 'Failed to downvote response.',
                });
              }}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>


        {/* Add assistant buttons */}
          <div className="relative flex flex-row gap-2 justify-end items-center w-full">
              <button onClick={(e) => handleRegenerationClick(e)} id={`gemini;${message.id}`}
                      className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background hover:invert">
                  <div className="translate-y-px">
                      <LogoGoogle size={14}/>
                  </div>
              </button>
              <button onClick={(e) => handleRegenerationClick(e)} id={`anthropic;${message.id}`}
                      className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background hover:invert">
                  <div className="translate-y-px">
                      <LogoAnthropic size={14}/>
                  </div>
              </button>
              <button onClick={(e) => handleRegenerationClick(e)} id={`openai;${message.id}`}
                      className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background hover:invert">
                  <div className="translate-y-px">
                      <LogoOpenAI size={14}/>
                  </div>
              </button>
              <button onClick={(e) => handleRegenerationClick(e)} id={`deepseek;${message.id}`}
                      className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background hover:invert">
                  <div className="translate-y-px">
                      <SparklesIcon size={14}/>
                  </div>
              </button>
              <button onClick={(e) => handleRegenerationClick(e)} id={`xai;${message.id}`}
                      className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background hover:invert">
                  <div className="translate-y-px">
                      <SparklesIcon size={14}/>
                  </div>
              </button>
              <button className="size-8 flex items-center rounded-full justify-center shrink-0 bg-background">
                  <div className="translate-y-px">
                      {isRegenerating ? (
                          <div className="relative w-6 h-6">
                              {/* Circular Progress with rotating ring */}
                              <svg className="animate-spin absolute w-6 h-6 text-muted" viewBox="0 0 24 24"
                                   fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"
                                          strokeLinecap="round" fill="none"/>
                                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"
                                          strokeLinecap="round" fill="none" strokeDasharray="62"
                                          strokeDashoffset="31">
                                      <animateTransform attributeName="transform" type="rotate" from="0 12 12"
                                                        to="360 12 12" dur="1s" repeatCount="indefinite"/>
                                  </circle>
                              </svg>
                          </div>
                      ) : null}
                  </div>
              </button>
          </div>
      </div>
    </TooltipProvider>
    );
}

export const MessageActions = memo(
    PureMessageActions,
    (prevProps, nextProps) => {
        if (!equal(prevProps.vote, nextProps.vote)) return false;
        if (prevProps.isLoading !== nextProps.isLoading) return false;

        return true;
    },
);
