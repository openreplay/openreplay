import {
  createListState,
} from './lists';

const MIN_INTERVAL = 500;


const NAME_MAP = {
	"mainThreadCPU": "cpu",
	"batteryLevel": "battery",
	"memoryUsage": "memory",
}

export default class PerformanceList {
	_list = createListState()
	availability = {
    cpu: false,
    memory: false,
    battery: false,
  }

	get list() {
		return this._list.list;
	}

	get count() {
		return this._list.count;
	}

	moveGetLast(t) {
		this._list.moveGetLast(t);
	}

	append(m) {
		if (!["mainThreadCPU", "memoryUsage", "batteryLevel", "thermalState", "activeProcessorCount", "isLowPowerModeEnabled"].includes(m.name)) {
			return;
		}

		let lastPoint = Object.assign({ time: 0, cpu: null, battery: null, memory: null }, this._list.last);
		if (this._list.length === 0) {
      this._list.append(lastPoint);
    }

    if (NAME_MAP[m.name] != null) {
    	this.availability[ NAME_MAP[m.name] ] = true;
    	if (lastPoint[NAME_MAP[m.name]] === null) {
    		this._list.forEach(p => p[NAME_MAP[m.name]] = m.value);
    		lastPoint[NAME_MAP[m.name]] = m.value;
    	}
    }


		const newPoint = Object.assign({}, lastPoint, { 
			time: m.time,
			[ NAME_MAP[m.name] || m.name ]: m.value,
		});

    const dif = m.time - lastPoint.time;
  	const insertCount = Math.floor(dif/MIN_INTERVAL);
  	for (let i = 0; i < insertCount; i++){
  		const evalValue = (key) => lastPoint[key] + Math.floor((newPoint[key]-lastPoint[key])/insertCount*(i + 1))
  		this._list.append({
  			...lastPoint,
        time: evalValue("time"),
        cpu: evalValue("cpu") + (Math.floor(5*Math.random())-2),
        battery: evalValue("battery"),
        memory:  evalValue("memory")*(1 + (0.1*Math.random() - 0.05)),
      });
  	}

    this._list.append(newPoint);
	}
}