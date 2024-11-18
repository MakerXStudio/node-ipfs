import retry from 'async-retry'

async function retryer(url: string, fetchOptions?: RequestInit, retries: number = 3): Promise<Response> {
  const retryCodes = [403, 408, 500, 502, 503, 504, 522, 524]

  return await retry(
    async (bail) => {
      // if anything throws, it will retry if within the retry policy
      const response = await fetch(url, fetchOptions)
      if (response.ok) return response

      if (retryCodes.includes(response.status)) {
        throw new Error(`HTTP request: ${url} failed with HTTP response: ${response.statusText}.`)
      } else {
        bail(new Error(`HTTP request: ${url} failed with HTTP response: ${response.statusText}, will not retry`))
        throw new Error('Should never reach here')
      }
    },
    {
      retries: retries,
      onRetry: (e, num) => {
        // eslint-disable-next-line no-console
        console.debug(`HTTP request failed. Retrying for #${num} time: ${(e as Error).message}`)
      },
    },
  )
}

export async function fetchWithRetry(url: string, fetchOptions?: RequestInit, retries = 3): Promise<Response> {
  return await retryer(url, fetchOptions, retries)
}
