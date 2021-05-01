import { Record } from 'immutable';

const MemoryConsumption = Record({
  avgFps: undefined,
  avgUsedJsHeapSize: undefined,
  avgCpu: undefined,
  chart: [],
});

function fromJS(data = {}) {
  const size = data.avgUsedJsHeapSize && data.avgUsedJsHeapSize / 1024 / 1024
  if (data instanceof MemoryConsumption) return data;
  return new MemoryConsumption({...data, avgUsedJsHeapSize: size});
}

export default fromJS;