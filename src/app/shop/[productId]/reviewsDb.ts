// Bază de date persistentă pentru recenzii produse (salvată în baza de date Turso)
import { prisma } from '@/lib/prisma';

export type Review = {
  id: number;
  productId: number;
  user: string;
  rating: number;
  text: string;
  textEn?: string; // traducere în engleză
  date: string;
  approved: boolean; // Pentru moderare
};

const REVIEWS_KEY = 'reviews_data';

async function loadReviews(): Promise<Review[]> {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: REVIEWS_KEY } });
    if (setting?.value) {
      return JSON.parse(setting.value);
    }
  } catch (err) {
    console.error('Eroare la încărcare recenzii:', err);
  }
  return [];
}

async function saveReviews(reviews: Review[]) {
  await prisma.siteSettings.upsert({
    where: { key: REVIEWS_KEY },
    update: { value: JSON.stringify(reviews), updatedAt: new Date() },
    create: { key: REVIEWS_KEY, value: JSON.stringify(reviews) }
  });
}

export async function addReview(review: Omit<Review, 'id' | 'date' | 'approved'>) {
  const reviews = await loadReviews();
  const newReview: Review = { 
    ...review, 
    id: Date.now(),
    date: new Date().toLocaleDateString('ro-RO'),
    approved: true // Auto-aprobat (poți schimba la false pentru moderare)
  };
  reviews.push(newReview);
  await saveReviews(reviews);
  return newReview;
}

export async function getReviews(productId: number) {
  const reviews = await loadReviews();
  return reviews.filter(r => r.productId === productId && r.approved);
}

export async function getAllReviews() {
  return loadReviews();
}

export async function deleteReview(id: number) {
  const reviews = await loadReviews();
  const filtered = reviews.filter(r => r.id !== id);
  await saveReviews(filtered);
  return filtered;
}

export async function toggleApproval(id: number) {
  const reviews = await loadReviews();
  const review = reviews.find(r => r.id === id);
  if (review) {
    review.approved = !review.approved;
    await saveReviews(reviews);
  }
  return reviews;
}
