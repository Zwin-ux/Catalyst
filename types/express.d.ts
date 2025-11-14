declare module 'express' {
  export interface Request {
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    body?: any;
  }

  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
    send(body?: any): Response;
    end(): Response;
  }

  export interface Router {
    get(path: string, handler: (...args: any[]) => any): Router;
    post(path: string, handler: (...args: any[]) => any): Router;
    use(...args: any[]): Router;
  }

  export function Router(): Router;
  type RequestHandler = (...args: any[]) => any;

  const express: {
    (): any;
    Router: typeof Router;
    json(...args: any[]): RequestHandler;
  };

  export default express;
  export { Router, Request, Response, RequestHandler };
}
