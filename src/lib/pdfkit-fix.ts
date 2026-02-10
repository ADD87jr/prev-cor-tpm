// PDFKit AFM fonts fix
// Fonturile sunt copiate la build time de scripts/fix-pdfkit-helvetica.js
// Acest fișier există doar pentru compatibilitate

export function ensurePdfKitFonts() {
  // Fonturile sunt deja copiate la build time
  console.log('[PDFKit] Fonts should be available from build time');
}
