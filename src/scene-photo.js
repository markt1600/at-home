// Render and request the PNG in the same task: a paused WebGL canvas may have
// already discarded its drawing buffer. This avoids preserveDrawingBuffer and
// its ongoing rendering cost. DOM menus, blur and controls are never captured.
export function captureScenePhoto(world) {
  return new Promise((resolve, reject) => {
    if (world.contextLost || world.preparingRenderer) {
      reject(new Error('The view is not ready. Please try again in a moment.'));
      return;
    }
    world.resize();
    world.reflections.update();
    world.renderer.render(world.scene, world.camera);
    const {width, height} = world.canvas;
    world.canvas.toBlob(blob => {
      if (blob) resolve({blob, width, height});
      else reject(new Error('The photo could not be created. Please try again.'));
    }, 'image/png');
  });
}

export const scenePhotoHTML = () => `
  <p class="panel-intro">A clear view of the house, without menus or controls.</p>
  <img class="scene-photo-preview" alt="Photo of your current view of the house" hidden>
  <p class="fine" data-photo-status role="status">Preparing your photo…</p>
  <button data-photo="retry" hidden>Try again</button>
  <div class="stack">
    <button class="primary" data-photo="download" disabled>Download photo <span>↓</span></button>
    <button data-panel="settings">Back to pause menu</button>
  </div>`;

export function mountScenePhoto(root, world) {
  const preview = root.querySelector('.scene-photo-preview');
  const status = root.querySelector('[data-photo-status]');
  const download = root.querySelector('[data-photo="download"]');
  const retry = root.querySelector('[data-photo="retry"]');
  let disposed = false, pending = false, photo = null, url = null, filename;

  async function takePhoto() {
    if (pending || disposed || photo) return;
    pending = true;
    retry.hidden = true;
    status.textContent = 'Preparing your photo…';
    try {
      const result = await captureScenePhoto(world);
      if (disposed) return;
      photo = result.blob;
      filename = `at-home-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      url = URL.createObjectURL(photo);
      preview.src = url;
      preview.hidden = false;
      download.disabled = false;
      status.textContent = `${result.width} × ${result.height} · PNG photo`;
    } catch {
      if (disposed) return;
      status.textContent = 'The photo could not be created. Please try again in a moment.';
      retry.hidden = false;
    } finally {
      pending = false;
    }
  }

  function onClick(event) {
    const action = event.target.closest('button')?.dataset.photo;
    if (action === 'retry') takePhoto();
    if (action !== 'download' || !photo) return;
    // Give the download its own URL so closing the preview cannot interrupt it.
    const link = document.createElement('a'), downloadURL = URL.createObjectURL(photo);
    link.href = downloadURL;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadURL), 60_000);
  }

  root.addEventListener('click', onClick);
  root.querySelector('[data-panel="settings"]').focus({preventScroll: true});
  takePhoto();
  return () => {
    disposed = true;
    root.removeEventListener('click', onClick);
    if (url) URL.revokeObjectURL(url);
    photo = null;
    preview.removeAttribute('src');
  };
}
