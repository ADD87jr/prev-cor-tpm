import fs from 'fs';
import path from 'path';

// Această funcție trebuie apelată ÎNAINTE de a importa PDFDocument
export function ensurePdfKitFonts() {
  const dataDir = path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data');
  const sourceDir = path.join(process.cwd(), 'public', 'fonts', 'afm');
  
  // Lista de fonturi necesare
  const requiredFonts = [
    'Helvetica.afm',
    'Helvetica-Bold.afm', 
    'Helvetica-Oblique.afm',
    'Helvetica-BoldOblique.afm',
    'Times-Roman.afm',
    'Times-Bold.afm',
    'Times-Italic.afm',
    'Times-BoldItalic.afm',
    'Courier.afm',
    'Courier-Bold.afm',
    'Courier-Oblique.afm',
    'Courier-BoldOblique.afm',
    'Symbol.afm',
    'ZapfDingbats.afm'
  ];

  // Conținut AFM minimal valid
  const minimalAfm = `StartFontMetrics 4.1
FontName Helvetica
FullName Helvetica
FamilyName Helvetica
Weight Medium
ItalicAngle 0
IsFixedPitch false
CharacterSet ExtendedRoman
FontBBox -166 -225 1000 931
UnderlinePosition -100
UnderlineThickness 50
Version 002.000
EncodingScheme AdobeStandardEncoding
CapHeight 718
XHeight 523
Ascender 718
Descender -207
StdHW 76
StdVW 88
StartCharMetrics 315
C 32 ; WX 278 ; N space ; B 0 0 0 0 ;
C 33 ; WX 278 ; N exclam ; B 90 0 187 718 ;
C 34 ; WX 355 ; N quotedbl ; B 70 463 285 718 ;
C 35 ; WX 556 ; N numbersign ; B 28 0 529 688 ;
C 36 ; WX 556 ; N dollar ; B 32 -115 520 775 ;
C 37 ; WX 889 ; N percent ; B 39 -19 850 703 ;
C 38 ; WX 667 ; N ampersand ; B 44 -15 645 718 ;
C 39 ; WX 191 ; N quotesingle ; B 59 463 132 718 ;
C 40 ; WX 333 ; N parenleft ; B 68 -207 299 733 ;
C 41 ; WX 333 ; N parenright ; B 34 -207 265 733 ;
C 42 ; WX 389 ; N asterisk ; B 39 431 349 718 ;
C 43 ; WX 584 ; N plus ; B 39 0 545 505 ;
C 44 ; WX 278 ; N comma ; B 87 -147 191 106 ;
C 45 ; WX 333 ; N hyphen ; B 44 232 289 322 ;
C 46 ; WX 278 ; N period ; B 87 0 191 106 ;
C 47 ; WX 278 ; N slash ; B -17 -19 295 737 ;
C 48 ; WX 556 ; N zero ; B 37 -19 519 703 ;
C 49 ; WX 556 ; N one ; B 101 0 359 703 ;
C 50 ; WX 556 ; N two ; B 26 0 507 703 ;
C 51 ; WX 556 ; N three ; B 34 -19 522 703 ;
C 52 ; WX 556 ; N four ; B 25 0 523 703 ;
C 53 ; WX 556 ; N five ; B 32 -19 514 688 ;
C 54 ; WX 556 ; N six ; B 38 -19 518 703 ;
C 55 ; WX 556 ; N seven ; B 37 0 523 688 ;
C 56 ; WX 556 ; N eight ; B 38 -19 517 703 ;
C 57 ; WX 556 ; N nine ; B 42 -19 514 703 ;
C 58 ; WX 278 ; N colon ; B 87 0 191 516 ;
C 59 ; WX 278 ; N semicolon ; B 87 -147 191 516 ;
C 60 ; WX 584 ; N less ; B 48 11 536 495 ;
C 61 ; WX 584 ; N equal ; B 39 115 545 390 ;
C 62 ; WX 584 ; N greater ; B 48 11 536 495 ;
C 63 ; WX 556 ; N question ; B 56 0 492 727 ;
C 64 ; WX 1015 ; N at ; B 147 -19 868 737 ;
C 65 ; WX 667 ; N A ; B 14 0 654 718 ;
C 66 ; WX 667 ; N B ; B 74 0 627 718 ;
C 67 ; WX 722 ; N C ; B 44 -19 681 737 ;
C 68 ; WX 722 ; N D ; B 81 0 674 718 ;
C 69 ; WX 667 ; N E ; B 86 0 616 718 ;
C 70 ; WX 611 ; N F ; B 86 0 583 718 ;
C 71 ; WX 778 ; N G ; B 48 -19 704 737 ;
C 72 ; WX 722 ; N H ; B 77 0 646 718 ;
C 73 ; WX 278 ; N I ; B 91 0 188 718 ;
C 74 ; WX 500 ; N J ; B 17 -19 428 718 ;
C 75 ; WX 667 ; N K ; B 76 0 663 718 ;
C 76 ; WX 556 ; N L ; B 76 0 537 718 ;
C 77 ; WX 833 ; N M ; B 73 0 761 718 ;
C 78 ; WX 722 ; N N ; B 76 0 646 718 ;
C 79 ; WX 778 ; N O ; B 39 -19 739 737 ;
C 80 ; WX 667 ; N P ; B 86 0 622 718 ;
C 81 ; WX 778 ; N Q ; B 39 -56 739 737 ;
C 82 ; WX 722 ; N R ; B 88 0 684 718 ;
C 83 ; WX 667 ; N S ; B 49 -19 620 737 ;
C 84 ; WX 611 ; N T ; B 14 0 597 718 ;
C 85 ; WX 722 ; N U ; B 79 -19 644 718 ;
C 86 ; WX 667 ; N V ; B 20 0 647 718 ;
C 87 ; WX 944 ; N W ; B 16 0 928 718 ;
C 88 ; WX 667 ; N X ; B 19 0 648 718 ;
C 89 ; WX 667 ; N Y ; B 14 0 653 718 ;
C 90 ; WX 611 ; N Z ; B 23 0 588 718 ;
C 91 ; WX 278 ; N bracketleft ; B 63 -196 250 722 ;
C 92 ; WX 278 ; N backslash ; B -17 -19 295 737 ;
C 93 ; WX 278 ; N bracketright ; B 28 -196 215 722 ;
C 94 ; WX 469 ; N asciicircum ; B -14 264 483 688 ;
C 95 ; WX 556 ; N underscore ; B 0 -125 556 -75 ;
C 96 ; WX 333 ; N grave ; B 14 593 211 734 ;
C 97 ; WX 556 ; N a ; B 36 -15 530 538 ;
C 98 ; WX 556 ; N b ; B 58 -15 517 718 ;
C 99 ; WX 500 ; N c ; B 30 -15 477 538 ;
C 100 ; WX 556 ; N d ; B 35 -15 499 718 ;
C 101 ; WX 556 ; N e ; B 40 -15 516 538 ;
C 102 ; WX 278 ; N f ; B 14 0 262 728 ;
C 103 ; WX 556 ; N g ; B 40 -220 499 538 ;
C 104 ; WX 556 ; N h ; B 65 0 491 718 ;
C 105 ; WX 222 ; N i ; B 67 0 155 718 ;
C 106 ; WX 222 ; N j ; B -16 -210 155 718 ;
C 107 ; WX 500 ; N k ; B 67 0 501 718 ;
C 108 ; WX 222 ; N l ; B 67 0 155 718 ;
C 109 ; WX 833 ; N m ; B 65 0 769 538 ;
C 110 ; WX 556 ; N n ; B 65 0 491 538 ;
C 111 ; WX 556 ; N o ; B 35 -14 521 538 ;
C 112 ; WX 556 ; N p ; B 58 -207 517 538 ;
C 113 ; WX 556 ; N q ; B 35 -207 494 538 ;
C 114 ; WX 333 ; N r ; B 77 0 332 538 ;
C 115 ; WX 500 ; N s ; B 32 -15 464 538 ;
C 116 ; WX 278 ; N t ; B 14 -7 257 669 ;
C 117 ; WX 556 ; N u ; B 68 -15 489 523 ;
C 118 ; WX 500 ; N v ; B 8 0 492 523 ;
C 119 ; WX 722 ; N w ; B 14 0 709 523 ;
C 120 ; WX 500 ; N x ; B 11 0 490 523 ;
C 121 ; WX 500 ; N y ; B 11 -214 489 523 ;
C 122 ; WX 500 ; N z ; B 31 0 469 523 ;
C 123 ; WX 334 ; N braceleft ; B 42 -196 292 722 ;
C 124 ; WX 260 ; N bar ; B 94 -225 167 775 ;
C 125 ; WX 334 ; N braceright ; B 42 -196 292 722 ;
C 126 ; WX 584 ; N asciitilde ; B 61 180 523 326 ;
EndCharMetrics
EndFontMetrics`;

  try {
    // Creează directorul dacă nu există
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Creează fișierele AFM lipsă
    for (const fontFile of requiredFonts) {
      const fontPath = path.join(dataDir, fontFile);
      if (!fs.existsSync(fontPath)) {
        fs.writeFileSync(fontPath, minimalAfm);
        console.log(`[PDFKit Fix] Created missing font: ${fontFile}`);
      }
    }
  } catch (err) {
    console.error('[PDFKit Fix] Error ensuring fonts:', err);
  }
}

// Apelează automat la import
ensurePdfKitFonts();
