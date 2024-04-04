import * as React from 'react';

import { Alert } from '@mui/joy';

import { FormInputKey } from '~/common/components/forms/FormInputKey';
import { FormTextField } from '~/common/components/forms/FormTextField';
import { InlineError } from '~/common/components/InlineError';
import { Link } from '~/common/components/Link';
import { SetupFormRefetchButton } from '~/common/components/forms/SetupFormRefetchButton';
import { useToggleableBoolean } from '~/common/util/useToggleableBoolean';

import { DModelSourceId } from '../../store-llms';
import { useLlmUpdateModels } from '../useLlmUpdateModels';
import { useSourceSetup } from '../useSourceSetup';

import { isValidAnthropicApiKey, ModelVendorAnthropic } from './anthropic.vendor';


export function AnthropicSourceSetup(props: { sourceId: DModelSourceId }) {

  // state
  const advanced = useToggleableBoolean();

  // external state
  const { source, sourceHasLLMs, access, hasNoBackendCap: needsUserKey, updateSetup } =
    useSourceSetup(props.sourceId, ModelVendorAnthropic);

  // derived state
  const { anthropicKey, anthropicHost, heliconeKey } = access;

  const keyValid = isValidAnthropicApiKey(anthropicKey);
  const keyError = (/*needsUserKey ||*/ !!anthropicKey) && !keyValid;
  const shallFetchSucceed = anthropicKey ? keyValid : (!needsUserKey || !!anthropicHost);

  // fetch models
  const { isFetching, refetch, isError, error } =
    useLlmUpdateModels(ModelVendorAnthropic, access, !sourceHasLLMs && shallFetchSucceed, source);

  return <>

    <Alert variant='soft' color='success'>
      <div>
        Note: <strong>Claude-3</strong> models are now supported.
      </div>
    </Alert>

    {advanced.on && <FormTextField
      title='API Host'
      description={<>e.g., <Link level='body-sm' href='https://github.com/smart-window/com-chat/blob/main/docs/config-aws-bedrock.md' target='_blank'>bedrock-claude</Link></>}
      placeholder='deployment.service.region.amazonaws.com'
      isError={false}
      value={anthropicHost || ''}
      onChange={text => updateSetup({ anthropicHost: text })}
    />}

    {advanced.on && <FormTextField
      title='Helicone Key' disabled={!!anthropicHost}
      description={<>Generate <Link level='body-sm' href='https://www.helicone.ai/keys' target='_blank'>here</Link></>}
      placeholder='sk-...'
      value={heliconeKey || ''}
      onChange={text => updateSetup({ heliconeKey: text })}
    />}

    {!!heliconeKey && <Alert variant='soft' color='success'>
      Advanced: You set the Helicone key, and Anthropic text will be routed through Helicone.
    </Alert>}

    <SetupFormRefetchButton refetch={refetch} disabled={!shallFetchSucceed || isFetching} loading={isFetching} error={isError} advanced={advanced} />

    {isError && <InlineError error={error} />}

  </>;
}