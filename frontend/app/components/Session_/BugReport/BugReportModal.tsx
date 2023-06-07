import React from 'react';
import { connect } from 'react-redux';
import { countries } from 'App/constants';
import { useStore } from 'App/mstore';
import { Button } from 'UI';
import { session as sessionRoute } from 'App/routes';
import { ReportDefaults, EnvData, Activity } from './types';
import Session from './components/Session';
import MetaInfo from './components/MetaInfo';
import Title from './components/Title';
import Comments from './components/Comments';
import Steps from './components/Steps';
import { mapEvents } from './utils';
import { fetchList as fetchMembers } from 'Duck/member';

interface Props {
  hideModal: () => void;
  session: Record<string, any>;
  account: Record<string, any>;
  width: number;
  height: number;
  xrayProps: {
    currentLocation: Record<string, any>[];
    resourceList: Record<string, any>[];
    exceptionsList: Record<string, any>[];
    eventsList: Record<string, any>[];
    endTime: number;
  };
  fetchMembers: () => void
  members: any;
}

function BugReportModal({ hideModal, session, width, height, account, xrayProps, fetchMembers, members }: Props) {
  const reportRef = React.createRef<HTMLDivElement>();
  const [isRendering, setRendering] = React.useState(false);

  const { bugReportStore } = useStore();
  const {
    userBrowser,
    userDevice,
    userCountry,
    userBrowserVersion,
    userOs,
    userOsVersion,
    userDisplayName,
    userDeviceType,
    revId,
    metadata,
    sessionId,
    events,
    notes,
  } = session;

  const envObject: EnvData = {
    Device: `${userDevice}${userDeviceType !== userDevice ? ` ${userDeviceType}` : ''}`,
    Resolution: `${width}x${height}`,
    Browser: `${userBrowser} v${userBrowserVersion}`,
    OS: `${userOs} v${userOsVersion}`,
    // @ts-ignore
    Country: countries[userCountry],
  };
  if (revId) {
    Object.assign(envObject, { Rev: revId });
  }

  const sessionUrl = `${window.location.origin}/${
    window.location.pathname.split('/')[1]
  }${sessionRoute(sessionId)}`;

  const defaults: ReportDefaults = {
    author: account.name,
    env: envObject,
    meta: metadata,
    session: {
      user: userDisplayName,
      id: sessionId,
      url: sessionUrl,
    },
  };

  React.useEffect(() => {
    fetchMembers()
    bugReportStore.updateReportDefaults(defaults);
    bugReportStore.setDefaultSteps(mapEvents(events));
  }, []);

  const onClose = () => {
    hideModal();
    return bugReportStore.clearStore();
  }

  const onGen = () => {
    // @ts-ignore
    import('html2canvas').then(({ default: html2canvas }) => {
      // @ts-ignore
      window.html2canvas = html2canvas;

      // @ts-ignore
      import('jspdf').then(({ jsPDF }) => {
        setRendering(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const now = new Date().toISOString();

        doc.addMetadata('Author', account.name);
        doc.addMetadata('Title', 'OpenReplay Bug Report');
        doc.addMetadata('Subject', 'OpenReplay Bug Report');
        doc.addMetadata('Keywords', 'OpenReplay Bug Report');
        doc.addMetadata('Creator', 'OpenReplay');
        doc.addMetadata('Producer', 'OpenReplay');
        doc.addMetadata('CreationDate', now);

        // DO NOT DELETE UNUSED RENDER FUNCTION
        // REQUIRED FOR FUTURE USAGE AND AS AN EXAMPLE OF THE FUNCTIONALITY

        function buildPng() {
          html2canvas(reportRef.current!, {
            scale: 2,
            ignoreElements: (e) => e.id.includes('pdf-ignore'),
          }).then((canvas) => {
            const imgData = canvas.toDataURL('img/png');

            let imgWidth = 200;
            let pageHeight = 295;
            let imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight - pageHeight;
            let position = 0;


            doc.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);

            doc.addImage('/assets/img/report-head.png', 'png', 210/2 - 40/2, 2, 45, 5);
            if (position === 0 && heightLeft === 0) doc.addImage('/assets/img/report-head.png', 'png', 210/2 - 40/2, pageHeight - 5, 45, 5);

            while (heightLeft >= 0) {
              position = heightLeft - imgHeight;
              doc.addPage();
              doc.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
              doc.addImage('/assets/img/report-head.png', 'png', 210/2 - 40/2, pageHeight - 5, 45, 5);
              heightLeft -= pageHeight;
            }

            doc.link(5, 295 - Math.abs(heightLeft) - 25, 200, 30, { url: sessionUrl });

            doc.save('Bug Report: ' + sessionId + '.pdf');
            setRendering(false);
          });
        }
        function buildText() {
          doc
            .html(reportRef.current!, {
              x: 0,
              y: 0,
              width: 210,
              windowWidth: reportRef.current!.getBoundingClientRect().width,
              autoPaging: 'text',
              html2canvas: {
                ignoreElements: (e) => e.id.includes('pdf-ignore') || e instanceof SVGElement,
              },
            })
            .save('html.pdf')
            .then(() => {
              setRendering(false);
            })
            .catch((e) => {
              console.error(e);
              setRendering(false);
            });
        }
        // buildText();
        buildPng();

        const activity = {
          network: xrayProps.resourceList,
          console: xrayProps.exceptionsList,
          clickRage: xrayProps.eventsList.filter((item: any) => item.type === 'CLICKRAGE'),
        }
        bugReportStore.composeReport(activity as unknown as Activity)
      });
    });
  };

  return (
    <div
      className="bg-white overflow-y-scroll"
      style={{ height: '100vh' }}
    >
      <div className="flex flex-col p-4 gap-8 bg-white relative" ref={reportRef}>
        <Title userName={account.name} />
        <MetaInfo envObject={envObject} metadata={metadata} />
        <Steps xrayProps={xrayProps} notes={notes} members={members} />
        <Comments />
        <Session user={userDisplayName} sessionUrl={sessionUrl} />
        <div id="pdf-ignore" className="flex items-center gap-2 mt-4">
          <Button icon="file-pdf" variant="primary" onClick={onGen} loading={isRendering}>
            Download Bug Report
          </Button>
          <Button variant="text-primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      {isRendering ? (
        <div
          className="fixed min-h-screen flex text-xl items-center justify-center top-0 right-0 cursor-wait"
          style={{ background: 'rgba(0,0,0, 0.2)', zIndex: 9999, width: 620, maxWidth: '70vw' }}
          id="pdf-ignore"
        >
          <div>Rendering PDF Report</div>
        </div>
      ) : null}
    </div>
  );
}

const WithUIState = connect((state) => ({
  // @ts-ignore
  session: state.getIn(['sessions', 'current']),
  // @ts-ignore
  account: state.getIn(['user', 'account']),
  // @ts-ignore
  members: state.getIn(['members', 'list']),
}), { fetchMembers })(BugReportModal);

export default WithUIState;
