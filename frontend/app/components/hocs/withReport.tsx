import React, { useEffect } from 'react';
import { convertElementToImage } from 'App/utils';
import { jsPDF } from "jspdf";
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
import { connect } from 'react-redux';
interface Props {
    site: any
}
export default function withReport<P extends Props>(
    WrappedComponent: React.ComponentType<P>,
) {
    const ComponentWithReport = (props: P) => {
        const [rendering, setRendering] = React.useState(false);
        const { site } = props;
        const { dashboardStore } = useStore();
        const dashboard: any = useObserver(() => dashboardStore.selectedDashboard);
        const widgets: any = useObserver(() => dashboard?.widgets);
        const period = useObserver(() => dashboardStore.period);
        console.log('site', site)
        
        const addFooters = (doc) => {
            const pageCount = doc.internal.getNumberOfPages();
            for(var i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(136,136,136);
                doc.text('Page ' + String(i) + ' of ' + String(pageCount), 196,285,null,null,"right");
            }
        }
    
        const renderReport = async () => {
            document.body.scrollIntoView();
            const doc = new jsPDF('p', 'mm', 'a4');
            
            doc.addMetadata('Author', 'OpenReplay');
            doc.addMetadata('Title', 'OpenReplay Report');
            doc.addMetadata('Subject', 'OpenReplay Report');
            doc.addMetadata('Keywords', 'OpenReplay Report');
            doc.addMetadata('Creator', 'OpenReplay');
            doc.addMetadata('Producer', 'OpenReplay');
            doc.addMetadata('CreationDate', new Date().toISOString());
    
    
            const parentElement = document.getElementById('report') as HTMLElement;
            const pageHeight = 1200;
            const pagesCount = parentElement.offsetHeight / pageHeight;
            const pages: Array<any> = [];
            for(let i = 0; i < pagesCount; i++) {
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
    
            const rportLayer = document.getElementById("report-layer");
    
            pages.forEach(async (page, index) => {
                const pageDiv = document.createElement('div');
                pageDiv.classList.add('grid', 'gap-4', 'grid-cols-4', 'items-start', 'pb-10', 'auto-rows-min', 'printable-report');
                pageDiv.id = `page-${index}`;
                pageDiv.style.backgroundColor = '#f6f6f6';
                pageDiv.style.gridAutoRows = 'min-content';
                pageDiv.style.padding = '30px';
                pageDiv.style.height = '490mm';
    
                if (index === 0) {
                    const header = document.getElementById('report-header')?.cloneNode(true) as HTMLElement;
                    header.classList.add('col-span-4');
                    header.style.display = 'block';
                    pageDiv.appendChild(header);
                }
                page.forEach((child) => {
                    pageDiv.appendChild(child.cloneNode(true));
                })
                rportLayer?.appendChild(pageDiv);
            })
    
            setTimeout(async () => {
                for (let i = 0; i < pages.length; i++) {
                    const pageDiv = document.getElementById(`page-${i}`) as HTMLElement;
                    const pageImage = await convertElementToImage(pageDiv);
                    doc.addImage(pageImage, 'PNG', 0, 0, 210, 0);
                    if (i === pages.length - 1) {
                        addFooters(doc);
                        doc.save('report.pdf');
                        rportLayer!.innerHTML = '';
                    } else {
                        doc.addPage();
                    }
                }
            }, 100)
        }
        
        return (
            <>
                <div className="mb-2" id="report-header" style={{ display: 'none' }}>
                    <div className="flex items-end justify-between" style={{ margin: '-30px', padding: '25px 30px', backgroundColor: 'white' }}>
                        <div className="">
                            <img src="/logo.svg" style={{ height: '30px' }} />
                        </div>
                        <div style={{ whiteSpace: 'nowrap' }}>
                            Project: <span className="font-medium">{site && site.name}</span>
                        </div>
                    </div>
                    <div className="flex items-end mt-16 justify-between">
                        <div className="text-2xl font-medium">{dashboard && dashboard.name}</div>
                        <div className="font-medium">
                            {period && (period.range.start.format('MMM Do YY') + ' - ' + period.range.end.format('MMM Do YY'))}
                        </div>
                    </div>
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
                <WrappedComponent {...props} renderReport={renderReport} rendering={rendering} />
            </>
        )
    }

    return connect(state => ({
        site: state.getIn(['site', 'instance']),
    }))(ComponentWithReport);
}