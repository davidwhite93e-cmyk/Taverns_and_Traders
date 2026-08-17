/**
 * Frame-timing driver for procedural sprite animation. There are no image
 * sprite sheets in this project (see docs/DESIGN.md's art-style note) — this
 * drives a `currentFrame` index that procedural canvas-drawing code (e.g.
 * src/world/vesselSprites.js) uses to pick a pose/wheel-angle, standing in
 * for what would otherwise be a sprite-sheet frame lookup.
 */
export class AnimatedSprite {
  constructor({ frameCount, frameDuration, loop = true }) {
    this.frameCount = frameCount;
    this.frameDuration = frameDuration; // seconds per frame
    this.loop = loop;
    this.elapsed = 0;
    this.currentFrame = 0;
    this.finished = false;
  }

  update(dt) {
    if (this.finished) return;
    this.elapsed += dt;
    const totalFrames = Math.floor(this.elapsed / this.frameDuration);
    if (this.loop) {
      this.currentFrame = totalFrames % this.frameCount;
    } else {
      this.currentFrame = Math.min(totalFrames, this.frameCount - 1);
      if (totalFrames >= this.frameCount - 1) this.finished = true;
    }
  }

  reset() {
    this.elapsed = 0;
    this.currentFrame = 0;
    this.finished = false;
  }
}
