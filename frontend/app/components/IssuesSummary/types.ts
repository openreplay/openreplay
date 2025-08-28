export interface Data {
  issueName: string;
  impact: number;
  labels: {
    name: string;
    ratio: number;
  }[];
}
