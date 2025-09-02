export interface Data {
  issueName: string;
  impact: number;
  issueLabels: {
    name: string;
    ratio: number;
  }[];
  journeyLabels: {
    name: string;
    ratio: number;
  }[];
}
