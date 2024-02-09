import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Avatar, Box, CircularProgress, IconButton, ListDivider, ListItem, ListItemDecorator, MenuItem, Switch, Tooltip, Typography } from '@mui/joy';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DifferenceIcon from '@mui/icons-material/Difference';
import EditIcon from '@mui/icons-material/Edit';
import Face6Icon from '@mui/icons-material/Face6';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ReplayIcon from '@mui/icons-material/Replay';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';

import { CloseableMenu } from '~/common/components/CloseableMenu';
import { DMessage } from '~/common/state/store-chats';
import { InlineTextarea } from '~/common/components/InlineTextarea';
import { KeyStroke } from '~/common/components/KeyStroke';
import { Link } from '~/common/components/Link';
import { SystemPurposeId, SystemPurposes } from '../../../../data';
import { copyToClipboard } from '~/common/util/clipboardUtils';
import { cssRainbowColorKeyframes } from '~/common/app.theme';
import { prettyBaseModel } from '~/common/util/modelUtils';
import { useUIPreferencesStore } from '~/common/state/store-ui';

import { BlocksRenderer, editBlocksSx } from './blocks/BlocksRenderer';
import { useChatShowTextDiff } from '../../store-app-chat';
import { useSanityTextDiffs } from './blocks/RenderTextDiff';


// Enable the menu on text selection
const ENABLE_SELECTION_RIGHT_CLICK_MENU: boolean = true;

// Enable the hover button to copy the whole message. The Copy button is also available in Blocks, or in the Avatar Menu.
const ENABLE_COPY_MESSAGE_OVERLAY: boolean = false;


export function messageBackground(messageRole: DMessage['role'] | string, wasEdited: boolean, unknownAssistantIssue: boolean): string {
  switch (messageRole) {
    case 'user':
      return 'primary.plainHoverBg'; // was .background.level1
    case 'assistant':
      return unknownAssistantIssue ? 'danger.softBg' : 'background.surface';
    case 'system':
      return wasEdited ? 'warning.softHoverBg' : 'background.surface';
    default:
      return '#ff0000';
  }
}

const avatarIconSx = { width: 36, height: 36 };

export function makeAvatar(messageAvatar: string | null, messageRole: DMessage['role'] | string, messageOriginLLM: string | undefined, messagePurposeId: SystemPurposeId | undefined, messageSender: string, messageTyping: boolean, size: 'sm' | undefined = undefined): React.JSX.Element {
  if (typeof messageAvatar === 'string' && messageAvatar)
    return <Avatar alt={messageSender} src={messageAvatar} />;
  const mascotSx = size === 'sm' ? avatarIconSx : { width: 64, height: 64 };
  switch (messageRole) {
    case 'system':
      return <SettingsSuggestIcon sx={avatarIconSx} />;  // https://em-content.zobj.net/thumbs/120/apple/325/robot_1f916.png

    case 'user':
      return <Face6Icon sx={avatarIconSx} />;            // https://www.svgrepo.com/show/306500/openai.svg

    case 'assistant':
      // typing gif (people seem to love this, so keeping it after april fools')
      const isTextToImage = messageOriginLLM === 'DALL·E' || messageOriginLLM === 'Prodia';
      const isReact = messageOriginLLM?.startsWith('react-');
      if (messageTyping) {
        return <Avatar
          alt={messageSender} variant='plain'
          src={isTextToImage ? 'https://i.giphy.com/media/5t9ujj9cMisyVjUZ0m/giphy.webp'
            : isReact ? 'https://i.giphy.com/media/l44QzsOLXxcrigdgI/giphy.webp'
              : 'https://i.giphy.com/media/jJxaUysjzO9ri/giphy.webp'}
          sx={{ ...mascotSx, borderRadius: 'sm' }}
        />;
      }

      // text-to-image: icon
      if (isTextToImage)
        return <FormatPaintIcon sx={{
          ...avatarIconSx,
          animation: `${cssRainbowColorKeyframes} 1s linear 2.66`,
        }} />;

      // purpose symbol (if present)
      const symbol = SystemPurposes[messagePurposeId!]?.symbol;
      if (symbol) return <Box sx={{
        fontSize: '24px',
        textAlign: 'center',
        width: '100%',
        minWidth: `${avatarIconSx.width}px`,
        lineHeight: `${avatarIconSx.height}px`,
      }}>
        {symbol}
      </Box>;

      // default assistant avatar
      return <SmartToyOutlinedIcon sx={avatarIconSx} />; // https://mui.com/static/images/avatar/2.jpg
  }
  return <Avatar alt={messageSender} />;
}

