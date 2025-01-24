export function sankeyTooltip(echartNodes, nodeValues) {
  return (params) => {
    if ('source' in params.data && 'target' in params.data) {
      const sourceName = echartNodes[params.data.source].name;
      const targetName = echartNodes[params.data.target].name;
      const sourceValue = nodeValues[params.data.source];
      return `
      <div class="flex gap-2 w-fit px-2 bg-white items-center">
       <div class="flex flex-col">
          <div class="border-t border-l rounded-tl border-dotted border-gray-500" style="width: 8px; height: 30px"></div>
          <div class="border-b border-l rounded-bl border-dotted border-gray-500 relative" style="width: 8px; height: 30px">
            <div class="w-0 h-0 border-l-4 border-l-gray-500 border-y-4 border-y-transparent border-r-0 absolute -right-1 -bottom-1.5"></div>
          </div>
        </div>
       <div class="flex flex-col">
         <div class="font-semibold">${sourceName}</div>
         <div>${sourceValue}</div>
         <div class="font-semibold mt-2">${targetName}</div>
         <div>
          <span>${params.data.value}</span>
          <span class="text-disabled-text">${params.data.percentage.toFixed(
            2
          )}%</span>
         </div>
       </div>
      </div>
    `;
      //${sourceName} -> ${targetName}: ${params.data.value} sessions (${params.data.percentage.toFixed(2)}%)
    }
    if ('name' in params.data) {
      return `
      <div class="flex flex-col bg-white">
        <div class="font-semibold">${params.data.name}</div>
        <div>${params.value} sessions</div>
      </div>
    `;
    }
  };
}


export const getEventPriority = (type: string) => {
  switch (type) {
    case 'DROP':
      return 3;
    case 'OTHER':
      return 2;
    default:
      return 1;
  }
};

export const getNodeName = (eventType: string, nodeName: string | null) => {
  if (!nodeName) {
    // only capitalize first
    return eventType.charAt(0) + eventType.slice(1).toLowerCase();
  }
  return nodeName;
}

