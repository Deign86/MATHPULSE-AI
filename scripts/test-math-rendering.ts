import { normalizeChatMarkdownForRender, formatAssistantResponseForStorage } from '../src/utils/chatMessageFormatting';

interface TestCase {
  name: string;
  input: string;
  expected: string;
}

const testCases: TestCase[] = [
  // Bare LaTeX commands - should wrap with $...$
  {
    name: 'Bare \\boxed command',
    input: 'Final answer: \\boxed{5}',
    expected: 'Final answer: $\\boxed{5}$',
  },
  {
    name: 'Bare \\frac command',
    input: 'Solve x = \\frac{1}{2}',
    expected: 'Solve x = $\\frac{1}{2}$',
  },
  {
    name: 'Bare \\sqrt command',
    input: 'The square root is \\sqrt{16}',
    expected: 'The square root is $\\sqrt{16}$',
  },
  // Basic bracket math
  {
    name: 'Basic bracket math',
    input: '[ 2x + 5 = 20 ]',
    expected: '\\(2x + 5 = 20\\)',
  },
  // Check that brackets get converted to \(...\)
  {
    name: 'Bracket to latex conversion',
    input: '[ ax^2 + bx + c = 0 ]',
    expected: '\\(ax^2 + bx + c = 0\\)',
  },
];

console.log('Testing Math Rendering Fix\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const storageResult = formatAssistantResponseForStorage(testCase.input);
  const result = normalizeChatMarkdownForRender(storageResult);

  const success = result === testCase.expected;

  if (success) {
    console.log(`✅ PASS: ${testCase.name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${testCase.name}`);
    console.log(`   Input:    ${testCase.input.substring(0, 50)}...`);
    console.log(`   Expected: ${testCase.expected.substring(0, 50)}...`);
    console.log(`   Got:      ${result.substring(0, 50)}...`);
    failed++;
  }
}

console.log('\n' + '=' .repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n❌ SOME TESTS FAILED - Fix needed!');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED - Fix verified!');
  process.exit(0);
}