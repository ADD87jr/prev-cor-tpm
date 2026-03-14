// Script to fix prisma imports in admin API routes
const fs = require('fs');
const path = require('path');

const files = [
  'abandoned-carts/route.ts',
  'ai-competitor-monitor/route.ts',
  'ai-competitor-analysis/route.ts',
  'ai-bundle-builder/route.ts',
  'ai-classify/route.ts',
  'ai-blog-generator/route.ts',
  'ai-churn-predictor/route.ts',
  'ai-audit-catalog/route.ts',
  'ai-chatbot/route.ts',
  'ai-anomaly-detection/route.ts',
  'ai-alternatives/route.ts',
  'ai-cart-abandonment/route.ts',
  'ai-delivery-optimizer/route.ts',
  'ai-crosssell/route.ts',
  'ai-demand-forecast/route.ts',
  'ai-contract-generator/route.ts',
  'ai-dynamic-pricing/route.ts',
  'ai-email-autoresponder/route.ts',
  'ai-fraud-detection/route.ts',
  'ai-email-followup/route.ts',
  'ai-smart-notifications/route.ts',
  'ai-personalized-notifications/route.ts',
  'ai-warranty-predictor/route.ts',
  'ai-order-priority/route.ts',
  'ai-video-generator/route.ts',
  'ai-multilingual/route.ts',
  'ai-translate/route.ts',
  'ai-lead-scoring/route.ts',
  'ai-technical-rag/route.ts',
  'ai-knowledge-base/route.ts',
  'ai-technical-answers/route.ts',
  'ai-inventory-forecast/route.ts',
  'ai-supplier-negotiation/route.ts',
  'ai-segment-clients/route.ts',
  'ai-image-search/route.ts',
  'ai-supplier-evaluator/route.ts',
  'ai-generate-pdf/route.ts',
  'ai-seasonality/route.ts',
  'ai-stock-prediction/route.ts',
  'ai-quote-generator/route.ts',
  'ai-review-analysis/route.ts',
  'ai-product-comparison/route.ts',
  'ai-product-recommender/route.ts',
  'ai-quote-negotiation/route.ts',
  'ai-product-bundling/route.ts',
  'ai-return-prediction/route.ts',
];

const basePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'api');
let fixed = 0;
let errors = 0;

files.forEach(file => {
  const filePath = path.join(basePath, file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${file} (not found)`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already fixed
    if (content.includes('import { prisma } from "@/lib/prisma"')) {
      console.log(`ALREADY FIXED: ${file}`);
      return;
    }
    
    // Replace the import and declaration
    // Pattern 1: import { PrismaClient } from "@prisma/client"; + const prisma = new PrismaClient();
    const oldPattern1 = /import \{ PrismaClient \} from ["']@prisma\/client["'];\s*\n\s*const prisma = new PrismaClient\(\);/g;
    
    // Pattern 2: import { NextRequest, NextResponse } from "next/server";\nimport { PrismaClient } from "@prisma/client";\n\nconst prisma = new PrismaClient();
    const oldPattern2 = /import \{ PrismaClient \} from ["']@prisma\/client["'];\s*\n\nconst prisma = new PrismaClient\(\);/g;
    
    // Try replacing
    let newContent = content;
    
    // First, remove the PrismaClient import if it exists
    newContent = newContent.replace(/import \{ PrismaClient \} from ["']@prisma\/client["'];\s*\n?/g, '');
    
    // Remove the const prisma = new PrismaClient() line
    newContent = newContent.replace(/const prisma = new PrismaClient\(\);\s*\n?/g, '');
    
    // Add the correct import after the first import
    if (newContent.includes('import { NextRequest, NextResponse }')) {
      newContent = newContent.replace(
        'import { NextRequest, NextResponse } from "next/server";',
        'import { NextRequest, NextResponse } from "next/server";\nimport { prisma } from "@/lib/prisma";'
      );
    } else if (newContent.includes('import { NextResponse }')) {
      newContent = newContent.replace(
        'import { NextResponse } from "next/server";',
        'import { NextResponse } from "next/server";\nimport { prisma } from "@/lib/prisma";'
      );
    }
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`FIXED: ${file}`);
      fixed++;
    } else {
      console.log(`NO CHANGE: ${file}`);
    }
    
  } catch (err) {
    console.error(`ERROR: ${file} - ${err.message}`);
    errors++;
  }
});

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`❌ Errors: ${errors} files`);
