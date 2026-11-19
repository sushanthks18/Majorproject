import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'backend', 'ml', 'mobilenet_v2_disease.py');

console.log('='.repeat(80));
console.log('🧪 KRISHI SAKHA: BACKEND PYTHON INFERENCE & MARGIN GATE INTEGRATION TEST');
console.log('='.repeat(80));

function runInference(imagePath, targetCrop = null) {
  return new Promise((resolve, reject) => {
    let base64Image = '';
    if (imagePath && fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath);
      base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } else if (imagePath) {
      base64Image = imagePath; // raw string / invalid data
    }

    const payload = JSON.stringify({
      image: base64Image,
      crop: targetCrop
    });

    const pyProcess = spawn('python3', [SCRIPT_PATH], { cwd: REPO_ROOT });
    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Process exited with code ${code}: ${stderrData}`));
      }
      try {
        const jsonOutput = JSON.parse(stdoutData.trim());
        resolve(jsonOutput);
      } catch (err) {
        reject(new Error(`Failed to parse JSON: ${stdoutData}\nStderr: ${stderrData}`));
      }
    });

    pyProcess.stdin.write(payload);
    pyProcess.stdin.end();
  });
}

async function runTests() {
  let passed = 0;
  let total = 0;

  // Test 1: Supported Leaf (Tomato Late Blight)
  total++;
  const tomatoImg = '/Users/sushanthks/Documents/Major Project/plantvillage dataset/color/Tomato___Late_blight/ed06f115-9ca4-44d7-be94-e514a5ca58ce___GHLB2 Leaf 148.3.JPG';
  console.log(`\n[Test 1] Testing Supported Crop (Tomato Late Blight)...`);
  try {
    const res = await runInference(tomatoImg, null);
    console.log(`  -> Status: ${res.status} | Crop: ${res.crop} | Diagnosis: ${res.diagnosis} | Conf: ${res.confidence}%`);
    if (res.status === 'success' && res.crop === 'Tomato') {
      console.log('  ✅ PASS: Correctly identified supported crop and path');
      passed++;
    } else {
      console.log('  ❌ FAIL');
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
  }

  // Test 2: Flipped Unsupported Sample (Soybean with Margin Gate < 50%)
  total++;
  const soyImg = '/Users/sushanthks/Documents/Major Project/plantvillage dataset/color/Soybean___healthy/0ebeb001-ee7e-4fda-972d-d4df20f0b7e4___RS_HL 7441.JPG';
  console.log(`\n[Test 2] Testing Unsupported Flipped Sample (Soybean with margin < 50%)...`);
  try {
    const res = await runInference(soyImg, null);
    console.log(`  -> Status: ${res.status} | Diagnosis: ${res.diagnosis} | Best Crop: ${res.bestSupportedCrop} | Margin: ${res.margin}%`);
    if (res.status === 'uncertain' && res.diagnosis === 'Uncertain / Unsupported Crop' && res.margin < 50.0) {
      console.log('  ✅ PASS: Margin gate safely rejected ambiguous soybean leaf');
      passed++;
    } else {
      console.log('  ❌ FAIL');
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
  }

  // Test 3: Legacy Explicit Unsupported Query (Sugarcane)
  total++;
  console.log(`\n[Test 3] Testing Explicit Legacy Unsupported Query (Sugarcane)...`);
  try {
    const res = await runInference(tomatoImg, 'Sugarcane');
    console.log(`  -> Status: ${res.status} | Diagnosis: ${res.diagnosis} | Message: ${res.message}`);
    if (res.status === 'unsupported' && res.diagnosis === 'NOT SUPPORTED YET') {
      console.log('  ✅ PASS: Explicit query intercepted immediately');
      passed++;
    } else {
      console.log('  ❌ FAIL');
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
  }

  // Test 4: Invalid Image (Corrupt payload)
  total++;
  console.log(`\n[Test 4] Testing Invalid Image Handling...`);
  try {
    const res = await runInference('invalid_base64_data', null);
    console.log(`  -> Status: ${res.status} | Message: ${res.message}`);
    if (res.status === 'invalid_image' && res.valid === false) {
      console.log('  ✅ PASS: Invalid image rejected safely');
      passed++;
    } else {
      console.log('  ❌ FAIL');
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`INTEGRATION RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('='.repeat(80));
  if (passed !== total) process.exit(1);
}

runTests();
