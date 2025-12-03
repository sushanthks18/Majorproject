/**
 * ML Model Predictor - Integrates Python scikit-learn models with Node.js
 * Uses trained Random Forest and Decision Tree models for crop prediction
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Predict crop using trained Random Forest model
 * @param {number} temperature - Temperature in Celsius
 * @param {number} humidity - Humidity percentage
 * @param {number} soilMoisture - Soil moisture percentage
 * @param {number} pH - Soil pH level
 * @param {number} rainfall - Rainfall in mm (default 100)
 * @param {Object} regionalDistribution - Regional crop distribution data (optional)
 * @returns {Promise<Object>} Prediction result with crop, confidence, and recommendations
 */
export async function predictCrop(temperature, humidity, soilMoisture, pH, rainfall = 100, regionalDistribution = null) {
  return new Promise((resolve, reject) => {
    console.log('\n🤖 [ML Model] Invoking Market-Aware Random Forest Classifier...');
    console.log(`Input: T=${temperature}°C, H=${humidity}%, SM=${soilMoisture}%, pH=${pH}, R=${rainfall}mm`);
    if (regionalDistribution) {
      console.log('📊 Regional Distribution:', JSON.stringify(regionalDistribution));
    }

    // Prepare Python script arguments
    const scriptArgs = [
      path.join(__dirname, 'market_aware_predictor.py'),
      temperature.toString(),
      humidity.toString(),
      soilMoisture.toString(),
      pH.toString(),
      rainfall.toString()
    ];

    // Add regional distribution as JSON if provided
    if (regionalDistribution) {
      scriptArgs.push(JSON.stringify(regionalDistribution));
    }

    // Spawn Python process
    const pythonProcess = spawn('python3', scriptArgs);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ [ML Model] Python process failed');
        console.error('Error:', errorString);
        return reject(new Error(`ML prediction failed: ${errorString}`));
      }

      try {
        const result = JSON.parse(dataString);
        console.log('✅ [ML Model] Market-Aware Prediction successful');
        console.log(`Recommended Crop: ${result.recommended_crop} (Profitability: ${result.profitability_score.toFixed(2)}%)`);
        console.log(`Model: ${result.model_used} (${result.accuracy.toFixed(2)}% accuracy)`);
        if (result.regional_insights.diversification_needed) {
          console.log('⚠️  [Market Alert] Regional diversification recommended!');
        }
        resolve(result);
      } catch (error) {
        console.error('❌ [ML Model] JSON parse error:', error);
        console.error('Raw output:', dataString);
        reject(new Error('Failed to parse ML prediction result'));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('ML prediction timeout'));
    }, 10000);
  });
}

/**
 * Get model metadata (accuracy, features, crops)
 * @returns {Promise<Object>} Model metadata
 */
export async function getModelMetadata() {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    const metadataPath = path.join(__dirname, 'model_metadata.json');
    
    fs.readFile(metadataPath, 'utf8', (err, data) => {
      if (err) {
        return reject(new Error('Model metadata not found. Please train models first.'));
      }
      
      try {
        const metadata = JSON.parse(data);
        resolve(metadata);
      } catch (error) {
        reject(new Error('Failed to parse model metadata'));
      }
    });
  });
}

/**
 * Check if ML models are trained and available
 * @returns {boolean} True if models exist
 */
export function modelsAvailable() {
  const fs = require('fs');
  const requiredFiles = [
    'random_forest_model.pkl',
    'decision_tree_model.pkl',
    'label_encoder.pkl',
    'model_metadata.json'
  ];

  return requiredFiles.every(file => {
    const filePath = path.join(__dirname, file);
    return fs.existsSync(filePath);
  });
}

export default { predictCrop, getModelMetadata, modelsAvailable };
