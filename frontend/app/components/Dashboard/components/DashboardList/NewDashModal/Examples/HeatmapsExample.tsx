import React, { useEffect } from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import heatmapRenderer from 'Player/web/addons/simpleHeatmap';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
}

function HeatmapsExample(props: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const pointMap: Record<
      string,
      { times: number; data: number[]; original: any }
    > = {};
    let maxIntensity = 0;

    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 300);
      const y = Math.floor(Math.random() * 180);
      const key = `${x}-${y}`;
      if (!pointMap[key]) {
        pointMap[key] = {
          times: Math.floor(Math.random() * 100),
          data: [x, y],
          original: { x, y },
        };
      }

      maxIntensity = Math.max(maxIntensity, pointMap[key].times);
    }

    const heatmapData: number[][] = [];
    for (const key in pointMap) {
      const { data, times } = pointMap[key];
      heatmapData.push([...data, times]);
    }

    heatmapRenderer
      .setCanvas(canvasRef?.current!)
      .setData(heatmapData)
      .setRadius(15, 10)
      .setMax(maxIntensity)
      .resize()
      .draw();
  }, []);

  // const data = {};
  return (
    <ExCard {...props}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '224px',
          backgroundColor: '#F4F4F4',
          borderRadius: '10px',
        }}
      />
    </ExCard>
  );
}

export default HeatmapsExample;
