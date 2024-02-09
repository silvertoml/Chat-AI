import * as React from 'react';

import { FormControl, Typography } from '@mui/joy';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { FormSwitchControl } from '~/common/components/forms/FormSwitchControl';
import { Link } from '~/common/components/Link';
import { useIsMobile } from '~/common/components/useMatchMedia';
import { useUXLabsStore } from '~/common/state/store-ux-labs';


export function UxLabsSettings() {

  // external state
  const isMobile = useIsMobile();
  const {
    labsAttachScreenCapture, setLabsAttachScreenCapture,
    labsCameraDesktop, setLabsCameraDesktop,
  } = useUXLabsStore();

  return <>

    {!isMobile && <FormSwitchControl
      title={<><ScreenshotMonitorIcon color={labsAttachScreenCapture ? 'primary' : undefined} sx={{ mr: 0.25 }} /> Screen Capture</>} description={'v1.13 · ' + (labsAttachScreenCapture ? 'Enabled' : 'Disabled')}
      checked={labsAttachScreenCapture} onChange={setLabsAttachScreenCapture}
    />}

    {!isMobile && <FormSwitchControl
      title={<><AddAPhotoIcon color={labsCameraDesktop ? 'primary' : undefined} sx={{ mr: 0.25 }} /> Webcam</>} description={/*'v1.8 · ' +*/ (labsCameraDesktop ? 'Enabled' : 'Disabled')}
      checked={labsCameraDesktop} onChange={setLabsCameraDesktop}
    />}

    <FormControl orientation='horizontal' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <FormLabelStart title='Graduated' description='Ex-labs' />
      <Typography level='body-xs'>
        <Link href='https://github.com/smart-window/com-chat/issues/208' target='_blank'>Split Chats</Link>
        {' · '}<Link href='https://github.com/smart-window/com-chat/issues/359' target='_blank'>Draw App</Link>
        {' · '}<Link href='https://github.com/smart-window/com-chat/issues/354' target='_blank'>Call AI</Link>
        {' · '}<Link href='https://github.com/smart-window/com-chat/issues/282' target='_blank'>Persona Creator</Link>
        {' · '}<Link href='https://github.com/smart-window/com-chat/issues/192' target='_blank'>Auto Diagrams</Link>
        {' · '}Imagine · Relative chat size · Text Tools · LLM Overheat
      </Typography>
    </FormControl>

  </>;
}