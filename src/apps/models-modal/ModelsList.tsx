import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Box, Chip, IconButton, List, ListItem, ListItemButton, Typography } from '@mui/joy';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

import { DLLM, DModelSourceId, useModelsStore } from '~/modules/llms/store-llms';
import { IModelVendor } from '~/modules/llms/vendors/IModelVendor';
import { findVendorById } from '~/modules/llms/vendors/vendors.registry';

import { GoodTooltip } from '~/common/components/GoodTooltip';
import { openLayoutLLMOptions } from '~/common/layout/store-applayout';


function ModelItem(props: { llm: DLLM, vendor: IModelVendor, chipChat: boolean, chipFast: boolean, chipFunc: boolean }) {

  // derived
  const llm = props.llm;
  const label = llm.label;
  let tooltip = llm._source.label;
  if (llm.description)
    tooltip += ' - ' + llm.description;
  tooltip += ' - ';
  if (llm.contextTokens) {
    tooltip += llm.contextTokens.toLocaleString() + ' tokens';
    // if (llm.maxOutputTokens)
    //   tooltip += ' / ' + llm.maxOutputTokens.toLocaleString() + ' max';
  } else
    tooltip += 'unknown tokens size';

  return (
    <ListItem>
      <ListItemButton onClick={() => openLayoutLLMOptions(llm.id)} sx={{ alignItems: 'center', gap: 1 }}>

        {/* Model Name */}
        <GoodTooltip title={tooltip}>
          <Typography sx={llm.hidden ? { color: 'neutral.plainDisabledColor' } : undefined}>
            {label}
          </Typography>
        </GoodTooltip>

        {/* --> */}
        <Box sx={{ flex: 1 }} />

        {props.chipChat && <Chip size='sm' variant='plain' sx={{ boxShadow: 'sm' }}>chat</Chip>}

        {props.chipFast && <Chip size='sm' variant='plain' sx={{ boxShadow: 'sm' }}>fast</Chip>}

        {props.chipFunc && <Chip size='sm' variant='plain' sx={{ boxShadow: 'sm' }}>𝑓n</Chip>}

        {llm.hidden && (
          <IconButton disabled size='sm' variant='plain' color='neutral'>
            <VisibilityOffOutlinedIcon />
          </IconButton>
        )}

        <IconButton size='sm'>
          <SettingsOutlinedIcon />
        </IconButton>

      </ListItemButton>
    </ListItem>
  );
}

export function ModelsList(props: {
  filterSourceId: DModelSourceId | null
}) {

  // external state
  const { chatLLMId, fastLLMId, funcLLMId, llms } = useModelsStore(state => ({
    chatLLMId: state.chatLLMId,
    fastLLMId: state.fastLLMId,
    funcLLMId: state.funcLLMId,
    llms: state.llms.filter(llm => !props.filterSourceId || llm.sId === props.filterSourceId),
  }), shallow);

  // find out if there's more than 1 sourceLabel in the llms array
  const multiSources = llms.length >= 2 && llms.find(llm => llm._source !== llms[0]._source);
  const showAllSources = !props.filterSourceId;
  let lastGroupLabel = '';

  // generate the list items, prepending headers when necessary
  const items: React.JSX.Element[] = [];
  for (const llm of llms) {

    // prepend label if changing source
    const groupLabel = llm._source.label;
    if ((multiSources || showAllSources) && groupLabel !== lastGroupLabel) {
      lastGroupLabel = groupLabel;
      items.push(
        <ListItem key={'lab-' + llm._source.id} sx={{ justifyContent: 'center' }}>
          <Typography>
            {groupLabel}
          </Typography>
        </ListItem>,
      );
    }

    // for safety, ensure the vendor exists
    const vendor = findVendorById(llm._source.vId);
    !!vendor && items.push(
      <ModelItem key={'llm-' + llm.id} llm={llm} vendor={vendor} chipChat={llm.id === chatLLMId} chipFast={llm.id === fastLLMId} chipFunc={llm.id === funcLLMId} />,
    );
  }

  return (
    <List variant='soft' size='sm' sx={{
      borderRadius: 'sm',
      pl: { xs: 0, md: 1 },
      overflowY: 'auto',
    }}>
      {items}
    </List>
  );
}