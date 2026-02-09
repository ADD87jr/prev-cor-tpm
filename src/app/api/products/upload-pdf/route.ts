import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

const ALLOWED_PDF_TYPES = ['application/pdf'];
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB pentru PDF-uri

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  // Validare tip MIME
  if (!file || !ALLOWED_PDF_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Doar fișiere PDF acceptate.' }, { status: 400 });
  }

  // Validare dimensiune
  if (file.size > MAX_PDF_SIZE) {
    return NextResponse.json({ 
      error: `Fișierul este prea mare. Maxim ${MAX_PDF_SIZE / 1024 / 1024}MB permis.` 
    }, { status: 400 });
  }

  // Validare extensie (double check)
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf') {
    return NextResponse.json({ error: 'Extensia fișierului trebuie să fie .pdf' }, { status: 400 });
  }

  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  
  // Upload to Vercel Blob
  const blob = await put(`uploads/${fileName}`, file, {
    access: 'public',
  });
  
  return NextResponse.json({ url: blob.url });
}
