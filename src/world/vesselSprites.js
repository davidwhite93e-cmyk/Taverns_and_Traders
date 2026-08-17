/**
 * Procedural (canvas-drawn) vessel sprites. There's no image art pipeline in
 * this project, so per docs/DESIGN.md this stands in for hand-drawn sprite
 * sheets: simple geometric shapes with a clear, distinct silhouette per
 * vessel tier, animated via AnimatedSprite-driven frame/angle values rather
 * than swapped bitmap frames. Wheels rotate continuously via a canvas
 * transform (cheap, smooth, no per-frame art needed); legs step through a
 * small discrete cycle the same way a hand-drawn walk cycle would.
 */

const INK = '#2b1d10';
const WOOD = '#6b4a2f';
const WOOD_DARK = '#4a3520';
const CANVAS_TAN = '#d8c79a';
const IRON = '#6b6b6b';
const IRON_DARK = '#454545';
const GOLD = '#a8791f';
const HORSE_BODY = '#5a3d24';
const SKIN = '#c9a876';

const LEG_FRAME_SECONDS = 0.12;
const WHEEL_RADIANS_PER_SECOND = 3.4;

function wheel(ctx, cx, cy, radius, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = WOOD_DARK;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.stroke();
  }
  ctx.restore();
}

function walkingFigure(ctx, legFrame) {
  const offset = legFrame % 2 === 0 ? 3.5 : -3.5;
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.ellipse(0, -19, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0, -31, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -11);
  ctx.lineTo(-2 + offset, 0);
  ctx.moveTo(2, -11);
  ctx.lineTo(2 - offset, 0);
  ctx.stroke();
}

function horseBody(ctx, legFrame, { small = false } = {}) {
  const s = small ? 0.7 : 1;
  const frontOffset = legFrame % 2 === 0 ? 5 : -5;
  const backOffset = legFrame % 2 === 0 ? -5 : 5;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  // front legs
  ctx.beginPath();
  ctx.moveTo(10 * s, -14 * s);
  ctx.lineTo(10 * s + frontOffset * s, 0);
  ctx.moveTo(14 * s, -14 * s);
  ctx.lineTo(14 * s - frontOffset * s, 0);
  ctx.stroke();
  // back legs
  ctx.beginPath();
  ctx.moveTo(-10 * s, -14 * s);
  ctx.lineTo(-10 * s + backOffset * s, 0);
  ctx.moveTo(-14 * s, -14 * s);
  ctx.lineTo(-14 * s - backOffset * s, 0);
  ctx.stroke();

  // body
  ctx.fillStyle = HORSE_BODY;
  ctx.beginPath();
  ctx.ellipse(0, -20 * s, 20 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // neck + head
  ctx.beginPath();
  ctx.moveTo(16 * s, -24 * s);
  ctx.lineTo(28 * s, -34 * s);
  ctx.lineTo(24 * s, -22 * s);
  ctx.closePath();
  ctx.fill();

  // tail
  ctx.beginPath();
  ctx.moveTo(-20 * s, -22 * s);
  ctx.quadraticCurveTo(-28 * s, -12 * s, -24 * s, 2 * s);
  ctx.strokeStyle = HORSE_BODY;
  ctx.lineWidth = 3 * s;
  ctx.stroke();
}

function cartBody(ctx, { width, height, color = WOOD } = {}) {
  ctx.fillStyle = color;
  ctx.fillRect(-width / 2, -height - 6, width, height);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-width / 2, -height - 6, width, height);
}

