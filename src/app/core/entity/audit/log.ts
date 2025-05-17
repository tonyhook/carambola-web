export interface Log {
  id: number;
  createTime: string;
  level: string;
  userId: number;
  username: string;
  requestMethod: string;
  requestResourceType: string;
  requestResourceId: string;
  requestParameter: string;
  requestBody: string;
  responseCode: number;
  responseBody: string;
}
