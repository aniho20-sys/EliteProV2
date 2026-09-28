// Hand a generated PDF to the person: the native Share sheet where the browser can share
// files (iOS incl. home-screen installs, most Android), a plain download everywhere else.
// iOS Safari has no JS-callable print, so this — not window.print() — is how a PDF leaves
// the app on a phone (CLAUDE.md #30).
//
// Resolves when the sheet closes or the download starts. The person cancelling the sheet
// is not an error; anything else is thrown for the caller to report.
export async function sharePdf(bytes, filename) {
  const file = new File([bytes], filename, { type: 'application/pdf' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
    } catch (err) {
      if (err?.name !== 'AbortError') throw err;
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
