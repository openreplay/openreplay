import React, { useState } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import CustomLink from './CustomLink';
import CustomNode from './CustomNode';
import { NoContent } from 'UI';

interface Node {
  id: number;  // Assuming you missed this from your interface
  name: string;
  eventType: string;
  avgTimeFromPrevious: number | null;
}

interface Link {
  eventType: string;
  value: number;
  source: number;
  target: number;
}

interface Data {
  nodes: Node[];
  links: Link[];
}

interface Props {
  data: Data;
  nodeWidth?: number;
  height?: number;
}

const SankeyChart: React.FC<Props> = ({
                                        data,
                                        height = 240
                                      }: Props) => {
  const [highlightedLinks, setHighlightedLinks] = useState<number[]>([]);

  const handleLinkMouseEnter = (linkData: any) => {
    const { payload } = linkData;
    const fullPathArray: Node[] = [];

    console.log('linkData', linkData.index);

    // Add the source node of the current link
    fullPathArray.push(payload.source);
    fullPathArray.push(payload.target);


    if (payload.source.sourceLinks.length > 0) {
      let prevLink = data.links[payload.source.sourceLinks[0]];
      // fullPathArray.unshift(prevLink);
      fullPathArray.unshift(data.nodes[prevLink.source]);

      if (prevLink.source) {
        let prevLinkPrev = data.links[prevLink.source];
        // fullPathArray.unshift(prevLinkPrev);
        fullPathArray.unshift(data.nodes[prevLinkPrev.source]);
      }
    }

    setHighlightedLinks(fullPathArray);

    console.log('fullPathArray', fullPathArray.map(node => node));
  };


  return (
    <NoContent
      style={{ paddingTop: '80px' }}
      show={!data.nodes.length || !data.links.length}
      title={'No data for the selected time period.'}
    >
      <ResponsiveContainer height={height} width='100%'>
        <Sankey
          data={data}
          iterations={128}
          node={<CustomNode />}
          sort={true}
          onClick={(data) => {

          }}
          link={({ source, target, ...linkProps }, index) => (
            <CustomLink
              {...linkProps}
              strokeOpacity={highlightedLinks.includes(index) ? 1 : 0.2}
              onMouseEnter={() => handleLinkMouseEnter(linkProps)}
              onMouseLeave={() => setHighlightedLinks([])}
            />
          )}
          margin={{ right: 200 }}
        >
          <defs>
            <linearGradient id={'linkGradient'}>
              <stop offset='0%' stopColor='rgba(57, 78, 255, 0.2)' />
              <stop offset='100%' stopColor='rgba(57, 78, 255, 0.2)' />
            </linearGradient>
          </defs>
        </Sankey>
      </ResponsiveContainer>
    </NoContent>
  );
};

export default SankeyChart;
