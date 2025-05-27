export interface Upload {
  uploaded: number;
  fileName?: string;
  url?: string;
  error?: string;
  message?: string;
  page?: number;
  total?: number;
}