function explainErrorInMessage(text: string, isAssistant: boolean, modelId?: string) {
  const isAssistantError = isAssistant && (text.startsWith('[Issue] ') || text.startsWith('[OpenAI Issue]'));
  let errorMessage: React.JSX.Element | null = null;
  if (!isAssistantError)
    return { errorMessage, isAssistantError };

  // [OpenAI] "Service Temporarily Unavailable (503)", {"code":503,"message":"Service Unavailable.","param":null,"type":"cf_service_unavailable"}
  if (text.includes('"cf_service_unavailable"')) {
    errorMessage = <>
      The OpenAI servers appear to be having trouble at the moment. Kindly follow
      the <Link noLinkStyle href='https://status.openai.com/' target='_blank'>OpenAI Status</Link> page
      for up to date information, and at your option try again.
    </>;
  }
  // ...
  else if (text.startsWith('OpenAI API error: 429 Too Many Requests')) {
    // TODO: retry at the api/chat level a few times instead of showing this error
    errorMessage = <>
      The model appears to be occupied at the moment. Kindly select <b>GPT-3.5 Turbo</b>,
      or give it another go by selecting <b>Run again</b> from the message menu.
    </>;
  } else if (text.includes('"model_not_found"')) {
    // note that "model_not_found" is different than "The model `gpt-xyz` does not exist" message
    errorMessage = <>
      The API key appears to be unauthorized for {modelId || 'this model'}. You can change to <b>GPT-3.5
      Turbo</b> and simultaneously <Link noLinkStyle href='https://openai.com/waitlist/gpt-4-api' target='_blank'>request
      access</Link> to the desired model.
    </>;
  } else if (text.includes('"context_length_exceeded"')) {
    // TODO: propose to summarize or split the input?
    const pattern = /maximum context length is (\d+) tokens.+resulted in (\d+) tokens/;
    const match = pattern.exec(text);
    const usedText = match ? <b>{parseInt(match[2] || '0').toLocaleString()} tokens &gt; {parseInt(match[1] || '0').toLocaleString()}</b> : '';
    errorMessage = <>
      This thread <b>surpasses the maximum size</b> allowed for {modelId || 'this model'}. {usedText}.
      Please consider removing some earlier messages from the conversation, start a new conversation,
      choose a model with larger context, or submit a shorter new message.
      {!usedText && ` -- ${text}`}
    </>;
  }
  // [OpenAI] {"error":{"message":"Incorrect API key provided: ...","type":"invalid_request_error","param":null,"code":"invalid_api_key"}}
  else if (text.includes('"invalid_api_key"')) {
    errorMessage = <>
      The API key appears to be incorrect or to have expired.
      Please <Link noLinkStyle href='https://platform.openai.com/account/api-keys' target='_blank'>check your
      API key</Link> and update it in <b>Models</b>.
    </>;
  } else if (text.includes('"insufficient_quota"')) {
    errorMessage = <>
      The API key appears to have <b>insufficient quota</b>. Please
      check <Link noLinkStyle href='https://platform.openai.com/account/usage' target='_blank'>your usage</Link> and
      make sure the usage is under <Link noLinkStyle href='https://platform.openai.com/account/billing/limits' target='_blank'>the limits</Link>.
    </>;
  }
  // else
  //  errorMessage = <>{text || 'Unknown error'}</>;

  return { errorMessage, isAssistantError };
}


export const ChatMessageMemo = React.memo(ChatMessage);

/**
 * The Message component is a customizable chat message UI component that supports
 * different roles (user, assistant, and system), text editing, syntax highlighting,
 * and code execution using Sandpack for TypeScript, JavaScript, and HTML code blocks.
 * The component also provides options for copying code to clipboard and expanding
 * or collapsing long user messages.
 *
 */
