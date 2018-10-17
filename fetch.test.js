import fch from './fetch';
global.fetch = require('jest-fetch-mock');

describe('fetch()', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('works', async () => {
    fetch.once(JSON.stringify({ secret: '12345' }));
    const res = await fch('https://google.com/').json();

    expect(res).toEqual({ secret: '12345' });
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com/');
  });

  it('can use the `fetch.get()` shorthand', async () => {
    fetch.once('get');
    expect(await fch.get('/').text()).toBe('get');
    expect(fetch.mock.calls[0][1].method).toEqual('get');
  });

  it('can use the `fetch.patch()` shorthand', async () => {
    fetch.once('patch');
    expect(await fch.patch('/').text()).toBe('patch');
    expect(fetch.mock.calls[0][1].method).toEqual('patch');
  });

  it('can use the `fetch.put()` shorthand', async () => {
    fetch.once('put');
    expect(await fch.put('/').text()).toBe('put');
    expect(fetch.mock.calls[0][1].method).toEqual('put');
  });

  it('can use the `fetch.post()` shorthand', async () => {
    fetch.once('post');
    expect(await fch.post('/').text()).toBe('post');
    expect(fetch.mock.calls[0][1].method).toEqual('post');
  });

  it('can use the `fetch.del()` shorthand', async () => {
    fetch.once('del');
    expect(await fch.del('/').text()).toBe('del');
    expect(fetch.mock.calls[0][1].method).toEqual('delete');
  });

  it('ignores invalid options', async () => {
    fetch.once(JSON.stringify({ secret: '12345' }));
    const res = await fch('https://google.com/', 10).json();

    expect(res).toEqual({ secret: '12345' });
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com/');
  });

  it('will not overwrite if it is FormData', async () => {
    fetch.once(JSON.stringify({ secret: '12345' }));
    const res = await fch('/', { method: 'POST', body: new FormData() }).json();

    expect(res).toEqual({ secret: '12345' });
    expect(fetch.mock.calls.length).toEqual(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(opts).toMatchObject({ body: expect.any(FormData) });
  });

  it('will not overwrite if content-type is set', async () => {
    fetch.once(JSON.stringify({ secret: '12345' }));
    const res = await fch('/', {
      method: 'POST',
      body: { a: 'b'},
      headers: { 'Content-Type': 'xxx' }
    }).json();

    expect(res).toEqual({ secret: '12345' });
    expect(fetch.mock.calls.length).toEqual(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toEqual('/');
    expect(opts).toMatchObject({
      method: 'POST',
      body: { a: 'b' },
      headers: { 'content-type': 'xxx' }
    });
  });

  it('will send JSON', async () => {
    fetch.once(JSON.stringify({ secret: '12345' }));
    const res = await fch('/', { method: 'POST', body: { a: 'b'} }).json();

    expect(res).toEqual({ secret: '12345' });
    expect(fetch.mock.calls.length).toEqual(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toEqual('/');
    expect(opts).toMatchObject({
      method: 'POST',
      body: '{"a":"b"}',
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  });

  it('can run in parallel', async () => {
    fetch.once(JSON.stringify('a')).once(JSON.stringify('b'));
    const res = await Promise.all(['/a', '/b'].map(url => fch(url).json()));

    expect(res).toEqual(['a', 'b']);
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it('will not trigger racer conditions on get for the same url', async () => {
    fetch.once(JSON.stringify('a')).once(JSON.stringify('b'));
    const res = await Promise.all(['/', '/'].map(url => fch(url).json()));

    expect(res).toEqual(['a', 'a']);
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it('can set `accepts` insensitively', async () => {
    fetch.once(JSON.stringify({ secret: '12345' }));
    const res = await fch('/', { headers: { 'Accepts': 'text/xml' } }).json();

    const [url, opts] = fetch.mock.calls[0];
    expect(opts.headers).toEqual({ 'accepts': 'text/xml' });
  });

  it('can accept network rejections', async () => {
    fetch.mockResponseOnce(JSON.stringify("unauthorized"), { status: 401, ok: false });
    await expect(fch('/')).rejects.toMatchObject({
      message: 'Unauthorized'
    });
  });

  it('can accept rejections', async () => {
    fetch.mockRejectOnce(new Error('fake error message'));
    await expect(fch('/')).rejects.toMatchObject({
      message: 'fake error message'
    });
  });
});
