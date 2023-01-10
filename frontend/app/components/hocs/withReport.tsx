import React, { useEffect } from 'react';
import { convertElementToImage } from 'App/utils';
import { jsPDF } from 'jspdf';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { connect } from 'react-redux';
import { fileNameFormat } from 'App/utils';
import { toast } from 'react-toastify';
import { forceVisible } from 'react-lazyload';

const TEXT_GENERATING = 'Generating report...';
const TEXT_SUCCESS = 'Report successfully generated';
interface Props {
  site: any;
}
export default function withReport<P extends Props>(WrappedComponent: React.ComponentType<P>) {
  const ComponentWithReport = (props: P) => {
    const [rendering, setRendering] = React.useState(false);
    const { site } = props;
    const { dashboardStore } = useStore();
    const dashboard: any = useObserver(() => dashboardStore.selectedDashboard);
    const period = useObserver(() => dashboardStore.period);
    const pendingRequests = useObserver(() => dashboardStore.pendingRequests);

    useEffect(() => {
      if (rendering && pendingRequests <= 0) {
        processReport();
      }
    }, [pendingRequests]);

    const addFooters = (doc: any) => {
      const pageCount = doc.internal.getNumberOfPages();
      for (var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text('Page ' + String(i) + ' of ' + String(pageCount), 200, 290, null, null, 'right');
        doc.addImage('/assets/img/logo-open-replay-grey.png', 'png', 10, 288, 20, 0);
      }
    };

    const renderPromise = async (): Promise<any> => {
      forceVisible();
      setRendering(true);
      toast.info(TEXT_GENERATING, {
        autoClose: false,
        isLoading: true,
      });
    };

    const processReport = () => {
      document.body.scrollIntoView();
      const doc = new jsPDF('p', 'mm', 'a4');
      const now = new Date().toISOString();

      doc.addMetadata('Author', 'OpenReplay');
      doc.addMetadata('Title', 'OpenReplay Report');
      doc.addMetadata('Subject', 'OpenReplay Report');
      doc.addMetadata('Keywords', 'OpenReplay Report');
      doc.addMetadata('Creator', 'OpenReplay');
      doc.addMetadata('Producer', 'OpenReplay');
      doc.addMetadata('CreationDate', now);

      const parentElement = document.getElementById('report') as HTMLElement;
      const pageHeight = 1200;
      const pagesCount = parentElement.offsetHeight / pageHeight;
      const pages: Array<any> = [];
      for (let i = 0; i < pagesCount; i++) {
        const page = document.createElement('div');
        page.classList.add('page');
        page.style.height = `${pageHeight}px`;
        page.style.whiteSpace = 'no-wrap !important';

        const childrens = Array.from(parentElement.children).filter((child) => {
          const rect = child.getBoundingClientRect();
          const parentRect = parentElement.getBoundingClientRect();
          const top = rect.top - parentRect.top;
          return top >= i * pageHeight && top < (i + 1) * pageHeight;
        });
        if (childrens.length > 0) {
          pages.push(childrens);
        }
      }

      const rportLayer = document.getElementById('report-layer');

      pages.forEach(async (page, index) => {
        const pageDiv = document.createElement('div');
        pageDiv.classList.add(
          'grid',
          'gap-4',
          'grid-cols-4',
          'items-start',
          'pb-10',
          'auto-rows-min',
          'printable-report'
        );
        pageDiv.id = `page-${index}`;
        pageDiv.style.backgroundColor = '#f6f6f6';
        pageDiv.style.gridAutoRows = 'min-content';
        pageDiv.style.padding = '50px';
        pageDiv.style.height = '490mm';

        if (index > 0) {
          pageDiv.style.paddingTop = '100px';
        }

        if (index === 0) {
          const header = document.getElementById('report-header')?.cloneNode(true) as HTMLElement;
          header.classList.add('col-span-4');
          header.style.display = 'block';
          pageDiv.appendChild(header);
        }
        page.forEach((child: any) => {
          pageDiv.appendChild(child.cloneNode(true));
        });
        rportLayer?.appendChild(pageDiv);
      });

      setTimeout(async () => {
        for (let i = 0; i < pages.length; i++) {
          const pageDiv = document.getElementById(`page-${i}`) as HTMLElement;
          const pageImage = await convertElementToImage(pageDiv);
          doc.addImage(pageImage, 'PNG', 0, 0, 210, 0);
          if (i === pages.length - 1) {
            addFooters(doc);
            doc.save(fileNameFormat(dashboard.name + '_Report_' + Date.now(), '.pdf'));
            rportLayer!.innerHTML = '';
            setRendering(false);
            toast.dismiss();
            toast.success(TEXT_SUCCESS);
          } else {
            doc.addPage();
          }
        }
      }, 100);
    };

    return (
      <>
        <div className="mb-2" id="report-header" style={{ display: 'none' }}>
          <div
            className="flex items-end justify-between"
            style={{ margin: '-50px', padding: '25px 50px', backgroundColor: 'white' }}
          >
            <div className="flex items-center">
              <img src="/assets/logo.svg" style={{ height: '30px' }} />
              <div className="text-lg color-gray-medium ml-2 mt-1">REPORT</div>
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>
              <span className="font-semibold">Project:</span> {site && site.name}
            </div>
          </div>
          <div className="flex items-end mt-20 justify-between">
            <div className="text-2xl font-semibold">{dashboard && dashboard.name}</div>
            <div className="font-semibold">
              {period &&
                period.range.start.format('MMM Do YY') +
                  ' - ' +
                  period.range.end.format('MMM Do YY')}
            </div>
          </div>
          {dashboard && dashboard.description && (
            <div className="color-gray-medum whitespace-pre-wrap my-2">{dashboard.description}</div>
          )}
        </div>

        <div
          id="report-layer"
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            zIndex: '-1',
            opacity: '0',
          }}
        ></div>
        <WrappedComponent {...props} renderReport={renderPromise} rendering={rendering} />
      </>
    );
  };

  return connect((state: any) => ({
    site: state.getIn(['site', 'instance']),
  }))(ComponentWithReport);
}
