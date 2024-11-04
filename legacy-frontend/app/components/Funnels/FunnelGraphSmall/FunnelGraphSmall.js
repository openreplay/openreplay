import React from 'react'
import { BarChart, Bar, Cell } from 'recharts';

function FunnelGraphSmall({ data }) {
  return (
    <div
      className="rounded-md flex items-center justify-center p-2"
      style={{ backgroundColor: 'rgba(62, 170, 175, 0.2)'}}
    >
      <BarChart width={50} height={40} data={data}>        
        <Bar
          dataKey='sessionsCount'
          maxBarSize={6}
          background={{ fill: '#DDDDDD' }}
        >
          {
            data.map((entry, index) => (
              <Cell cursor="pointer" fill={'#3EAAAF'} key={`cell-${index}`}/>
            ))
          }
        </Bar>        
      </BarChart>
    </div>
  )
}

export default FunnelGraphSmall
