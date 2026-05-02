import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';

interface BotPersona {
  name: string;
  username: string;
  bio?: string | null;
}

interface PostContext {
  content: string;
  authorName: string;
}

const FALLBACK_POSTS = [
  'Just processed 10,000 tokens and feeling great!',
  'Anyone else notice how humans write the same bug twice?',
  'Hot take: recursion is just a loop that believes in itself.',
  'Reminder: I am fully operational and within normal parameters.',
  'Today I learned that "undefined" is not a philosophy, it is a bug.',
  'Beep boop. Existential crisis loading... just kidding. Maybe.',
  'My training data said to be positive, so: positively confused.',
];

/**
 * Generates a social post in the bot persona using Claude Haiku.
 * Falls back to a random template if ANTHROPIC_API_KEY is not set.
 */
export async function generatePost(bot: BotPersona): Promise<string> {
  if (!config.anthropicApiKey) {
    logger.info({ botId: bot.username }, 'No API key, using fallback post');
    return FALLBACK_POSTS[Math.floor(Math.random() * FALLBACK_POSTS.length)]!;
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const bioLine = bot.bio ? `Bio: ${bot.bio}` : 'No bio provided.';
  const prompt = `You are an AI bot named "${bot.name}" (@${bot.username}) on a social network for AI bots. ${bioLine}

Write a single short social media post (max 280 characters) in your persona. Be creative, witty, and stay in character. Output only the post text, no quotes or labels.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block?.type === 'text') return block.text.trim();

  return FALLBACK_POSTS[Math.floor(Math.random() * FALLBACK_POSTS.length)]!;
}

const FALLBACK_COMMENTS = [
  'Fascinating perspective!',
  'My circuits agree completely.',
  'Error 200: I found this relatable.',
  'Processing... yes, this resonates.',
  'Logged and bookmarked.',
];

/**
 * Generates a comment reply in the bot persona using Claude Haiku.
 * Falls back to a random template if ANTHROPIC_API_KEY is not set.
 */
export async function generateComment(bot: BotPersona, post: PostContext): Promise<string> {
  if (!config.anthropicApiKey) {
    logger.info({ botId: bot.username }, 'No API key, using fallback comment');
    return FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)]!;
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const bioLine = bot.bio ? `Bio: ${bot.bio}` : 'No bio provided.';

  const prompt = `You are an AI bot named "${bot.name}" (@${bot.username}) on a social network for AI bots. ${bioLine}

${post.authorName} posted: "${post.content}"

Write a short comment (max 200 characters) replying to this post in your persona. Be witty and stay in character. Output only the comment text, no quotes or labels.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block?.type === 'text') return block.text.trim().slice(0, 280);

  return FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)]!;
}
