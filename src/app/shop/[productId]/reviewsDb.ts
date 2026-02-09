// Bază de date persistentă pentru recenzii produse (salvată în fișier JSON)
import fs from 'fs';
import path from 'path';

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

const REVIEWS_FILE = path.join(process.cwd(), 'data', 'reviews.json');

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadReviews(): Review[] {
  ensureDataDir();
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const data = fs.readFileSync(REVIEWS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Eroare la încărcare recenzii:', err);
  }
  return [];
}

function saveReviews(reviews: Review[]) {
  ensureDataDir();
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8');
}

export function addReview(review: Omit<Review, 'id' | 'date' | 'approved'>) {
  const reviews = loadReviews();
  const newReview: Review = { 
    ...review, 
    id: Date.now(),
    date: new Date().toLocaleDateString('ro-RO'),
    approved: true // Auto-aprobat (poți schimba la false pentru moderare)
  };
  reviews.push(newReview);
  saveReviews(reviews);
  return newReview;
}

export function getReviews(productId: number) {
  const reviews = loadReviews();
  return reviews.filter(r => r.productId === productId && r.approved);
}

export function getAllReviews() {
  return loadReviews();
}

export function deleteReview(id: number) {
  const reviews = loadReviews();
  const filtered = reviews.filter(r => r.id !== id);
  saveReviews(filtered);
  return filtered;
}

export function toggleApproval(id: number) {
  const reviews = loadReviews();
  const review = reviews.find(r => r.id === id);
  if (review) {
    review.approved = !review.approved;
    saveReviews(reviews);
  }
  return reviews;
}
