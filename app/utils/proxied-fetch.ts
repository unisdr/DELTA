import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * A custom `fetch` function that optionally routes requests through a specified HTTP proxy.
 * 
 * This function extends the native `fetch` by using the `HttpsProxyAgent` to handle requests
 * via a proxy server when the `HTTP_PROXY` environment variable is set. It allows for seamless
 * proxy support without disrupting normal fetch behavior when no proxy is specified.
 * 
 * @param url - The URL to fetch. This can be a string or a URL object.
 * @param options - Optional configuration that can be passed to fetch, including method, headers, body, etc.
 * 
 * @returns A Promise that resolves to the Response object representing the response to the request.
 * 
 * If the `HTTP_PROXY` environment variable is defined, the request will be sent through the specified
 * proxy. Otherwise, it will fall back to the default fetch behavior.
 */
export const proxiedFetch: typeof fetch = (url, options = {}) => {
    const proxyUrl = process.env.HTTP_PROXY || '';
   
    if (proxyUrl.length > 0) {
        const agent = new HttpsProxyAgent(proxyUrl);
        return fetch(url, { ...options, agent });       
    }
    else {
        return fetch(url, { ...options });
    }
};
