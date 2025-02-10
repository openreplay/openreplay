export const renderClickmapThumbnail = () => {
    // @ts-ignore
    return import('html2canvas').then(({ default: html2canvas }) => {
        // @ts-ignore
        window.html2canvas = html2canvas;
        const element = document.querySelector<HTMLIFrameElement>('#clickmap-render  * iframe').contentDocument.body
        if (element) {
            const dimensions = element.getBoundingClientRect()
            return html2canvas(
                element,
                {
                    scale: 1,
                    // allowTaint: true,
                    useCORS: true,
                    foreignObjectRendering: true,
                    height: dimensions.height > 900 ? 900 : dimensions.height,
                    width: dimensions.width > 1200 ? 1200 : dimensions.width,
                    x: 0,
                    y: 0,
                    ignoreElements: (e) => e.id.includes('render-ignore'),
                }
            ).then((canvas) => {
                return canvas.toDataURL('img/png');
            }).catch(console.log);
        } else {
            Promise.reject("can't find clickmap container")
        }
    })
}