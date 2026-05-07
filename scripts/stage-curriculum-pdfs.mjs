import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(REPO_ROOT, '.local', 'curriculum-pdfs');
const SOURCE_DIR = 'C:/Users/Deign/Downloads/Documents';
const MANIFEST_PATH = path.join(STAGING_DIR, 'manifest.json');

const PDF_MAP = {
  'SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf': {
    id: 'bm_lesson_1',
    moduleId: 'business-math',
    lessonId: 'lesson-bm-1',
    title: 'Represent business transactions and financial goals using variables and equations.',
    subject: 'Business Mathematics',
    quarter: 1,
    competencyCode: 'ABM_BM11BS-Ia-b-1',
    learningCompetency: 'Translate verbal phrases to mathematical expressions; model business scenarios using linear equations and inequalities.',
    storagePath: 'curriculum-pdfs/business-math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf',
    contentDomain: 'introduction',
  },
  'SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf': {
    id: 'stat_lesson_1',
    moduleId: 'statistics-probability',
    lessonId: 'lesson-stat-1',
    title: 'Understanding Random Variables and Probability Distributions',
    subject: 'Statistics and Probability',
    quarter: 1,
    competencyCode: 'SP_SHS11-Ia-1',
    learningCompetency: 'Define and describe random variables and their types.',
    storagePath: 'curriculum-pdfs/statistics-probability/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf',
    contentDomain: 'introduction',
  },
  'Finite-Mathematics-1-1.pdf': {
    id: 'fm1_lesson_1',
    moduleId: 'finite-math-1',
    lessonId: 'lesson-fm1-1',
    title: 'Fundamental Counting Principle',
    subject: 'Finite Mathematics 1',
    quarter: 1,
    competencyCode: 'FM1_SHS11-Ia-1',
    learningCompetency: 'Apply the fundamental counting principle in contextual problems.',
    storagePath: 'curriculum-pdfs/finite-math-1/Finite-Mathematics-1-1.pdf',
    contentDomain: 'introduction',
  },
  'Finite-Mathematics-2-1.pdf': {
    id: 'fm2_lesson_1',
    moduleId: 'finite-math-2',
    lessonId: 'lesson-fm2-1',
    title: 'Matrices and Basic Operations',
    subject: 'Finite Mathematics 2',
    quarter: 1,
    competencyCode: 'FM2_SHS11-Ia-1',
    learningCompetency: 'Represent contextual data using matrix notation.',
    storagePath: 'curriculum-pdfs/finite-math-2/Finite-Mathematics-2-1.pdf',
    contentDomain: 'introduction',
  },
  'GENERAL-MATHEMATICS-1.pdf': {
    id: 'gm_lesson_1',
    moduleId: 'general-mathematics',
    lessonId: 'lesson-gm-1',
    title: 'Functions and Real-Life Relationships',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM_SHS11-Ia-1',
    learningCompetency: 'Represents real-life situations using functions, including piecewise functions.',
    storagePath: 'curriculum-pdfs/general-math/GENERAL-MATHEMATICS-1.pdf',
    contentDomain: 'introduction',
  },
  'SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf': {
    id: 'gm_navotas_lesson_1',
    moduleId: 'general-mathematics',
    lessonId: 'lesson-gm-navotas-1',
    title: 'General Mathematics - SDO Navotas Curriculum Guide',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-Ia-1',
    learningCompetency: 'Represents real-life situations using functions.',
    storagePath: 'curriculum-pdfs/general-math/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf',
    contentDomain: 'introduction',
  },
  'SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf': {
    id: 'org_mgmt_lesson_1',
    moduleId: 'organization-management',
    lessonId: 'lesson-org-mgmt-1',
    title: 'Organization and Management in ABM',
    subject: 'Organization and Management',
    quarter: 1,
    competencyCode: 'ABM_OM11-Ia-1',
    learningCompetency: 'Understand the fundamental concepts of organization and management.',
    storagePath: 'curriculum-pdfs/organization-management/SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf',
    contentDomain: 'introduction',
  },
};

async function main() {
  if (!fs.existsSync(STAGING_DIR)) {
    fs.mkdirSync(STAGING_DIR, { recursive: true });
  }

  const manifest = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    pdfs: [],
  };

  for (const [filename, metadata] of Object.entries(PDF_MAP)) {
    const srcPath = path.join(SOURCE_DIR, filename);
    const destPath = path.join(STAGING_DIR, filename);

    if (fs.existsSync(srcPath)) {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${filename}`);
      } else {
        const srcStat = fs.statSync(srcPath);
        const destStat = fs.statSync(destPath);
        if (srcStat.size !== destStat.size) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Updated: ${filename}`);
        } else {
          console.log(`Skipped (already exists): ${filename}`);
        }
      }

      manifest.pdfs.push({
        filename,
        localPath: destPath,
        size: fs.statSync(destPath).size,
        ...metadata,
      });
    } else {
      console.warn(`WARNING: Source PDF not found: ${srcPath}`);
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to: ${MANIFEST_PATH}`);
  console.log(`Total PDFs staged: ${manifest.pdfs.length}`);
}

main().catch(console.error);