function ChatMessage(props: {
  message: DMessage,
  diffPreviousText?: string,
  isBottom?: boolean,
  isMobile?: boolean,
  isImagining?: boolean,
  isSpeaking?: boolean,
  blocksShowDate?: boolean,
  onConversationBranch?: (messageId: string) => void,
  onConversationRestartFrom?: (messageId: string, offset: number) => Promise<void>,
  onConversationTruncate?: (messageId: string) => void,
  onMessageDelete?: (messageId: string) => void,
  onMessageEdit?: (messageId: string, text: string) => void,
  onTextDiagram?: (messageId: string, text: string) => Promise<void>
  onTextImagine?: (text: string) => Promise<void>
  onTextSpeak?: (text: string) => Promise<void>
}) {

  // state
  const [isHovering, setIsHovering] = React.useState(false);
  const [opsMenuAnchor, setOpsMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [selMenuAnchor, setSelMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [selMenuText, setSelMenuText] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  // external state
  const { cleanerLooks, doubleClickToEdit, messageTextSize, renderMarkdown } = useUIPreferencesStore(state => ({
    cleanerLooks: state.zenMode === 'cleaner',
    doubleClickToEdit: state.doubleClickToEdit,
    messageTextSize: state.messageTextSize,
    renderMarkdown: state.renderMarkdown,
  }), shallow);
  const [showDiff, setShowDiff] = useChatShowTextDiff();
  const textDiffs = useSanityTextDiffs(props.message.text, props.diffPreviousText, showDiff);

  // derived state
  const {
    id: messageId,
    text: messageText,
    sender: messageSender,
    avatar: messageAvatar,
    typing: messageTyping,
    role: messageRole,
    purposeId: messagePurposeId,
    originLLM: messageOriginLLM,
    created: messageCreated,
    updated: messageUpdated,
  } = props.message;

  const fromAssistant = messageRole === 'assistant';
  const fromSystem = messageRole === 'system';
  const wasEdited = !!messageUpdated;

  const showAvatars = !cleanerLooks;

  const textSel = selMenuText ? selMenuText : messageText;
  const isSpecialT2I = textSel.startsWith('https://images.prodia.xyz/') || textSel.startsWith('/draw ') || textSel.startsWith('/imagine ') || textSel.startsWith('/img ');
  const couldDiagram = textSel?.length >= 100 && !isSpecialT2I;
  const couldImagine = textSel?.length >= 2 && !isSpecialT2I;
  const couldSpeak = couldImagine;


  const handleTextEdited = (editedText: string) => {
    setIsEditing(false);
    if (props.onMessageEdit && editedText?.trim() && editedText !== messageText)
      props.onMessageEdit(messageId, editedText);
  };


  // Operations Menu

  const closeOpsMenu = () => setOpsMenuAnchor(null);

  const handleOpsCopy = (e: React.MouseEvent) => {
    copyToClipboard(textSel, 'Text');
    e.preventDefault();
    closeOpsMenu();
    closeSelectionMenu();
  };

  const handleOpsEdit = React.useCallback((e: React.MouseEvent) => {
    if (messageTyping && !isEditing) return; // don't allow editing while typing
    setIsEditing(!isEditing);
    e.preventDefault();
    closeOpsMenu();
  }, [isEditing, messageTyping]);

  const handleOpsConversationBranch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // to try to not steal the focus from the banched conversation
    props.onConversationBranch && props.onConversationBranch(messageId);
    closeOpsMenu();
  };

  const handleOpsConversationRestartFrom = async (e: React.MouseEvent) => {
    e.preventDefault();
    closeOpsMenu();
    props.onConversationRestartFrom && await props.onConversationRestartFrom(messageId, fromAssistant ? -1 : 0);
  };

  const handleOpsToggleShowDiff = () => setShowDiff(!showDiff);

  const handleOpsDiagram = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (props.onTextDiagram) {
      await props.onTextDiagram(messageId, textSel);
      closeOpsMenu();
      closeSelectionMenu();
    }
  };

  const handleOpsImagine = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (props.onTextImagine) {
      await props.onTextImagine(textSel);
      closeOpsMenu();
      closeSelectionMenu();
    }
  };

  const handleOpsSpeak = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (props.onTextSpeak) {
      await props.onTextSpeak(textSel);
      closeOpsMenu();
      closeSelectionMenu();
    }
  };

  const handleOpsTruncate = (_e: React.MouseEvent) => {
    props.onConversationTruncate && props.onConversationTruncate(messageId);
    closeOpsMenu();
  };

  const handleOpsDelete = (_e: React.MouseEvent) => {
    props.onMessageDelete && props.onMessageDelete(messageId);
  };


  // Selection Menu

  const removeSelectionAnchor = React.useCallback(() => {
    if (selMenuAnchor) {
      try {
        document.body.removeChild(selMenuAnchor);
      } catch (e) {
        // ignore...
      }
    }
  }, [selMenuAnchor]);

  const openSelectionMenu = React.useCallback((event: MouseEvent, selectedText: string) => {
    event.stopPropagation();
    event.preventDefault();

    // remove any stray anchor
    removeSelectionAnchor();

    // create a temporary fixed anchor element to position the menu
    const anchorEl = document.createElement('div');
    anchorEl.style.position = 'fixed';
    anchorEl.style.left = `${event.clientX}px`;
    anchorEl.style.top = `${event.clientY}px`;
    document.body.appendChild(anchorEl);

    setSelMenuAnchor(anchorEl);
    setSelMenuText(selectedText);
  }, [removeSelectionAnchor]);

  const closeSelectionMenu = React.useCallback(() => {
    // window.getSelection()?.removeAllRanges?.();
    removeSelectionAnchor();
    setSelMenuAnchor(null);
    setSelMenuText(null);
  }, [removeSelectionAnchor]);

  const handleMouseUp = React.useCallback((event: MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      if (selectedText.length > 0)
        openSelectionMenu(event, selectedText);
    }
  }, [openSelectionMenu]);


  // Blocks renderer

  const handleBlocksContextMenu = React.useCallback((event: React.MouseEvent) => {
    handleMouseUp(event.nativeEvent);
  }, [handleMouseUp]);

  const handleBlocksDoubleClick = React.useCallback((event: React.MouseEvent) => {
    doubleClickToEdit && props.onMessageEdit && handleOpsEdit(event);
  }, [doubleClickToEdit, handleOpsEdit, props.onMessageEdit]);


  // prettier upstream errors
  const { isAssistantError, errorMessage } = React.useMemo(
    () => explainErrorInMessage(messageText, fromAssistant, messageOriginLLM),
    [messageText, fromAssistant, messageOriginLLM],
  );

  // style
  const backgroundColor = messageBackground(messageRole, wasEdited, isAssistantError && !errorMessage);

  // avatar
  const avatarEl: React.JSX.Element | null = React.useMemo(
    () => showAvatars ? makeAvatar(messageAvatar, messageRole, messageOriginLLM, messagePurposeId, messageSender, messageTyping) : null,
    [messageAvatar, messageOriginLLM, messagePurposeId, messageRole, messageSender, messageTyping, showAvatars],
  );


  return (
    <ListItem
      sx={{
        display: 'flex', flexDirection: !fromAssistant ? 'row-reverse' : 'row', alignItems: 'flex-start',
        gap: { xs: 0, md: 1 },
        px: { xs: 1, md: 2 },
        py: 2,
        backgroundColor,
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        ...(ENABLE_COPY_MESSAGE_OVERLAY && { position: 'relative' }),
        '&:hover > button': { opacity: 1 },
      }}
    >

      {/* Avatar */}
      {showAvatars && (
        <Box
          onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
          onClick={event => setOpsMenuAnchor(event.currentTarget)}
          sx={{
            // flexBasis: 0, // this won't let the item grow
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            minWidth: { xs: 50, md: 64 }, maxWidth: 80,
            textAlign: 'center',
          }}
        >

          {isHovering ? (
            <IconButton variant='soft' color={fromAssistant ? 'neutral' : 'primary'} sx={avatarIconSx}>
              <MoreVertIcon />
            </IconButton>
          ) : (
            avatarEl
          )}

          {/* Assistant model name */}
          {fromAssistant && (
            <Tooltip title={messageOriginLLM || 'unk-model'} variant='solid'>
              <Typography level='body-xs' sx={{
                overflowWrap: 'anywhere',
                ...(messageTyping ? { animation: `${cssRainbowColorKeyframes} 5s linear infinite` } : {}),
              }}>
                {prettyBaseModel(messageOriginLLM)}
              </Typography>
            </Tooltip>
          )}

        </Box>
      )}


      {/* Edit / Blocks */}
      {isEditing ? (

        <InlineTextarea
          initialText={messageText} onEdit={handleTextEdited}
          sx={editBlocksSx}
        />

      ) : (

        <BlocksRenderer
          text={messageText}
          fromRole={messageRole}
          renderTextAsMarkdown={renderMarkdown}
          messageTextSize={messageTextSize}
          errorMessage={errorMessage}
          isBottom={props.isBottom}
          isMobile={props.isMobile}
          showDate={props.blocksShowDate === true ? messageUpdated || messageCreated || undefined : undefined}
          renderTextDiff={textDiffs || undefined}
          wasUserEdited={wasEdited}
          onContextMenu={(props.onMessageEdit && ENABLE_SELECTION_RIGHT_CLICK_MENU) ? handleBlocksContextMenu : undefined}
          onDoubleClick={(props.onMessageEdit && doubleClickToEdit) ? handleBlocksDoubleClick : undefined}
        />

      )}


      {/* Overlay copy icon */}
      {ENABLE_COPY_MESSAGE_OVERLAY && !fromSystem && !isEditing && (
        <Tooltip title={fromAssistant ? 'Copy message' : 'Copy input'} variant='solid'>
          <IconButton
            variant='outlined' onClick={handleOpsCopy}
            sx={{
              position: 'absolute', ...(fromAssistant ? { right: { xs: 12, md: 28 } } : { left: { xs: 12, md: 28 } }), zIndex: 10,
              opacity: 0, transition: 'opacity 0.3s',
            }}>
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
      )}


      {/* Operations Menu (3 dots) */}
      {!!opsMenuAnchor && (
        <CloseableMenu
          dense placement='bottom-end'
          open anchorEl={opsMenuAnchor} onClose={closeOpsMenu}
          sx={{ minWidth: 280 }}
        >
          {/* Edit / Copy */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!!props.onMessageEdit && (
              <MenuItem variant='plain' disabled={messageTyping} onClick={handleOpsEdit} sx={{ flex: 1 }}>
                <ListItemDecorator><EditIcon /></ListItemDecorator>
                {isEditing ? 'Discard' : 'Edit'}
                {/*{!isEditing && <span style={{ opacity: 0.5, marginLeft: '8px' }}>{doubleClickToEdit ? '(double-click)' : ''}</span>}*/}
              </MenuItem>
            )}
            <MenuItem onClick={handleOpsCopy} sx={{ flex: 1 }}>
              <ListItemDecorator><ContentCopyIcon /></ListItemDecorator>
              Copy
            </MenuItem>
          </Box>
          {/* Delete / Branch / Truncate */}
          {!!props.onMessageDelete && <ListDivider />}
          {!!props.onMessageDelete && (
            <MenuItem onClick={handleOpsDelete} disabled={false /*fromSystem*/}>
              <ListItemDecorator><ClearIcon /></ListItemDecorator>
              Delete
              <span style={{ opacity: 0.5 }}>message</span>
            </MenuItem>
          )}
          {!!props.onConversationBranch && (
            <MenuItem onClick={handleOpsConversationBranch} disabled={fromSystem}>
              <ListItemDecorator>
                <ForkRightIcon />
              </ListItemDecorator>
              Branch
              {!props.isBottom && <span style={{ opacity: 0.5 }}>from here</span>}
            </MenuItem>
          )}
          {!!props.onConversationTruncate && (
            <MenuItem onClick={handleOpsTruncate} disabled={props.isBottom}>
              <ListItemDecorator><VerticalAlignBottomIcon /></ListItemDecorator>
              Truncate
              <span style={{ opacity: 0.5 }}>after this</span>
            </MenuItem>
          )}
          {/* Diff Viewer */}
          {!!props.diffPreviousText && <ListDivider />}
          {!!props.diffPreviousText && (
            <MenuItem onClick={handleOpsToggleShowDiff}>
              <ListItemDecorator><DifferenceIcon /></ListItemDecorator>
              Show difference
              <Switch checked={showDiff} onChange={handleOpsToggleShowDiff} sx={{ ml: 'auto' }} />
            </MenuItem>
          )}
          {/* Diagram / Draw / Speak */}
          {!!props.onTextDiagram && <ListDivider />}
          {!!props.onTextDiagram && (
            <MenuItem onClick={handleOpsDiagram} disabled={!couldDiagram}>
              <ListItemDecorator><AccountTreeIcon color='success' /></ListItemDecorator>
              Diagram ...
            </MenuItem>
          )}
          {!!props.onTextImagine && (
            <MenuItem onClick={handleOpsImagine} disabled={!couldImagine || props.isImagining}>
              <ListItemDecorator>{props.isImagining ? <CircularProgress size='sm' /> : <FormatPaintIcon color='success' />}</ListItemDecorator>
              Draw ...
            </MenuItem>
          )}
          {!!props.onTextSpeak && (
            <MenuItem onClick={handleOpsSpeak} disabled={!couldSpeak || props.isSpeaking}>
              <ListItemDecorator>{props.isSpeaking ? <CircularProgress size='sm' /> : <RecordVoiceOverIcon color='success' />}</ListItemDecorator>
              Speak
            </MenuItem>
          )}
          {/* Restart/try */}
          {!!props.onConversationRestartFrom && <ListDivider />}
          {!!props.onConversationRestartFrom && (
            <MenuItem onClick={handleOpsConversationRestartFrom}>
              <ListItemDecorator>{fromAssistant ? <ReplayIcon color='primary' /> : <TelegramIcon color='primary' />}</ListItemDecorator>
              {!fromAssistant
                ? <>Restart <span style={{ opacity: 0.5 }}>from here</span></>
                : !props.isBottom
                  ? <>Retry <span style={{ opacity: 0.5 }}>from here</span></>
                  : <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    Retry
                    <KeyStroke combo='Ctrl + Shift + R' />
                  </Box>}
            </MenuItem>
          )}
        </CloseableMenu>
      )}

      {/* Selection (Contextual) Menu */}
      {!!selMenuAnchor && (
        <CloseableMenu
          dense placement='bottom-start'
          open anchorEl={selMenuAnchor} onClose={closeSelectionMenu}
          sx={{ minWidth: 220 }}
        >
          <MenuItem onClick={handleOpsCopy} sx={{ flex: 1 }}>
            <ListItemDecorator><ContentCopyIcon /></ListItemDecorator>
            Copy <span style={{ opacity: 0.5 }}>selection</span>
          </MenuItem>
          {!!props.onTextDiagram && <MenuItem onClick={handleOpsDiagram} disabled={!couldDiagram || props.isImagining}>
            <ListItemDecorator><AccountTreeIcon color='success' /></ListItemDecorator>
            Diagram ...
          </MenuItem>}
          {!!props.onTextImagine && <MenuItem onClick={handleOpsImagine} disabled={!couldImagine || props.isImagining}>
            <ListItemDecorator>{props.isImagining ? <CircularProgress size='sm' /> : <FormatPaintIcon color='success' />}</ListItemDecorator>
            Imagine
          </MenuItem>}
          {!!props.onTextSpeak && <MenuItem onClick={handleOpsSpeak} disabled={!couldSpeak || props.isSpeaking}>
            <ListItemDecorator>{props.isSpeaking ? <CircularProgress size='sm' /> : <RecordVoiceOverIcon color='success' />}</ListItemDecorator>
            Speak
          </MenuItem>}
        </CloseableMenu>
      )}

    </ListItem>
  );
}
