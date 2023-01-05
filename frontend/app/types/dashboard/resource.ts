const getName = (url = '') => url.split('/').filter(part => !!part).pop();

interface IResource {
  avgDuration: number;
  sessions: any[];
  chart: any[];
  url: string;
  name: string;
}

export default class Resource {
  avgDuration: IResource["avgDuration"];
  sessions: IResource["sessions"];
  chart: IResource["chart"] = [];
  url: IResource["url"] = '';
  name: IResource["name"] = '';

  constructor(data: IResource) {
    Object.assign(this, {
      ...data,
      name: getName(data.url),
    })
  }
}