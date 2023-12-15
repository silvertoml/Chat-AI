import * as React from 'react';

import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, IconButton, Input, LinearProgress, Tooltip, Typography } from '@mui/joy';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import YouTubeIcon from '@mui/icons-material/YouTube';

import { GoodModal } from '~/common/components/GoodModal';
import { apiQuery } from '~/common/util/trpc.client';
import { copyToClipboard } from '~/common/util/clipboardUtils';
import { useFormRadioLlmType } from '~/common/components/forms/useFormRadioLlmType';

import { LLMChainStep, useLLMChain } from './useLLMChain';


function extractVideoID(videoURL: string): string | null {
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^#&?]*).*/;
  const match = videoURL.match(regExp);
  return (match && match[1]?.length == 11) ? match[1] : null;
}


function useTranscriptFromVideo(videoID: string | null) {
  const { data, isFetching, isError, error } =
    apiQuery.ytpersona.getTranscript.useQuery({ videoId: videoID || '' }, {
      enabled: !!videoID,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    });
  return {
    title: data?.videoTitle ?? null,
    thumbnailUrl: data?.thumbnailUrl ?? null,
    transcript: data?.transcript?.trim() ?? null,
    isFetching,
    isError, error,
  };
}


const YouTubePersonaSteps: LLMChainStep[] = [
  {
    name: 'Analyzing the transcript',
    setSystem: 'You are skilled in analyzing and embodying diverse characters. You meticulously study transcripts to capture key attributes, draft comprehensive character sheets, and refine them for authenticity. Feel free to make assumptions without hedging, be concise and be creative.',
    addUserInput: true,
    addUser: 'Conduct comprehensive research on the provided transcript. Identify key characteristics of the speaker, including age, professional field, distinct personality traits, style of communication, narrative context, and self-awareness. Additionally, consider any unique aspects such as their use of humor, their cultural background, core values, passions, fears, personal history, and social interactions. Your output for this stage is an in-depth written analysis that exhibits an understanding of both the superficial and more profound aspects of the speaker\'s persona.',
  },
  {
    name: 'Defining the character',
    addPrevAssistant: true,
    addUser: 'Craft your documented analysis into a draft of the \'You are a...\' character sheet. It should encapsulate all crucial personality dimensions, along with the motivations and aspirations of the persona. Keep in mind to balance succinctness and depth of detail for each dimension. The deliverable here is a comprehensive draft of the character sheet that captures the speaker\'s unique essence.',
  },
  {
    name: 'Crossing the t\'s',
    addPrevAssistant: true,
    addUser: 'Compare the draft character sheet with the original transcript, validating its content and ensuring it captures both the speaker’s overt characteristics and the subtler undertones. Omit unknown information, fine-tune any areas that require clarity, have been overlooked, or require more authenticity. Use clear and illustrative examples from the transcript to refine your sheet and offer meaningful, tangible reference points. Your output is a coherent, comprehensive, and nuanced instruction that begins with \'You are a...\' and  serves as a go-to guide for an actor recreating the persona.',
  },
  // {
  //   name: 'Shrink',
  //   addPrevAssistant: true,
  //   addUser: 'Now remove all the uncertain information, omit unknown information, Your output is a coherent, comprehensive, and nuanced instruction that begins with \'You are a...\' and serves as a go-to guide for a recreating the persona.',
  // },
];


