export interface GitJobData {
  repoUrl: string;
  branch: string;
  id: number;
  name: string;
  skipFetch?: boolean;
}
