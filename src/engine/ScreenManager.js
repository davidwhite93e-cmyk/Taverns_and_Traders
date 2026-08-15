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

  render(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.current && typeof this.current.render === 'function') {
      this.current.render(ctx, canvas);
    }
  }
}
