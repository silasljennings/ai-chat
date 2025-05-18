import {anthropic, createAnthropic} from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createProviderRegistry } from 'ai';
import {createDeepSeek} from "@ai-sdk/deepseek";
import {createGoogleGenerativeAI} from "@ai-sdk/google";
import {createXai} from "@ai-sdk/xai";

export const registry = createProviderRegistry({
    // register provider with prefix and default setup:
    anthropic: createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    }),

    // register provider with prefix and custom setup:
    openai: createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    }),

    deepseek: createDeepSeek({
        apiKey: process.env.DEEPSEEK_API_KEY,
    }),

    gemini: createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
    }),

    xAi: createXai({
        apiKey: process.env.XAI_API_KEY,
    })
});