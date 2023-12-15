import * as React from 'react';

import { Button } from '@mui/joy';

import { FormTextField } from '~/common/components/forms/FormTextField';
import { InlineError } from '~/common/components/InlineError';
import { Link } from '~/common/components/Link';
import { SetupFormRefetchButton } from '~/common/components/forms/SetupFormRefetchButton';
import { apiQuery } from '~/common/util/trpc.client';
import { asValidURL } from '~/common/util/urlUtils';

import { DModelSourceId, useModelsStore, useSourceSetup } from '../../store-llms';
import { ModelVendorOllama } from './ollama.vendor';
import { OllamaAdministration } from './OllamaAdministration';
import { modelDescriptionToDLLM } from '../openai/OpenAISourceSetup';


export function OllamaSourceSetup(props: { sourceId: DModelSourceId }) {

  // state
  const [adminOpen, setAdminOpen] = React.useState(false);

  // external state
  const { source, access, updateSetup } =
    useSourceSetup(props.sourceId, ModelVendorOllama);

  // derived state
  const { ollamaHost } = access;

  const hostValid = !!asValidURL(ollamaHost);
  const hostError = !!ollamaHost && !hostValid;
  const shallFetchSucceed = !hostError;

  // fetch models
  const { isFetching, refetch, isError, error } = apiQuery.llmOllama.listModels.useQuery({ access }, {
    enabled: false, // !sourceHasLLMs && shallFetchSucceed,
    onSuccess: models => source && useModelsStore.getState().setLLMs(
      models.models.map(model => modelDescriptionToDLLM(model, source)),
      props.sourceId,
    ),
    staleTime: Infinity,
  });

  return <>

    <FormTextField
      title='Ollama Host'
      description={<Link level='body-sm' href='https://github.com/smart-window/com-chat' target='_blank'>information</Link>}
      placeholder='http://127.0.0.1:11434'
      isError={hostError}
      value={ollamaHost || ''}
      onChange={text => updateSetup({ ollamaHost: text })}
    />

    <SetupFormRefetchButton
      refetch={refetch} disabled={!shallFetchSucceed || isFetching} error={isError}
      leftButton={
        <Button color='neutral' variant='solid' disabled={adminOpen} onClick={() => setAdminOpen(true)}>
          Ollama Admin
        </Button>
      }
    />

    {isError && <InlineError error={error} />}

    {adminOpen && <OllamaAdministration access={access} onClose={() => setAdminOpen(false)} />}

  </>;
}