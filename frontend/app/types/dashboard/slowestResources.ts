interface ISlowestResources {
	avg: number;
	url: string;
	type: string;
	name: string;
	chart: any[]
}

export default class SlowestResources {
	avg: ISlowestResources["avg"];
	url: ISlowestResources["url"];
	type: ISlowestResources["type"];
	name: ISlowestResources["name"];
	chart: ISlowestResources["chart"];

	constructor(data: ISlowestResources) {
		Object.assign(this, data);
	}
}