export function sankeyTooltip(
  echartNodes: any[],
  nodeValues: Record<string, number>,
) {
  return (params: any) => {
    if ('source' in params.data && 'target' in params.data) {
      const sourceName = echartNodes[params.data.source].name;
      const targetName = echartNodes[params.data.target].name;
      const sourceValue = nodeValues[params.data.source];

      const safeSourceName = shortenString(sourceName);
      const safeTargetName = shortenString(targetName);
      return `
      <div class="flex gap-2 w-fit px-2 bg-white items-center rounded-xl">
        <div class="flex flex-col">
          <div class="flex flex-col text-sm">
            <div class="font-semibold">
            <span class="text-base" style="color:#394eff">&#8592;</span> ${safeSourceName}
            </div>
            <div class="text-black">
              ${sourceValue} <span class="text-disabled-text">Sessions</span>
            </div>
            <div class="font-semibold mt-2">
              <span class="text-base" style="color:#394eff">&#8594;</span> ${safeTargetName}
            </div>
            <div class="flex items-baseline gap-2 text-black">
              <span>${params.data.value} (${params.data.percentage.toFixed(
                2,
              )}%)</span>
              <span class="text-disabled-text">Sessions</span>
            </div>
          </div>
        </div>
      </div>
      `;
    }
    if ('name' in params.data) {
      return `
      <div class="flex flex-col">
        <div class="font-semibold text-sm flex gap-1 items-center"><span class="text-base" style="color:#394eff; font-family: sans-serif;">&#9632;&#xFE0E;</span> ${params.data.name}</div>
        <div class="text-black text-sm">${params.value} <span class="text-disabled-text">Sessions</span></div>
      </div>
      `;
    }
  };
}

const shortenString = (str: string) => {
  const limit = 60;
  const leftPart = 25;
  const rightPart = 20;
  const safeStr =
    str.length > limit
      ? `${str.slice(0, leftPart)}...${str.slice(
          str.length - rightPart,
          str.length,
        )}`
      : str;

  return safeStr;
};

export const getEventPriority = (type: string): number => {
  switch (type) {
    case 'DROP':
      return 3;
    case 'OTHER':
      return 2;
    default:
      return 1;
  }
};

export const getNodeName = (
  eventType: string,
  nodeName: string | null,
): string => {
  if (!nodeName) {
    return eventType.charAt(0) + eventType.slice(1).toLowerCase();
  }
  return nodeName;
};
