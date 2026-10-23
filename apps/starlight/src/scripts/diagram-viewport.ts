/** Shared viewport for SVG images and live Mermaid drawings. */
export function bindDiagramViewport({ dialog, openButton, drawing, beforeOpen, afterClose }: {
  dialog: HTMLDialogElement; openButton: HTMLButtonElement; drawing: HTMLImageElement | SVGSVGElement;
  beforeOpen?: () => void; afterClose?: () => void;
}) {
  const canvas = dialog.querySelector<HTMLElement>('.pos-diagram__canvas')!;
  const slider = dialog.querySelector<HTMLInputElement>('[data-diagram-scale]')!;
  const output = dialog.querySelector<HTMLOutputElement>('[data-diagram-scale-label]')!;
  const fitButton = dialog.querySelector<HTMLButtonElement>('[data-diagram-fit]')!;
  const actualButton = dialog.querySelector<HTMLButtonElement>('[data-diagram-actual]')!;
  const controller = new AbortController();
  const { signal } = controller;
  let scale = 1;
  let fitted = true;
  let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
  function dimensions() {
    if (drawing instanceof HTMLImageElement) return { width: drawing.naturalWidth || drawing.width, height: drawing.naturalHeight || drawing.height };
    const box = drawing.viewBox.baseVal;
    return { width: box.width || drawing.width.baseVal.value, height: box.height || drawing.height.baseVal.value };
  }
  function setScale(next: number, fit = false) {
    const size = dimensions();
    if (!size.width || !size.height) return;
    const centerX = (canvas.scrollLeft + canvas.clientWidth / 2) / scale;
    const centerY = (canvas.scrollTop + canvas.clientHeight / 2) / scale;
    fitted = fit;
    scale = Math.max(.01, Math.min(2, next));
    canvas.style.setProperty('--diagram-image-width', `${size.width}px`);
    canvas.style.setProperty('--diagram-scale', String(scale));
    slider.value = String(Math.round(scale * 100));
    output.value = `${Math.round(scale * 100)} %`;
    fitButton.setAttribute('aria-pressed', String(fitted));
    actualButton.setAttribute('aria-pressed', String(!fitted && scale === 1));
    canvas.scrollTo({ left: fit ? 0 : centerX * scale - canvas.clientWidth / 2, top: fit ? 0 : centerY * scale - canvas.clientHeight / 2, behavior: 'instant' });
  }
  function fit() {
    const { width, height } = dimensions();
    const padding = getComputedStyle(canvas);
    const usableWidth = canvas.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
    const usableHeight = canvas.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
    if (width && height) setScale(Math.min(1, usableWidth / width, usableHeight / height), true);
  }
  openButton.addEventListener('click', () => { beforeOpen?.(); dialog.showModal(); fit(); }, { signal });
  dialog.querySelector('[data-diagram-close]')!.addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener('close', () => { drag = undefined; canvas.classList.remove('is-panning'); afterClose?.(); openButton.focus({ preventScroll: true }); }, { signal });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  }, { signal });
  slider.addEventListener('input', () => setScale(Number(slider.value) / 100), { signal });
  fitButton.addEventListener('click', fit, { signal });
  actualButton.addEventListener('click', () => setScale(1), { signal });
  canvas.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['+', '=', '-', '0', '1'].includes(event.key)) {
      event.preventDefault();
      if (event.key === '0') fit();
      else setScale(event.key === '1' ? 1 : scale * (event.key === '-' ? 1 / 1.2 : 1.2));
    }
  }, { signal });
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: canvas.scrollLeft, top: canvas.scrollTop };
    canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-panning'); canvas.focus({ preventScroll: true }); event.preventDefault();
  }, { signal });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    canvas.scrollLeft = drag.left + drag.x - event.clientX; canvas.scrollTop = drag.top + drag.y - event.clientY;
  }, { signal });
  const endDrag = () => { drag = undefined; canvas.classList.remove('is-panning'); };
  for (const event of ['lostpointercapture', 'pointerup', 'pointercancel']) canvas.addEventListener(event, endDrag, { signal });
  drawing.addEventListener('dragstart', event => event.preventDefault(), { signal });
  drawing.addEventListener('load', () => { if (dialog.open && fitted) fit(); }, { signal });
  const observer = new ResizeObserver(() => { if (dialog.open && fitted) fit(); });
  observer.observe(canvas);
  return () => { controller.abort(); observer.disconnect(); };
}
