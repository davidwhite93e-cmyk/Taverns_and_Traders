export class ScreenManager {
  constructor({ canvas, uiRoot, context }) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.context = context;
    this.current = null;

    canvas.addEventListener('click', (event) => {
      if (!this.current || typeof this.current.onCanvasClick !== 'function') return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.current.onCanvasClick(x, y);
    });
  }

  goTo(screen, params) {
    if (this.current && typeof this.current.unmount === 'function') {
      this.current.unmount();
    }
    this.uiRoot.innerHTML = '';
    this.current = screen;
    if (typeof screen.mount === 'function') {
      screen.mount({ uiRoot: this.uiRoot, screenManager: this, context: this.context, params });
    }
  }

  // Per-frame canvas hook, deliberately NOT named `render` — screens each have
  // their own DOM-rebuild method (by convention, `renderPanel`), and naming
  // this the same as that would make every such method fire ~60x/second.
  draw(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.current && typeof this.current.draw === 'function') {
      this.current.draw(ctx, canvas);
    }
  }
}
