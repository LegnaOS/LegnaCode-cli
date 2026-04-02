/**
 * WebBrowserTool — navigate to URLs and capture page content.
 * Uses fetch-based approach for content extraction.
 * Gated by feature('WEB_BROWSER_TOOL').
 */
import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import { logForDebugging } from '../../utils/debug.js'

const WEB_BROWSER_TOOL_NAME = 'WebBrowser'

const inputSchema = z.object({
  action: z.enum(['navigate', 'screenshot', 'evaluate']).describe(
    'Action to perform: navigate to URL and get content, take screenshot, or evaluate JS',
  ),
  url: z.string().optional().describe('URL to navigate to (required for navigate)'),
  script: z.string().optional().describe('JavaScript to evaluate (for evaluate action)'),
})

export const WebBrowserTool = buildTool({
  name: WEB_BROWSER_TOOL_NAME,
  description: 'Browse web pages, capture content, and interact with websites',
  searchHint: 'web browser navigate screenshot',
  inputSchema,
  isReadOnly: () => true,
  prompt: () =>
    'Use this tool to browse web pages. The navigate action fetches a URL and returns the page text content. ' +
    'Use this when you need to read documentation, check a webpage, or fetch content from a URL the user provides.',
  userFacingName: () => 'Web Browser',
  renderToolUseMessage(input: z.infer<typeof inputSchema>) {
    if (input.action === 'navigate' && input.url) {
      return `Browsing: ${input.url}`
    }
    return `Web browser: ${input.action}`
  },
  renderToolResultMessage(result: unknown) {
    if (typeof result === 'string') return result
    const r = result as { type?: string; text?: string }
    return r?.text ?? JSON.stringify(result)
  },
  async call(input: z.infer<typeof inputSchema>) {
    if (input.action === 'navigate') {
      if (!input.url) {
        return { type: 'text' as const, text: 'Error: url is required for navigate action' }
      }
      try {
        const response = await fetch(input.url, {
          headers: { 'User-Agent': 'LegnaCode/1.0 (CLI Browser Tool)' },
          redirect: 'follow',
        })
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.includes('text') && !contentType.includes('json')) {
          return { type: 'text' as const, text: `Fetched ${input.url} (${response.status}) — binary content (${contentType}), cannot display` }
        }
        const text = await response.text()
        // Strip HTML tags for readability, keep text content
        const cleaned = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 50000) // Cap at 50k chars
        return { type: 'text' as const, text: `[${response.status}] ${input.url}\n\n${cleaned}` }
      } catch (e) {
        logForDebugging(`WebBrowser: fetch failed: ${e}`)
        return { type: 'text' as const, text: `Error fetching ${input.url}: ${e}` }
      }
    }

    if (input.action === 'screenshot') {
      return { type: 'text' as const, text: 'Screenshot requires Bun WebView (not available in this build). Use navigate instead.' }
    }

    if (input.action === 'evaluate') {
      return { type: 'text' as const, text: 'JavaScript evaluation requires Bun WebView (not available in this build). Use navigate instead.' }
    }

    return { type: 'text' as const, text: `Unknown action: ${input.action}` }
  },
})