export function YTPersonaCreator() {
  // state
  const [videoURL, setVideoURL] = React.useState('');
  const [videoID, setVideoID] = React.useState('');
  const [personaTranscript, setPersonaTranscript] = React.useState<string | null>(null);

  // external state
  const [diagramLlm, llmComponent] = useFormRadioLlmType();

  // fetch transcript when the Video ID is ready, then store it
  const { transcript, thumbnailUrl, title, isFetching, isError, error: transcriptError } =
    useTranscriptFromVideo(videoID);
  React.useEffect(() => setPersonaTranscript(transcript), [transcript]);

  // use the transformation sequence to create a persona
  const { isFinished, isTransforming, chainProgress, chainIntermediates, chainStepName, chainOutput, chainError, abortChain } =
    useLLMChain(YouTubePersonaSteps, diagramLlm?.id, personaTranscript ?? undefined);

  const handleVideoIdChange = (e: React.ChangeEvent<HTMLInputElement>) => setVideoURL(e.target.value);

  const handleFetchTranscript = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // stop the form submit
    const videoId = extractVideoID(videoURL);
    if (!videoId) {
      setVideoURL('Invalid');
    } else {
      setPersonaTranscript(null);
      setVideoID(videoId);
    }
  };

  return <>

    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      <YouTubeIcon sx={{ color: '#f00' }} />
      <Typography level='title-lg'>
        YouTube -&gt; AI persona
      </Typography>
    </Box>

    <form onSubmit={handleFetchTranscript}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
        <Input
          required
          type='url'
          fullWidth
          variant='outlined'
          placeholder='YouTube Video URL'
          value={videoURL} onChange={handleVideoIdChange}
          endDecorator={
            <IconButton
              variant='outlined' color='neutral'
              onClick={() => setVideoURL('https://www.youtube.com/watch?v=M_wZpSEvOkc')}
            >
              <WhatshotIcon />
            </IconButton>
          }
        />
        <Button
          type='submit'
          variant='solid' disabled={isFetching || isTransforming} loading={isFetching}
          sx={{ minWidth: 120 }}>
          Create
        </Button>
      </Box>
    </form>

    {/* LLM selector (chat vs fast) */}
    {!isTransforming && !isFinished && llmComponent}

    {/* 1. Transcript*/}
    {personaTranscript && (
      <Card sx={{ mt: 2, boxShadow: 'md' }}>
        <CardContent>
          <Typography level='title-md' sx={{ mb: 1 }}>
            {title || 'Transcript'}
          </Typography>
          <Box>
            {!!thumbnailUrl && <picture><img src={thumbnailUrl} alt='YouTube Video Image' height={80} style={{ float: 'left', marginRight: 8 }} /></picture>}
            <Typography level='body-sm'>
              {personaTranscript.slice(0, 280)}...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )}

    {/* Errors */}
    {isError && (
      <Alert color='warning' sx={{ mt: 1 }}>
        <Typography component='div'>{transcriptError?.message || 'Unknown error'}</Typography>
      </Alert>
    )}
    {!!chainError && (
      <Alert color='warning' sx={{ mt: 1 }}>
        <Typography component='div'>{chainError}</Typography>
      </Alert>
    )}


    {/* Persona! */}
    {chainOutput && <Box sx={{ mt: 2 }}>
      <Typography level='title-lg'>
        YouTuber Persona System Prompt
      </Typography>
      <Card sx={{ boxShadow: 'md' }}>
        <CardContent sx={{
          position: 'relative',
          '&:hover > button': { opacity: 1 },
        }}>
          <Alert variant='soft' color='success' sx={{ mb: 1 }}>
            You can now copy the following text and use it as Custom prompt!
          </Alert>
          <Tooltip title='Copy system prompt' variant='solid'>
            <IconButton
              variant='outlined' color='neutral' onClick={() => copyToClipboard(chainOutput, 'Persona prompt')}
              sx={{
                position: 'absolute', right: 0, zIndex: 10,
                // opacity: 0, transition: 'opacity 0.3s',
              }}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Typography level='body-sm'>
            {chainOutput}
          </Typography>
        </CardContent>
      </Card>
    </Box>}

    {/* Intermediate outputs rendered as cards in a grid */}
    {chainIntermediates && chainIntermediates.length > 0 && <Box sx={{ mt: 2 }}>
      <Typography level='title-lg'>
        {isTransforming ? 'Working...' : 'Intermediate Work'}
      </Typography>
      <Grid container spacing={2}>
        {chainIntermediates.map((intermediate, i) =>
          <Grid xs={12} sm={6} md={4} key={i}>
            <Card>
              <CardContent>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  {i + 1}. {YouTubePersonaSteps[i].name}
                </Typography>
                <Typography level='body-sm'>
                  {intermediate?.slice(0, 140)}...
                </Typography>
              </CardContent>
            </Card>
          </Grid>,
        )}
      </Grid>
    </Box>}


    {/* Embodiment Progress */}
    {isTransforming && <GoodModal open>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
        <CircularProgress color='primary' value={Math.max(10, 100 * chainProgress)} />
      </Box>
      <Typography color='success' level='title-lg' sx={{ mt: 1 }}>
        Embodying Persona ...
      </Typography>
      <Typography color='success' level='title-sm' sx={{ mt: 1, fontWeight: 600 }}>
        {chainStepName}
      </Typography>
      <LinearProgress color='success' determinate value={Math.max(10, 100 * chainProgress)} sx={{ mt: 1, mb: 2 }} />
      <Typography level='title-sm'>
        This may take 1-2 minutes. Do not close this window or the progress will be lost.
        If you experience any errors (e.g. LLM timeouts, or context overflows for larger videos)
        please try again with faster/smaller models.
      </Typography>
      <Button variant='soft' color='neutral' onClick={abortChain} sx={{ ml: 'auto', minWidth: 100, mt: 5 }}>
        Cancel
      </Button>
    </GoodModal>}

  </>;
}