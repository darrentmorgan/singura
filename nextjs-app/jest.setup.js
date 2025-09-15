// Mock NextJS Web APIs for Node test environment
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto.randomUUID for tests
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'test-uuid-' + Math.random().toString(36).substr(2, 9);
}

// Mock Headers class
global.Headers = global.Headers || class MockHeaders extends Map {
  constructor(init = {}) {
    super();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.set(key.toLowerCase(), value);
      });
    }
  }
  
  get(name) {
    return super.get(name.toLowerCase());
  }
  
  set(name, value) {
    return super.set(name.toLowerCase(), value);
  }
  
  has(name) {
    return super.has(name.toLowerCase());
  }
  
  delete(name) {
    return super.delete(name.toLowerCase());
  }
};

// Mock Response class
global.Response = global.Response || class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new global.Headers(init.headers || {});
  }
  
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }
  
  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init.headers
      }
    });
  }
};

// Mock Request class
global.Request = global.Request || class MockRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new global.Headers(init.headers || {});
    this.body = init.body;
    this.ip = '127.0.0.1';
  }
  
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }
};