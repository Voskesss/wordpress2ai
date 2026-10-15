/**
 * Video schermvullend op de telefoon (wens Jos 15-10-2026: "alle video's op de
 * hele website"). Op een klein scherm is een video in de pagina te klein om
 * iets te zien. Moet binnen een tik worden aangeroepen. iPhone kent alleen
 * webkitEnterFullscreen op het video-element, de rest requestFullscreen.
 */
export function volschermOpTelefoon(v: HTMLVideoElement) {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  if (document.fullscreenElement) return;
  const vol = v as HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean };
  if (vol.webkitDisplayingFullscreen) return;
  if (vol.webkitEnterFullscreen) vol.webkitEnterFullscreen();
  else void v.requestFullscreen?.().catch(() => {});
}
