/**
 * LegnaCode Office — Status Bubble
 *
 * Enhanced status bubble rendered above agent characters on the canvas.
 * Shows current tool name, short status text, and supports i18n.
 */

import type { I18nStrings } from '../i18n/index.js';

const STATE_MAP: Record<string, keyof I18nStrings['office']> = {
  idle: 'idle',
  writing: 'writing',
  researching: 'researching',
  executing: 'executing',
  syncing: 'syncing',
  error: 'error',
  thinking: 'thinking',
};

export interface StatusBubbleData {
  state: string;
  toolName?: string;
  detail?: string;
}

/**
 * Draw a status bubble above a character on the canvas.
 * Called from the game loop's render phase.
 */
export function drawStatusBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  data: StatusBubbleData,
  t: I18nStrings,
): void {
  const stateKey = STATE_MAP[data.state];
  const label = stateKey ? t.office[stateKey] : data.state;
  const text = data.toolName ? `${label} · ${data.toolName}` : label;

  ctx.save();
  ctx.font = '10px monospace';
  const metrics = ctx.measureText(text);
  const pw = metrics.width + 12;
  const ph = 18;
  const bx = x - pw / 2;
  const by = y - ph - 4;

  // Bubble background
  const isError = data.state === 'error';
  ctx.fillStyle = isError ? 'rgba(239,68,68,0.85)' : 'rgba(15,23,42,0.85)';
  ctx.beginPath();
  roundRect(ctx, bx, by, pw, ph, 4);
  ctx.fill();

  // Border
  ctx.strokeStyle = isError ? 'rgba(239,68,68,0.5)' : 'rgba(51,65,85,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, bx, by, pw, ph, 4);
  ctx.stroke();

  // Triangle pointer
  ctx.fillStyle = isError ? 'rgba(239,68,68,0.85)' : 'rgba(15,23,42,0.85)';
  ctx.beginPath();
  ctx.moveTo(x - 4, by + ph);
  ctx.lineTo(x + 4, by + ph);
  ctx.lineTo(x, by + ph + 5);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = isError ? '#fff' : '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, by + ph / 2);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}
