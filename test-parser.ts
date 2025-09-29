// test-parser.ts

import { getFileNumber } from './src/lib/parse/file-number-parser'; // 确保路径正确

// 定义我们的测试用例
// 格式: [输入文件名, 期望输出的番号, (可选)需要移除的标签列表]
const testCases: [string, string, string[]?][] = [
  // --- 基本清理测试 ---
  ["[Censored] XXX-123-HD.mp4", "XXX-123", ["[Censored]"]],
  ["SOME-ID-456.x265.4k.mkv", "SOME-ID-456", []],
  ["[MyTag]ABC-789.hevc.mp4", "ABC-789", ["[MyTag]"]],

  // --- 标准番号测试 ---
  ["SSNI-644.mp4", "SSNI-644", []],
  ["SSNI00644.mkv", "SSNI-644", []],
  ["259LUXU-1456.mp4", "1LUXU-1456", []], // 测试 SUREN_DIC
  ["STAR-456.avi", "2STAR-456", []],     // 测试 SUREN_DIC
  ["MKBD-S120.mp4", "MKBD-S120", []],

  // --- FC2 & HEYZO 测试 ---
  ["FC2-PPV-1234567.mp4", "FC2-1234567", []],
  ["FC2PPV1234567.mkv", "FC2-1234567", []],
  ["[MySite.com]FC-12345.mp4", "FC2-12345", ["[MySite.com]"]],
  ["HEYZO_1234_HD.mp4", "HEYZO-1234", []],
  
  // --- 欧美番号测试 ---
  ["SexArt.21.03.14.Some.Model.XXX.1080p.mp4", "Sexart.21.03.14", []],
  ["blacked.2024-01-02.mp4", "Blacked.2024.01.02", []],

  // --- 复杂和边缘情况测试 ---
  ["[MyWife] No.1234 video.mp4", "Mywife No.1234", ["[MyWife]"]],
  ["MMR-AK089SP.mp4", "MMRAK089SP", []],
  ["SOME-PREFIX-MD-0165-1.mp4", "MD-0165-1", ["SOME-PREFIX-"]],
  ["C0930-ki221218.mp4", "C0930-ki221218", []],
  ["KIN8TENGOKU-1234.mp4", "KIN8-1234", []],
  ["S2MBD-002.mp4", "S2MBD-002", []],
  ["H_173MEGA05.mkv", "MEGA-05", []],
  ["N1234.mp4", "n1234", []],

  // --- 分集和后缀测试 ---
  ["ABP-123-CD1.mp4", "ABP-123", []],
  ["stars-123.A.mp4", "STARS-123", []],
  ["IPX-123-C.mp4", "IPX-123", []],
  
  // --- Fallback (无匹配) 测试 ---
  ["(unrelated) My Vacation Video.mp4", "My Vacation Video", ["(unrelated)"]],
];

// 运行测试
let passed = 0;
let failed = 0;

console.log("🚀 Running File Number Parser Tests...\n");

testCases.forEach(([filepath, expected, escapeList = []], index) => {
  const result = getFileNumber(filepath, escapeList);
  
  const testNum = (index + 1).toString().padStart(2, '0');

  if (result === expected) {
    console.log(`✅ Test ${testNum}: PASS`);
    console.log(`   Input:    "${filepath}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Result:   "${result}"\n`);
    passed++;
  } else {
    console.error(`❌ Test ${testNum}: FAIL`);
    console.error(`   Input:    "${filepath}"`);
    console.error(`   Expected: "${expected}"`);
    console.error(`   Result:   "${result}"\n`);
    failed++;
  }
});

console.log("----------------------------------------");
console.log(`Test Summary: ${passed} passed, ${failed} failed.`);
console.log("----------------------------------------");

// 如果有失败的测试，以非零状态码退出
if (failed > 0) {
  process.exit(1);
}