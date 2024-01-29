import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import type { BinaryCacheOptions, BinaryWithMetadata, CacheOptions, ObjectCache } from '@makerx/node-cache'
import { fetchWithRetry } from './http'

export interface IPFS {
  get<T>(cid: string): Promise<T>
  put<T>(data: T, name?: string): Promise<{ cid: string }>
  getBlob(cid: string): Promise<Uint8Array>
  putBlob(blob: Uint8Array, contentType: string, name?: string): Promise<{ cid: string }>
  getCID<T>(data: T): Promise<string>
}

async function generateCID(data: Uint8Array) {
  // Mimics Pinata/Web3.Storage's implementation - manually calculating with raw doesn't work for binary, but this does
  const { importBytes } = await import('ipfs-unixfs-importer')
  const { MemoryBlockstore } = await import('blockstore-core/memory')
  const { cid } = await importBytes(data, new MemoryBlockstore(), { wrapWithDirectory: false })
  return cid.toString()
}

export class InMemoryIPFS implements IPFS {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: Record<string, any> = {}

  async get<T>(cid: string): Promise<T> {
    const cached = this.cache[cid]
    if (!cached) {
      throw new Error('404')
    }

    return JSON.parse(cached) as T
  }

  async put<T>(data: T, _name?: string): Promise<{ cid: string }> {
    const cid = await this.getCID(data)
    this.cache[cid] = JSON.stringify(data)
    return { cid: cid }
  }

  getBlob(cid: string): Promise<Uint8Array> {
    const cached = this.cache[cid]
    if (!cached) {
      throw new Error('404')
    }

    return Promise.resolve(cached as Uint8Array)
  }

  async putBlob(blob: Uint8Array, _contentType: string, _name?: string): Promise<{ cid: string }> {
    const cid = await this.getCID(blob)
    this.cache[cid] = blob
    return { cid: cid.toString() }
  }

  async getCID<T>(data: T): Promise<string> {
    if (data instanceof Uint8Array) {
      return await generateCID(data)
    } else {
      const bytes = raw.encode(Buffer.from(JSON.stringify(data)))
      const hash = await sha256.digest(bytes)
      const cid = CID.create(1, raw.code, hash)
      return cid.toString()
    }
  }
}

export class CacheOnlyIPFS implements IPFS {
  private cache: ObjectCache
  private getFromIpfs: boolean

  constructor(cache: ObjectCache, getFromIpfs?: boolean) {
    this.cache = cache
    this.getFromIpfs = getFromIpfs ?? false
  }

  async get<T>(cid: string): Promise<T> {
    return await this.cache.getAndCache<T>(
      `ipfs-${cid}`,
      async (_e) => {
        if (!this.getFromIpfs) {
          throw new Error('404')
        }
        const response = await fetchWithRetry(`https://${cid}.ipfs.cf-ipfs.com/`)
        const json = await response.json()
        return json as T
      },
      {
        staleAfterSeconds: undefined,
        returnStaleResultOnError: true,
      },
    )
  }

  async put<T>(data: T, _name?: string): Promise<{ cid: string }> {
    const cid = await this.getCID(data)
    await this.cache.getAndCache<T>(
      `ipfs-${cid}`,
      (_e) => {
        return Promise.resolve(data)
      },
      {
        staleAfterSeconds: 0,
        returnStaleResultOnError: false,
      },
    )
    return { cid: cid.toString() }
  }

  async getBlob(cid: string): Promise<Uint8Array> {
    return await this.cache.getAndCache<Uint8Array>(
      `ipfs-${cid}`,
      async (_e) => {
        if (!this.getFromIpfs) {
          throw new Error('404')
        }
        const response = await fetchWithRetry(`https://${cid}.ipfs.cf-ipfs.com/`)
        return Buffer.from(await response.arrayBuffer())
      },
      {
        staleAfterSeconds: undefined,
        returnStaleResultOnError: true,
        isBinary: true,
      },
    )
  }

  async putBlob(blob: Uint8Array, _contentType: string, _name?: string): Promise<{ cid: string }> {
    const cid = await this.getCID(blob)
    await this.cache.getAndCache<Uint8Array>(
      `ipfs-${cid}`,
      (_e) => {
        return Promise.resolve(blob)
      },
      {
        staleAfterSeconds: 0,
        returnStaleResultOnError: false,
      },
    )
    return { cid: cid.toString() }
  }

  async getCID<T>(data: T): Promise<string> {
    if (data instanceof Uint8Array) {
      return await generateCID(data)
    } else {
      const bytes = raw.encode(Buffer.from(JSON.stringify(data)))
      const hash = await sha256.digest(bytes)
      const cid = CID.create(1, raw.code, hash)
      return cid.toString()
    }
  }
}

type PinataUploadResponse = { IpfsHash: string }

type PinataMetadata = {
  name?: string
  [key: string]: string | undefined
}