function coveredTop(ctx, width, height) {
  ctx.fillStyle = CANVAS_TAN;
  ctx.beginPath();
  ctx.moveTo(-width / 2, -height - 6);
  ctx.quadraticCurveTo(0, -height - 24, width / 2, -height - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function armorPlates(ctx, width, height) {
  ctx.fillStyle = IRON;
  ctx.fillRect(-width / 2, -height - 6, width, height);
  ctx.strokeStyle = IRON_DARK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-width / 2, -height - 6, width, height);
  ctx.fillStyle = IRON_DARK;
  const plateCount = 4;
  for (let i = 0; i < plateCount; i++) {
    const px = -width / 2 + ((i + 0.5) * width) / plateCount;
    ctx.beginPath();
    ctx.arc(px, -height / 2 - 6, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

const DRAWERS = {
  worn_boots(ctx, { legFrame }) {
    walkingFigure(ctx, legFrame);
  },

  horse(ctx, { legFrame, wheelAngle }) {
    horseBody(ctx, legFrame);
    void wheelAngle;
  },

  hand_cart(ctx, { wheelAngle }) {
    walkingFigure(ctx, 0);
    ctx.save();
    ctx.translate(14, 0);
    cartBody(ctx, { width: 24, height: 16 });
    wheel(ctx, -6, 2, 7, wheelAngle);
    wheel(ctx, 6, 2, 7, wheelAngle);
    ctx.restore();
  },

  horse_cart(ctx, { legFrame, wheelAngle }) {
    ctx.save();
    ctx.translate(-14, 0);
    horseBody(ctx, legFrame, { small: true });
    ctx.restore();
    ctx.save();
    ctx.translate(18, 0);
    cartBody(ctx, { width: 30, height: 20 });
    wheel(ctx, -8, 3, 9, wheelAngle);
    wheel(ctx, 8, 3, 9, wheelAngle);
    ctx.restore();
  },

  covered_wagon(ctx, { legFrame, wheelAngle }) {
    ctx.save();
    ctx.translate(-18, 0);
    horseBody(ctx, legFrame, { small: true });
    ctx.restore();
    ctx.save();
    ctx.translate(20, 0);
    cartBody(ctx, { width: 42, height: 22 });
    coveredTop(ctx, 42, 22);
    wheel(ctx, -13, 4, 10, wheelAngle);
    wheel(ctx, 13, 4, 10, wheelAngle);
    ctx.restore();
  },

  armored_wagon(ctx, { legFrame, wheelAngle }) {
    ctx.save();
    ctx.translate(-20, 0);
    horseBody(ctx, legFrame, { small: true });
    ctx.restore();
    ctx.save();
    ctx.translate(22, 0);
    armorPlates(ctx, 46, 24);
    wheel(ctx, -14, 4, 10, wheelAngle);
    wheel(ctx, 14, 4, 10, wheelAngle);
    ctx.restore();
  },

  land_ship(ctx, { wheelAngle }) {
    ctx.save();
    ctx.translate(0, 0);
    // hull
    ctx.fillStyle = WOOD;
    ctx.beginPath();
    ctx.moveTo(-38, -6);
    ctx.lineTo(-32, -26);
    ctx.lineTo(32, -26);
    ctx.lineTo(38, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // gold trim
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, -26);
    ctx.lineTo(32, -26);
    ctx.stroke();
    // mast + sail
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -58);
    ctx.stroke();
    ctx.fillStyle = CANVAS_TAN;
    ctx.beginPath();
    ctx.moveTo(0, -56);
    ctx.lineTo(22, -40);
    ctx.lineTo(0, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    // wheels
    wheel(ctx, -22, -2, 12, wheelAngle);
    wheel(ctx, 22, -2, 12, wheelAngle);
    ctx.restore();
  },
};

export function drawVessel(ctx, vesselId, x, y, { animTimeSec = 0, facingLeft = false, scale = 1 } = {}) {
  const draw = DRAWERS[vesselId] || DRAWERS.worn_boots;
  const legFrame = Math.floor(animTimeSec / LEG_FRAME_SECONDS) % 4;
  const wheelAngle = animTimeSec * WHEEL_RADIANS_PER_SECOND;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingLeft ? -scale : scale, scale);
  draw(ctx, { legFrame, wheelAngle });
  ctx.restore();
}
