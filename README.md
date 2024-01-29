# Node IPFS (node-ipfs)

> A NodeJS package that makes interacting with IPFS easier

[![Build Status][build-img]][build-url]
[![Issues][issues-img]][issues-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

## Install

```bash
npm install @makerx/node-ipfs @makerx/node-cache
```

> [!NOTE]
> This package is only compatible with Node 18 and above, as it uses the native node fetch.

## Usage

The primary purpose of this package is to make reading and writing files on the IPFS network easier. Unfortunately IPFS can be slow, so to mitigate this some cache implementations have also been supplied.

```typescript
import { S3 } from '@aws-sdk/client-s3'
import { PinataStorageWithCache } from '@makerx/node-ipfs'
import { S3ObjectCache } from '@makerx/node-cache'

const s3Cache = new S3ObjectCache(
  new S3({
    region: process.env.AWS_REGION,
  }),
  'CACHE_BUCKET_NAME',
  'cache/ipfs/',
)

const ipfs = new PinataStorageWithCache('PINATA_STORAGE_API_JWT', s3Cache)

// Put blob to IPFS
const myImage = new Uint8Array([104, 101, 108, 108, 111])
const { cid } = await ipfs.putBlob(myImage, 'image/png', 'my_file.png')

// Put json to IPFS
const { cid } = await ipfs.put({ hello: 'world' }, 'my_file.json')

// Get blob by cid from cache with pass through to IPFS
const myImage = await ipfs.getBlob('cid')

// Get json by cid from cache with pass through to IPFS
const json = await ipfs.get('cid')

// Get cid of blob
const myImage = new Uint8Array([104, 101, 108, 108, 111])
const cid = await ipfs.getCID(myImage)

// Get cid of json
const cid = await ipfs.getCID({ hello: 'world' })
```

## Why Pinata?

We use [Pinata](https://www.pinata.cloud/) to upload and pin files on the IPFS network. We previously used [web3.storage](https://web3.storage/), however they decided to [implement a more complex upload API and sunset their old API](https://blog.web3.storage/posts/the-data-layer-is-here-with-the-new-web3-storage), which makes integration a lot more complex.

In order to use this library you'll need to [signup for a free account on Pinata](https://app.pinata.cloud/register) and generate a JWT to access the API.

---

[build-img]: https://github.com/MakerXStudio/node-ipfs/actions/workflows/release.yaml/badge.svg
[build-url]: https://github.com/MakerXStudio/node-ipfs/actions/workflows/release.yaml
[issues-img]: https://img.shields.io/github/issues/MakerXStudio/node-ipfs
[issues-url]: https://github.com/MakerXStudio/node-ipfs/issues
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
