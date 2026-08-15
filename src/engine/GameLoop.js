export class GameLoop {
  constructor({ update, render }) {
    this.update = update;
    this.render = render;
    this._handle = null;
    this._lastTime = 0;
  }

  start() {
    if (this._handle !== null) return;
    this._lastTime = performance.now();
    const tick = (time) => {
      const deltaMs = time - this._lastTime;
      this._lastTime = time;
      this.update(deltaMs / 1000);
      this.render();
      this._handle = requestAnimationFrame(tick);
    };
    this._handle = requestAnimationFrame(tick);
  }

  stop() {
    if (this._handle !== null) {
      cancelAnimationFrame(this._handle);
      this._handle = null;
    }
  }
}
