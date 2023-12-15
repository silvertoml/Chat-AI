import * as React from 'react';

import { Alert, Typography } from '@mui/joy';

import { FormTextField } from '~/common/components/forms/FormTextField';
import { InlineError } from '~/common/components/InlineError';
import { Link } from '~/common/components/Link';
import { SetupFormRefetchButton } from '~/common/components/forms/SetupFormRefetchButton';
import { apiQuery } from '~/common/util/trpc.client';

import { DModelSourceId, useModelsStore, useSourceSetup } from '../../store-llms';
import { modelDescriptionToDLLM } from '../openai/OpenAISourceSetup';

import { ModelVendorOoobabooga } from './oobabooga.vendor';


export function OobaboogaSourceSetup(props: { sourceId: DModelSourceId }) {

  // external state
  const { source, sourceHasLLMs, access, updateSetup } =
    useSourceSetup(props.sourceId, ModelVendorOoobabooga);

  // derived state
  const { oaiHost } = access;

  // fetch models
  const { isFetching, refetch, isError, error } = apiQuery.llmOpenAI.listModels.useQuery({ access }, {
    enabled: false, // !hasModels && !!asValidURL(normSetup.oaiHost),
    onSuccess: models => source && useModelsStore.getState().setLLMs(
      models.models.map(model => modelDescriptionToDLLM(model, source)),
      props.sourceId,
    ),
    staleTime: Infinity,
  });

  return <>

    <Typography level='body-sm'>
      You can use a running <Link href='https://github.com/oobabooga/text-generation-webui' target='_blank'>
      text-generation-webui</Link> instance as a source for local models.
      Follow <Link href='https://github.com/smart-window/com-chat' target='_blank'>
      the instructions</Link> to set up the server.
    </Typography>

    <FormTextField
      title='API Base'
      description='Excluding /v1'
      placeholder='http://127.0.0.1:5000'
      value={oaiHost}
      onChange={text => updateSetup({ oaiHost: text })}
    />

    {sourceHasLLMs && <Alert variant='soft' color='warning' sx={{ display: 'block' }}>
      Success! Note: your model of choice must be loaded in
      the <Link noLinkStyle href='http://127.0.0.1:7860' target='_blank'> Oobabooga UI</Link>,
      as Oobabooga does not support switching models via API.
      Concurrent model execution is also not supported.
    </Alert>}

    <SetupFormRefetchButton refetch={refetch} disabled={!(oaiHost.length >= 7) || isFetching} error={isError} />

    {isError && <InlineError error={error} />}

  </>;
}
