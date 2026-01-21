import type { Agent } from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import got from "got";

import { NextRequest, NextResponse } from 'next/server';
import { object } from 'zod';
// The list of websites to test, as requested.
const SITES_TO_TEST = [
  "https://www.javbus.com",
  "https://javdb.com",
  "https://www.avfan.com",
  "https://onejav.com",
  "https://www.sehuatang.net"
];

// Define the expected structure of the response for each site
interface TestResult {
  site: string;
  success: boolean;
  status: number | null; // HTTP status code or null for network error
  error?: string;
}

// Create an extended RequestInit type for Node.js fetch
interface NodeRequestInit extends RequestInit {
  agent?: Agent;
}

/**
 * Tests connectivity to a single URL, potentially through a proxy.
 * @param targetUrl The URL of the website to test.
 * @param proxyUrl The full proxy URL (e.g., http://127.0.0.1:7890).
 * @returns A promise that resolves to a TestResult object.
 */
async function testSiteConnection(targetUrl: string, proxyUrl: string | undefined): Promise<TestResult> {
  let agent: Agent | undefined = undefined;

  agent = new HttpsProxyAgent(proxyUrl!);
  // 2. Prepare fetch options, including the agent and a timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout
  const options = {
    method: 'GET',
    signal: controller.signal,
    agent:{},
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  };
  // 1. If a proxy URL is provided, create the appropriate agent
  if (proxyUrl) {
    if (/^https?:\/\//.test(proxyUrl)) {
      options.agent = {
        https: new HttpsProxyAgent(proxyUrl),
        http: new HttpsProxyAgent(proxyUrl)
      };
    } else if (/^socks/.test(proxyUrl)) {
      options.agent = {
        https: new SocksProxyAgent(proxyUrl),
        http: new SocksProxyAgent(proxyUrl)
      };
    } else {
      // If the protocol is invalid, we can return an error immediately
      return {
        site: targetUrl,
        success: false,
        status: null,
        error: `Unsupported proxy protocol in URL: "${proxyUrl}"`,
      };
    }
  }
  // 3. Perform the fetch and handle the result
  try {
    const response = await got(targetUrl, options as any);

    clearTimeout(timeoutId);
    const isOk = response.ok;
    return {
      site: targetUrl,
      success: response.ok, // success is true for status codes 200-299
      status: response.statusCode,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      site: targetUrl,
      success: false,
      status: null,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message,
    };
  }
}

export async function POST(request: NextRequest) {
  const { proxyUrl } = await request.json();

  if (typeof proxyUrl !== 'string' && typeof proxyUrl !== 'undefined') {
    return NextResponse.json({ message: 'Invalid proxyUrl provided.' }, { status: 400 });
  }



  try {
    // Run all connection tests in parallel for better performance
    const results = await Promise.all(
      SITES_TO_TEST.map(site => testSiteConnection(site, proxyUrl))
    );
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Proxy test failed:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
