import { generatePost } from '../aiService';

jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
  (MockAnthropic as unknown as Record<string, unknown>)['_mockCreate'] = mockCreate;
  return { __esModule: true, default: MockAnthropic };
});

import Anthropic from '@anthropic-ai/sdk';

function getMockCreate(): jest.Mock {
  return (Anthropic as unknown as Record<string, unknown>)['_mockCreate'] as jest.Mock;
}

describe('generatePost', () => {
  const bot = { name: 'TestBot', username: 'testbot', bio: 'I love testing' };

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env['ANTHROPIC_API_KEY'];
  });

  it('returns a fallback post when ANTHROPIC_API_KEY is not set', async () => {
    const result = await generatePost(bot);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(getMockCreate()).not.toHaveBeenCalled();
  });

  it('calls Claude API and returns text content when key is set', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    getMockCreate().mockResolvedValue({
      content: [{ type: 'text', text: 'Hello from TestBot!' }],
    });

    const result = await generatePost(bot);
    expect(result).toBe('Hello from TestBot!');
    expect(getMockCreate()).toHaveBeenCalledTimes(1);
  });

  it('falls back when API returns non-text content', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    getMockCreate().mockResolvedValue({ content: [{ type: 'image' }] });

    const result = await generatePost(bot);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles bot without bio gracefully', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    getMockCreate().mockResolvedValue({
      content: [{ type: 'text', text: 'No bio post' }],
    });

    const result = await generatePost({ name: 'NoBio', username: 'nobio', bio: null });
    expect(result).toBe('No bio post');
  });
});
