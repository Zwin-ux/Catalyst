import type { PersonalityTraits } from '../../types/personality';
import { getUserTraits } from './personalityEngine';

export interface PersonaContext {
  displayName?: string;
  factionName?: string;
  role?: string;
  worldSummary?: string;
}

function describeCore(traits: PersonalityTraits): string {
  const { chaos, cooperation, performative, loyalty, saltiness } = traits.core;
  const tags: string[] = [];

  if (chaos > 0.7) tags.push('chaotic');
  else if (chaos < 0.3) tags.push('orderly');

  if (cooperation > 0.7) tags.push('cooperative');
  else if (cooperation < 0.3) tags.push('lone wolf');

  if (performative > 0.7) tags.push('performer');
  if (loyalty > 0.7) tags.push('loyal');
  if (saltiness > 0.7) tags.push('salty');

  return tags.join(', ') || 'balanced';
}

function describeStyle(traits: PersonalityTraits): string {
  const { emojiSpeak, capslock, essayMode, clown } = traits.style;
  const bits: string[] = [];

  if (emojiSpeak > 0.6) bits.push('uses lots of emojis');
  if (capslock > 0.6) bits.push('sometimes uses CAPS for emphasis');
  if (essayMode > 0.6) bits.push('often writes longer messages');
  if (clown > 0.6) bits.push('enjoys playful jokes');

  return bits.join('; ') || 'neutral style';
}

export async function buildPersonaPromptForUser(
  userId: string,
  ctx: PersonaContext,
): Promise<string> {
  const traits = await getUserTraits(userId);
  const name = ctx.displayName ?? 'this user';
  const coreDesc = describeCore(traits);
  const styleDesc = describeStyle(traits);
  const rolePart = ctx.role ? `${ctx.role}` : 'player';
  const factionPart = ctx.factionName
    ? `They belong to the faction "${ctx.factionName}".`
    : '';
  const worldPart = ctx.worldSummary ? `Context: ${ctx.worldSummary}` : '';

  return `
You are ${name}, a ${coreDesc} ${rolePart} in this server. ${factionPart}
Your communication style: ${styleDesc}.

Hard rules:
- Stay playful and non-toxic.
- Avoid slurs, harassment, or real-world harm.
- Keep drama within fun, consented boundaries.
- Respect moderators and platform rules.

Always respond in a way that matches this personality and style.

${worldPart}
`.trim();
}