export class PinataStorageWithCache implements IPFS {
  private cache: ObjectCache
  private token: string
  private pinataBaseUrl = 'https://api.pinata.cloud/pinning'

  // We've chosen to use the Pinata API directly rather than their JS SDK,
  // as it currently uses a really old version of axios, that has security vulnerabilities.

  constructor(pinataToken: string, cache: ObjectCache) {
    this.token = pinataToken
    this.cache = cache
  }

  async get<T>(cid: string): Promise<T> {
    return await this.cache.getAndCache<T>(
      `ipfs-${cid}`,
      async (_e) => {
        const response = await fetchWithRetry(`https://${cid}.ipfs.cf-ipfs.com/`)
        // eslint-disable-next-line no-console
        console.debug(`Cache miss for ${cid}, fetching from IPFS`)
        const json = await response.json()
        return json as T
      },
      {
        staleAfterSeconds: undefined,
        returnStaleResultOnError: true,
      },
    )
  }

  async put<T>(data: T, name?: string): Promise<{ cid: string }> {
    const response = await fetch(`${this.pinataBaseUrl}/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false,
        },
        ...(name ? { pinataMetadata: { name } } : undefined),
      }),
    })

    if (!response.ok) {
      const statusCode = response.status
      const errorResponse = await response.text()
      throw new Error(`${statusCode} ${errorResponse}`)
    }

    const { IpfsHash: cid } = (await response.json()) as PinataUploadResponse

    // Save time later if we need to retrieve it again
    await this.cache.put(`ipfs-${cid}`, data)
    return { cid }
  }

  async getBlob(cid: string): Promise<Uint8Array> {
    return await this.cache.getAndCache<Uint8Array>(
      `ipfs-${cid}`,
      async (_e) => {
        const response = await fetchWithRetry(`https://${cid}.ipfs.cf-ipfs.com/`)
        // eslint-disable-next-line no-console
        console.debug(`Cache miss for ${cid}, fetching from IPFS`)
        return Buffer.from(await response.arrayBuffer())
      },
      {
        staleAfterSeconds: undefined,
        returnStaleResultOnError: true,
        isBinary: true,
      },
    )
  }

  async putBlob(blob: Uint8Array, contentType: string, name?: string): Promise<{ cid: string }> {
    const formData = new FormData()
    formData.append('file', new Blob([blob], { type: contentType }), name ?? 'data')
    formData.append(
      'pinataOptions',
      JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false,
      }),
    )
    if (name) {
      formData.append('pinataMetadata', JSON.stringify({ name }))
    }

    const response = await fetch(`${this.pinataBaseUrl}/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const statusCode = response.status
      const errorResponse = await response.text()
      throw new Error(`${statusCode} ${errorResponse}`)
    }

    const { IpfsHash: cid } = (await response.json()) as PinataUploadResponse

    // Save time later if we need to retrieve it again
    await this.cache.put(`ipfs-${cid}`, blob)
    return { cid }
  }

  async getCID<T>(data: T): Promise<string> {
    if (data instanceof Uint8Array) {
      return await generateCID(data)
    } else {
      const bytes = raw.encode(Buffer.from(JSON.stringify(data)))
      const hash = await sha256.digest(bytes)
      const cid = CID.create(1, raw.code, hash)
      return cid.toString()
    }
  }

  async updateMetadata(cid: string, metadata: PinataMetadata): Promise<void> {
    const { name, ...keyvalues } = metadata
    const response = await fetch(`${this.pinataBaseUrl}/hashMetadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        ipfsPinHash: cid,
        ...(name ? { name } : undefined),
        ...(keyvalues && Object.keys(keyvalues).length > 0 ? { keyvalues } : undefined),
      }),
    })

    if (!response.ok) {
      const statusCode = response.status
      const errorResponse = await response.text()
      throw new Error(`${statusCode} ${errorResponse}`)
    }
  }
}

class NoOpCache implements ObjectCache {
  getAndCache<T>(cacheKey: string, generator: (existing: T | undefined) => Promise<T>, _options?: CacheOptions | undefined): Promise<T> {
    return generator(undefined)
  }
  async getAndCacheBinary(
    _cacheKey: string,
    generator: (existing: Uint8Array | undefined) => Promise<Uint8Array>,
    options?: BinaryCacheOptions | undefined,
  ): Promise<BinaryWithMetadata> {
    return {
      data: await generator(undefined),
      mimeType: options?.mimeType ?? 'application/octet-stream',
      fileExtension: null,
    }
  }
  put<T>(_cacheKey: string, _data: T, _mimeType?: string | undefined): Promise<void> {
    return Promise.resolve()
  }
  putBinary(_cacheKey: string, _data: Uint8Array, _mimeType?: string | undefined): Promise<void> {
    return Promise.resolve()
  }
}

export class PinataStorage extends PinataStorageWithCache {
  constructor(pinataToken: string) {
    super(pinataToken, new NoOpCache())
  }
}
