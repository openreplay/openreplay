import React from 'react';
import { ResponsiveContainer, Sankey } from 'recharts';

import CustomLink from 'App/components/shared/Insights/SankeyChart/CustomLink';
import CustomNode from 'App/components/shared/Insights/SankeyChart/CustomNode';

import { USER_PATH } from 'App/constants/card';
import ExCard from './ExCard';

function ExamplePath(props: any) {
  const data = {
    nodes: [
      { idd: 0, name: 'Home' },
      { idd: 1, name: 'Google' },
      { idd: 2, name: 'Facebook' },
      { idd: 3, name: 'Search' },
      { idd: 4, name: 'Product' },
      { idd: 5, name: 'Chart' },
    ],
    links: [
      { source: 0, target: 3, value: 40 },
      { source: 0, target: 4, value: 60 },

      { source: 1, target: 3, value: 100 },
      { source: 2, target: 3, value: 100 },

      { source: 3, target: 4, value: 50 },
      { source: 3, target: 5, value: 50 },

      { source: 4, target: 5, value: 15 },
    ],
  };

  return (
    <ExCard {...props}>
      <ResponsiveContainer width="100%" height={230}>
        <Sankey
          nodeWidth={6}
          sort={false}
          iterations={128}
          node={<CustomNode />}
          link={(linkProps) => <CustomLink {...linkProps} />}
          data={data}
        >
          <defs>
            <linearGradient id="linkGradient">
              <stop offset="0%" stopColor="rgba(57, 78, 255, 0.2)" />
              <stop offset="100%" stopColor="rgba(57, 78, 255, 0.2)" />
            </linearGradient>
          </defs>
        </Sankey>
      </ResponsiveContainer>
    </ExCard>
  );
}

export default ExamplePath;
