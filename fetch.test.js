import fetch from './fetch.min';

describe('fetch()', () => {
  it('works', async () => {
    await fetch('https://google.com/').then(res => res.text());
  }, 10000);
});
