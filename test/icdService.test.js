
// test/icdService.test.js
const { dumpIcdData } = require('../src/services/icdService');
const axios = require('axios');

// Mock axios globally
jest.mock('axios');

describe('ICD Service Tests', () => {
  it('should fetch data and call onRecord callback', async () => {
    // Arrange mock data
    const rootEntity = {
      code: 'root',
      child: ['https://id.who.int/icd/entity/child1'],
    };
    const childEntity = {
      code: 'child1',
      child: [],
    };

    axios.get.mockResolvedValueOnce({ data: rootEntity });
    axios.get.mockResolvedValueOnce({ data: childEntity });

    const onRecordMock = jest.fn();

    // Act
    await dumpIcdData({
      onRecord: onRecordMock,
    });

    // Assert
    expect(onRecordMock).toHaveBeenCalledTimes(2);
    const firstCall = onRecordMock.mock.calls[0][0];
    expect(firstCall.code).toBe('root');
  });
});
