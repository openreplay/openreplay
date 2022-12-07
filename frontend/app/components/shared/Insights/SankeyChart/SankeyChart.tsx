import React from 'react';
import { Sankey, Tooltip, Rectangle, Layer, ResponsiveContainer } from 'recharts';

type Node = {
  name: string;
}

type Link = {
  source: number;
  target: number;
  value: number;
}

export interface SankeyChartData {
  links: Link[];
  nodes: Node[];
}
interface Props {
  data: SankeyChartData;
  nodePadding?: number;
  nodeWidth?: number;
}
function SankeyChart(props: Props) {
  const { data, nodePadding = 50, nodeWidth = 10 } = props;
  return (
    <div className="rounded border shadow">
      <div className="text-lg p-3 border-b bg-gray-lightest">Sankey Chart</div>
      <div className="">
        <ResponsiveContainer height={500} width="100%">
          <Sankey
            width={960}
            height={500}
            data={data}
            // node={{ stroke: '#77c878', strokeWidth: 0 }}
            node={<CustomNodeComponent />}
            nodePadding={nodePadding}
            nodeWidth={nodeWidth}
            margin={{
              left: 10,
              right: 100,
              top: 10,
              bottom: 10,
            }}
            link={<CustomLinkComponent />}
          >
            <defs>
              <linearGradient id={'linkGradient'}>
                <stop offset="0%" stopColor="rgba(0, 136, 254, 0.5)" />
                <stop offset="100%" stopColor="rgba(0, 197, 159, 0.3)" />
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SankeyChart;

const CustomTooltip = (props: any) => {
  return <div className="rounded bg-white border p-0 px-1 text-sm">test</div>;
  // if (active && payload && payload.length) {
  //   return (
  //     <div className="custom-tooltip">
  //       <p className="label">{`${label} : ${payload[0].value}`}</p>
  //       <p className="intro">{getIntroOfPage(label)}</p>
  //       <p className="desc">Anything you want can be displayed here.</p>
  //     </div>
  //   );
  // }

  return null;
};

function CustomNodeComponent({ x, y, width, height, index, payload, containerWidth }: any) {
  const isOut = x + width + 6 > containerWidth;
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill="#5192ca" fillOpacity="1" />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="8"
        // stroke="#333"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize="12"
        // stroke="#333"
        // strokeOpacity="0.5"
      >
        {payload.value + 'k'}
      </text>
    </Layer>
  );
}

const CustomLinkComponent = (props: any) => {
  const [fill, setFill] = React.useState('url(#linkGradient)');
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } =
    props;
  return (
    <Layer key={`CustomLink${index}`}>
      <path
        d={`
            M${sourceX},${sourceY + linkWidth / 2}
            C${sourceControlX},${sourceY + linkWidth / 2}
              ${targetControlX},${targetY + linkWidth / 2}
              ${targetX},${targetY + linkWidth / 2}
            L${targetX},${targetY - linkWidth / 2}
            C${targetControlX},${targetY - linkWidth / 2}
              ${sourceControlX},${sourceY - linkWidth / 2}
              ${sourceX},${sourceY - linkWidth / 2}
            Z
          `}
        fill={fill}
        strokeWidth="0"
        onMouseEnter={() => {
          setFill('rgba(0, 136, 254, 0.5)');
        }}
        onMouseLeave={() => {
          setFill('url(#linkGradient)');
        }}
      />
    </Layer>
  );
};
