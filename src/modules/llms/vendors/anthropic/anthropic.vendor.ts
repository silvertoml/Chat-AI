import { backendCaps } from '~/modules/backend/state-backend';

import { AnthropicIcon } from '~/common/components/icons/AnthropicIcon';
import { apiAsync } from '~/common/util/trpc.client';

import type { IModelVendor } from '../IModelVendor';
import type { AnthropicAccessSchema } from '../../transports/server/anthropic/anthropic.router';
import type { VChatMessageIn, VChatMessageOrFunctionCallOut, VChatMessageOut } from '../../transports/chatGenerate';

import { LLMOptionsOpenAI } from '../openai/openai.vendor';
import { OpenAILLMOptions } from '../openai/OpenAILLMOptions';

import { AnthropicSourceSetup } from './AnthropicSourceSetup';


// special symbols
export const isValidAnthropicApiKey = (apiKey?: string) => !!apiKey && (apiKey.startsWith('sk-') ? apiKey.length > 40 : apiKey.length >= 40);

export interface SourceSetupAnthropic {
  anthropicKey: string;
  anthropicHost: string;
  heliconeKey: string;
}

export const ModelVendorAnthropic: IModelVendor<SourceSetupAnthropic, AnthropicAccessSchema, LLMOptionsOpenAI> = {
  id: 'anthropic',
  name: 'Anthropic',
  rank: 13,
  location: 'cloud',
  instanceLimit: 1,
  hasBackendCap: () => backendCaps().hasLlmAnthropic,

  // components
  Icon: AnthropicIcon,
  SourceSetupComponent: AnthropicSourceSetup,
  LLMOptionsComponent: OpenAILLMOptions,

  // functions
  getTransportAccess: (partialSetup): AnthropicAccessSchema => ({
    dialect: 'anthropic',
    anthropicKey: partialSetup?.anthropicKey || '',
    anthropicHost: partialSetup?.anthropicHost || null,
    heliconeKey: partialSetup?.heliconeKey || null,
  }),
  callChatGenerate(llm, messages: VChatMessageIn[], maxTokens?: number): Promise<VChatMessageOut> {
    return anthropicCallChatGenerate(this.getTransportAccess(llm._source.setup), llm.options, messages, /*null, null,*/ maxTokens);
  },
  callChatGenerateWF(): Promise<VChatMessageOrFunctionCallOut> {
    throw new Error('Anthropic does not support "Functions" yet');
  },
};


/**
 * This function either returns the LLM message, or function calls, or throws a descriptive error string
 */
async function anthropicCallChatGenerate<TOut = VChatMessageOut>(
  access: AnthropicAccessSchema, llmOptions: Partial<LLMOptionsOpenAI>, messages: VChatMessageIn[],
  // functions: VChatFunctionIn[] | null, forceFunctionName: string | null,
  maxTokens?: number,
): Promise<TOut> {
  const { llmRef, llmTemperature = 0.5, llmResponseTokens } = llmOptions;
  try {
    return await apiAsync.llmAnthropic.chatGenerate.mutate({
      access,
      model: {
        id: llmRef!,
        temperature: llmTemperature,
        maxTokens: maxTokens || llmResponseTokens || 1024,
      },
      history: messages,
    }) as TOut;
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Anthropic Chat Generate Error';
    console.error(`anthropicCallChatGenerate: ${errorMessage}`);
    throw new Error(errorMessage);
  }
}