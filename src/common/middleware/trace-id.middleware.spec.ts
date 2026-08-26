import { IncomingMessage, ServerResponse } from 'node:http';
import { TraceIdMiddleware } from './trace-id.middleware';

describe(TraceIdMiddleware.name, () => {
  let middleware: TraceIdMiddleware;

  beforeEach(() => {
    middleware = new TraceIdMiddleware();
  });

  it('should set x-trace-id header from request.id', () => {
    const mockReq = { id: 'test-trace-456' } as unknown as IncomingMessage;
    const mockRes = { setHeader: jest.fn() } as unknown as ServerResponse;
    const mockNext = jest.fn();

    middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', 'test-trace-456');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next after setting the header', () => {
    const mockReq = { id: 'test-trace-789' } as unknown as IncomingMessage;
    const mockRes = { setHeader: jest.fn() } as unknown as ServerResponse;
    const mockNext = jest.fn();

    middleware.use(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should use "unknown" when request.id is missing', () => {
    const mockReq = {} as unknown as IncomingMessage;
    const mockRes = { setHeader: jest.fn() } as unknown as ServerResponse;
    const mockNext = jest.fn();

    middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', 'unknown');
  });
});
