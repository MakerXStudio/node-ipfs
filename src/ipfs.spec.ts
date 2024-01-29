import { PinataStorageWithCache } from './ipfs'
import { ObjectCache } from '@makerx/node-cache'
import { mock, Mock } from 'ts-jest-mocker'

const testToken = 'DUMMY_TOKEN'
const testCid = 'bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq'

describe('PinataStorageWithCache', () => {
  let cache: Mock<ObjectCache>
  let ipfs: PinataStorageWithCache
  let fetch: jest.SpyInstance

  beforeAll(() => {
    fetch = jest.spyOn(global, 'fetch')
  })

  beforeEach(() => {
    cache = mock<ObjectCache>()
    ipfs = new PinataStorageWithCache(testToken, cache)
    fetch.mockReset()
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ IpfsHash: testCid }),
    })
  })

  describe('putBlob', () => {
    const testBlob = new Uint8Array([104, 101, 108, 108, 111])

    it('posts blob to pinata', async () => {
      const { cid } = await ipfs.putBlob(testBlob, 'text/plain', 'test.txt')

      expect(cid).toEqual(testCid)
      expect(fetch.mock.calls.length).toBe(1)
      expect(fetch.mock.calls[0][0]).toEqual('https://api.pinata.cloud/pinning/pinFileToIPFS')
      expect(fetch.mock.calls[0][1]).toEqual({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: expect.any(FormData),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bodyParts = Array.from(fetch.mock.calls[0][1].body.entries()).reduce((acc: any, [k, v]: any) => ({ ...acc, [k]: v }), {})
      expect(bodyParts).toMatchObject({
        file: {
          type: 'text/plain',
          name: 'test.txt',
          size: 5,
        },
        pinataOptions: JSON.stringify({
          cidVersion: 1,
          wrapWithDirectory: false,
        }),
        pinataMetadata: JSON.stringify({ name: 'test.txt' }),
      })
    })

    it('puts blob to cache', async () => {
      await ipfs.putBlob(testBlob, 'text/plain', 'test.txt')

      expect(cache.put.mock.calls).toEqual([[`ipfs-${testCid}`, testBlob]])
    })
  })

  describe('put', () => {
    const testJson = { hello: 'world' }

    it('posts json to pinata', async () => {
      const { cid } = await ipfs.put(testJson, 'test.json')

      expect(cid).toEqual(testCid)
      expect(fetch.mock.calls.length).toBe(1)
      expect(fetch.mock.calls[0][0]).toEqual('https://api.pinata.cloud/pinning/pinJSONToIPFS')
      expect(fetch.mock.calls[0][1]).toEqual({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          pinataContent: testJson,
          pinataOptions: {
            cidVersion: 1,
            wrapWithDirectory: false,
          },
          pinataMetadata: { name: 'test.json' },
        }),
      })
    })

    it('puts json to cache', async () => {
      await ipfs.put(testJson, 'test.json')

      expect(cache.put.mock.calls).toEqual([[`ipfs-${testCid}`, testJson]])
    })
  })
})
