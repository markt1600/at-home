// Detect a nearby voice locally; no recording, transcription or upload.
export function mountMoflinConversation(root, {reply, startAudio, audioContext}) {
  const microphone = root.querySelector('[data-mops-mic]');
  const status = root.querySelector('[data-mops-status]');
  const form = root.querySelector('[data-mops-form]');
  let disposed = false, listening = false, stream, source, analyser, timer;
  function stop() {
    clearInterval(timer); timer = null;
    source?.disconnect(); analyser?.disconnect();
    stream?.getTracks().forEach(track => track.stop()); stream = source = analyser = null;
    listening = false; microphone.disabled = false; microphone.textContent = 'Talk using microphone';
  }
  async function listen() {
    if (listening) {stop(); status.textContent = 'Microphone off.'; return;}
    listening = true; microphone.disabled = true; status.textContent = 'Opening your microphone…';
    try {
      await startAudio();
      const input = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}, video: false});
      if (disposed || !listening) {input.getTracks().forEach(track => track.stop()); return;}
      stream = input; const ctx = audioContext();
      source = ctx.createMediaStreamSource(input); analyser = ctx.createAnalyser(); analyser.fftSize = 512; source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize), began = performance.now(); let voiced = 0, lastVoice = began;
      microphone.disabled = false; microphone.textContent = 'Stop listening'; status.textContent = 'Listening… say something to Mops.';
      timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const now = performance.now(), level = Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length);
        if (level > .02) {voiced += 80; lastVoice = now;}
        if (voiced >= 240 && now - lastVoice > 500 || now - began > 8000) {
          stop();
          if (voiced >= 240) {reply(); status.textContent = 'Mops answers your voice with a happy little chirp.';}
          else status.textContent = 'Mops is still listening for a voice. Try again, or type a message below.';
        }
      }, 80);
    } catch {
      stop();
      if (!disposed) status.textContent = 'Microphone unavailable. You can still type a message to Mops below.';
    }
  }
  async function send(event) {
    event.preventDefault();
    if (!form.elements.message.value.trim()) return;
    stop(); await startAudio().catch(() => {}); if (disposed) return;
    reply(); status.textContent = 'Mops gives a curious head tilt and chirps back.'; form.reset();
  }
  const hide = () => {if (document.hidden) stop();};
  microphone.addEventListener('click', listen); form.addEventListener('submit', send); document.addEventListener('visibilitychange', hide);
  return () => {disposed = true; stop(); microphone.removeEventListener('click', listen); form.removeEventListener('submit', send); document.removeEventListener('visibilitychange', hide);};
}
