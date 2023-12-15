import { backendCaps } from '~/modules/backend/state-backend';

import { OpenRouterIcon } from '~/common/components/icons/OpenRouterIcon';
import { CommuneIcon } from '~/common/components/icons/CommuneIcon';

import type { IModelVendor } from '../IModelVendor';
import type { OpenAIAccessSchema } from '../../transports/server/openai/openai.router';
import type { VChatFunctionIn, VChatMessageIn, VChatMessageOrFunctionCallOut, VChatMessageOut } from '../../transports/chatGenerate';

import { LLMOptionsOpenAI, openAICallChatGenerate } from '../openai/openai.vendor';
import { OpenAILLMOptions } from '../openai/OpenAILLMOptions';

import { OpenRouterSourceSetup } from './CommuneSourceSetup';


// special symbols
export const isValidOpenRouterKey = (apiKey?: string) => !!apiKey && apiKey.startsWith('sk-or-') && apiKey.length > 40;

// use OpenAI-compatible host and key
export interface SourceSetupOpenRouter {
  oaiKey: string;
  oaiHost: string;
}

/**
 * NOTE: the support is just started and incomplete - in particular it depends on some code that
 * hasn't been merged yet.
 *
 * Completion:
 *  [x] raise instanceLimit from 0 to 1 to continue development
 *  [x] add support to the OpenAI Router and Streaming function to add the headers required by OpenRouter (done in the access function)
 *  [~] merge the server-side models remapping from Azure OpenAI - not needed, using client-side remapping for now
 *  [x] decide whether to do UI work to improve the appearance - prioritized models
 *  [x] works!
 */
export const ModelVendorCommune: IModelVendor<SourceSetupOpenRouter, OpenAIAccessSchema, LLMOptionsOpenAI> = {
  id: 'commune',
  name: 'Commune',
  rank: 9,
  location: 'cloud',
  instanceLimit: 1,
  hasFreeModels: true,
  hasBackendCap: () => backendCaps().hasLlmOpenRouter,

  // components
  Icon: CommuneIcon,
  SourceSetupComponent: OpenRouterSourceSetup,
  LLMOptionsComponent: OpenAILLMOptions,

  // functions
  initializeSetup: (): SourceSetupOpenRouter => ({
    oaiHost: 'https://openrouter.ai/api',
    oaiKey: '',
  }),
  getTransportAccess: (partialSetup): OpenAIAccessSchema => ({
    dialect: 'openrouter',
    oaiKey: partialSetup?.oaiKey || '',
    oaiOrg: '',
    oaiHost: partialSetup?.oaiHost || '',
    heliKey: '',
    moderationCheck: false,
  }),
  callChatGenerate(llm, messages: VChatMessageIn[], maxTokens?: number): Promise<VChatMessageOut> {
    return openAICallChatGenerate(this.getTransportAccess(llm._source.setup), llm.options, messages, null, null, maxTokens);
  },
  callChatGenerateWF(llm, messages: VChatMessageIn[], functions: VChatFunctionIn[] | null, forceFunctionName: string | null, maxTokens?: number): Promise<VChatMessageOrFunctionCallOut> {
    return openAICallChatGenerate(this.getTransportAccess(llm._source.setup), llm.options, messages, functions, forceFunctionName, maxTokens);
  },
};