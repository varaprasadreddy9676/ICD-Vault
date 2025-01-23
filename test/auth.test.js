
// test/auth.test.js
const { getAccessToken } = require('../src/services/auth');
const axios = require('axios');

jest.mock('axios');

describe('Auth Service', () => {
  it('should return a token', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        access_token: 'fake_token',
        expires_in: 3600,
      },
    });

    const token = await getAccessToken();
    expect(token).toBe('fake_token');
  });
});
