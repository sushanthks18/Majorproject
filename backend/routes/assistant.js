import express from 'express';
import { authenticate } from '../middleware/auth.js';
import SensorData from '../models/SensorData.js';
import Field from '../models/Field.js';
import Request from '../models/Request.js';

const router = express.Router();

// Voice assistant query endpoint
router.post('/query', authenticate, async (req, res) => {
  try {
    const { query, language = 'en-US' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🎤 Voice Assistant Query: "${query}" (${language})`);

    // Process the query and generate response
    const response = await processQuery(query.toLowerCase(), req.userId, language);

    res.json({
      response: response.text,
      language: language,
      actions: response.actions || []
    });

  } catch (error) {
    console.error('Error processing assistant query:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// Query processing logic with multilingual support
async function processQuery(query, userId, language) {
  // Get user data
  const latestSensor = await SensorData.findOne({ farmerId: userId }).sort({ timestamp: -1 });
  const fields = await Field.find({ farmerId: userId });
  const requests = await Request.find({ farmerId: userId }).sort({ createdAt: -1 }).limit(5);

  // Mock weather data (in production, fetch from weather API)
  const weather = {
    temperature: latestSensor?.temperature || 28,
    condition: 'Pleasant',
    humidity: latestSensor?.humidity || 65,
    rainfall: 0
  };

  // Intent detection (works across languages using keywords)
  const intents = detectIntent(query);

  let response = { text: '', actions: [] };

  // Weather queries
  if (intents.includes('weather')) {
    if (weather) {
      response = {
        text: getTranslation(language, 'weather', {
          temp: weather.temperature,
          condition: weather.condition,
          humidity: weather.humidity,
          rainfall: weather.rainfall
        })
      };
    } else {
      response = {
        text: getTranslation(language, 'weather_unavailable')
      };
    }
  }
  
  // Sensor/field status queries
  else if (intents.includes('sensor') || intents.includes('field') || intents.includes('status')) {
    if (latestSensor) {
      const alerts = [];
      if (latestSensor.soilMoisture < 30) alerts.push('low_soil_moisture');
      if (latestSensor.temperature > 35) alerts.push('high_temperature');
      if (latestSensor.pH < 5.5 || latestSensor.pH > 8) alerts.push('ph_imbalance');
      
      response = {
        text: getTranslation(language, 'sensor_status', {
          temp: latestSensor.temperature.toFixed(1),
          humidity: latestSensor.humidity.toFixed(1),
          soil: latestSensor.soilMoisture.toFixed(0),
          ph: latestSensor.pH.toFixed(1),
          alerts: alerts.map(a => getTranslation(language, a)).join('. ')
        })
      };
    } else {
      response = {
        text: getTranslation(language, 'no_sensor_data')
      };
    }
  }
  
  // Irrigation advice
  else if (intents.includes('irrigation') || intents.includes('water')) {
    if (latestSensor) {
      if (latestSensor.soilMoisture < 30) {
        response = {
          text: getTranslation(language, 'irrigation_needed', {
            moisture: latestSensor.soilMoisture.toFixed(0)
          }),
          actions: ['open_irrigation']
        };
      } else if (latestSensor.soilMoisture > 65) {
        response = {
          text: getTranslation(language, 'irrigation_not_needed', {
            moisture: latestSensor.soilMoisture.toFixed(0)
          })
        };
      } else {
        response = {
          text: getTranslation(language, 'irrigation_moderate', {
            moisture: latestSensor.soilMoisture.toFixed(0)
          })
        };
      }
    } else {
      response = {
        text: getTranslation(language, 'no_sensor_data')
      };
    }
  }
  
  // Labour/help queries
  else if (intents.includes('labour') || intents.includes('worker') || intents.includes('help')) {
    response = {
      text: getTranslation(language, 'labour_help', {
        count: requests.filter(r => r.status === 'pending').length
      }),
      actions: ['open_labour']
    };
  }
  
  // Price queries
  else if (intents.includes('price') || intents.includes('market') || intents.includes('mandi')) {
    response = {
      text: getTranslation(language, 'price_info'),
      actions: ['open_prices']
    };
  }
  
  // Crop advice
  else if (intents.includes('crop') || intents.includes('plant') || intents.includes('grow')) {
    response = {
      text: getTranslation(language, 'crop_advice'),
      actions: ['open_crop_prediction']
    };
  }
  
  // Fertilizer queries
  else if (intents.includes('fertilizer') || intents.includes('nutrient') || intents.includes('manure')) {
    response = {
      text: getTranslation(language, 'fertilizer_advice'),
      actions: ['open_fertilizer']
    };
  }
  
  // Disease queries
  else if (intents.includes('disease') || intents.includes('pest') || intents.includes('problem')) {
    response = {
      text: getTranslation(language, 'disease_help'),
      actions: ['open_disease_detection']
    };
  }
  
  // Greetings
  else if (intents.includes('greeting')) {
    response = {
      text: getTranslation(language, 'greeting')
    };
  }
  
  // Default response
  else {
    response = {
      text: getTranslation(language, 'default_help')
    };
  }

  return response;
}

// Intent detection
function detectIntent(query) {
  const intents = [];
  const lowerQuery = query.toLowerCase();
  
  // Greeting
  if (/hello|hi|hey|namaste|नमस्ते|ನಮಸ್ಕಾರ|నమస్కారం|வணக்கம்|good morning|good evening/.test(lowerQuery)) {
    intents.push('greeting');
    return intents; // Return immediately for greetings
  }
  
  // Weather - broader detection
  if (/weather|climate|rain|temperature|hot|cold|forecast|sunny|cloudy|मौसम|ಹವಾಮಾನ|వాతావరణం|காலநிலை|तापमान|बारिश/.test(lowerQuery)) {
    intents.push('weather');
  }
  
  // Sensor/Status - broader detection
  if (/sensor|status|condition|field|farm|how|check|show|tell|data|फसल|ಕ್ಷೇತ್ರ|పొలం|வயல்|स्थिति|कैसा|कैसी/.test(lowerQuery)) {
    intents.push('sensor', 'field', 'status');
  }
  
  // Irrigation - broader detection
  if (/water|irrigation|irrigate|spray|wet|dry|moisture|सिंचाई|ನೀರು|నీరు|நீர்|पाणी|पानी/.test(lowerQuery)) {
    intents.push('irrigation', 'water');
  }
  
  // Labour - broader detection
  if (/labour|labor|worker|help|people|man|मजदूर|ಕಾರ್ಮಿಕ|కార్మికుడు|தொழிலாளர்|मदत|काम/.test(lowerQuery)) {
    intents.push('labour', 'worker', 'help');
  }
  
  // Price - broader detection
  if (/price|market|mandi|sell|buy|cost|rate|कीमत|ಬೆಲೆ|ధర|விலை|बाजार|मंडी/.test(lowerQuery)) {
    intents.push('price', 'market', 'mandi');
  }
  
  // Crop - broader detection
  if (/crop|plant|grow|sow|seed|harvest|फसल|ಬೆಳೆ|పంట|பயிர்|पीक|बुवाई/.test(lowerQuery)) {
    intents.push('crop', 'plant', 'grow');
  }
  
  // Fertilizer - broader detection
  if (/fertilizer|nutrient|manure|urea|npk|खाद|ಗೊಬ್ಬರ|ఎరువు|உரம்|खत/.test(lowerQuery)) {
    intents.push('fertilizer', 'nutrient', 'manure');
  }
  
  // Disease - broader detection
  if (/disease|pest|bug|problem|sick|damage|रोग|ರೋಗ|వ్యాధి|நோய்|समस्या|कीट/.test(lowerQuery)) {
    intents.push('disease', 'pest', 'problem');
  }
  
  // If no specific intent detected but query seems like a question, default to sensor status
  if (intents.length === 0 && /what|how|when|why|where|can|should|is|are|क्या|कैसे|कब|ಏನು|ಹೇಗೆ|ఏమి|எப்படி/.test(lowerQuery)) {
    intents.push('sensor', 'status');
  }
  
  return intents;
}

// Multilingual response templates
function getTranslation(language, key, data = {}) {
  const translations = {
    'en-US': {
      greeting: "Hello! I'm your Krishi Sakha assistant. How can I help you with your farming today?",
      weather: `Current weather: ${data.temp}°C, ${data.condition}. Humidity is ${data.humidity}%. ${data.rainfall > 0 ? `Rainfall: ${data.rainfall}mm.` : 'No rain expected today.'}`,
      weather_unavailable: "Weather information is currently unavailable. Please check back later.",
      sensor_status: `Your farm status: Temperature ${data.temp}°C, Humidity ${data.humidity}%, Soil moisture ${data.soil}%, pH ${data.ph}. ${data.alerts || 'Everything looks good!'}`,
      no_sensor_data: "No sensor data available yet. Please ensure your sensors are connected.",
      irrigation_needed: `Urgent! Soil moisture is low at ${data.moisture}%. Irrigation is needed immediately.`,
      irrigation_not_needed: `Soil moisture is good at ${data.moisture}%. No irrigation needed right now.`,
      irrigation_moderate: `Soil moisture is ${data.moisture}%. Consider irrigation in the next 1-2 days.`,
      labour_help: `You have ${data.count} pending labour requests. Would you like to find more workers or check request status?`,
      price_info: "I can help you check current market prices. Opening mandi prices for you.",
      crop_advice: "I can suggest the best crops to plant based on your soil and weather. Let me show you crop predictions.",
      fertilizer_advice: "I can help you optimize fertilizer usage. Opening fertilizer recommendations.",
      disease_help: "I can help identify crop diseases. Would you like to scan a crop image for disease detection?",
      default_help: "I can help you with weather, irrigation, prices, crop advice, labour requests, and more. What would you like to know?",
      low_soil_moisture: "Warning: Low soil moisture",
      high_temperature: "Alert: High temperature detected",
      ph_imbalance: "pH level is not optimal"
    },
    'hi-IN': {
      greeting: "नमस्ते! मैं आपका कृषि सखा सहायक हूं। आज मैं आपकी खेती में कैसे मदद कर सकता हूं?",
      weather: `वर्तमान मौसम: ${data.temp}°C, ${data.condition}। नमी ${data.humidity}% है। ${data.rainfall > 0 ? `बारिश: ${data.rainfall}मिमी।` : 'आज बारिश की संभावना नहीं।'}`,
      weather_unavailable: "मौसम की जानकारी अभी उपलब्ध नहीं है। कृपया बाद में जांचें।",
      sensor_status: `आपके खेत की स्थिति: तापमान ${data.temp}°C, नमी ${data.humidity}%, मिट्टी की नमी ${data.soil}%, pH ${data.ph}। ${data.alerts || 'सब कुछ अच्छा दिख रहा है!'}`,
      no_sensor_data: "अभी तक कोई सेंसर डेटा उपलब्ध नहीं है। कृपया सुनिश्चित करें कि आपके सेंसर कनेक्ट हैं।",
      irrigation_needed: `जरूरी! मिट्टी की नमी ${data.moisture}% कम है। तुरंत सिंचाई की जरूरत है।`,
      irrigation_not_needed: `मिट्टी की नमी ${data.moisture}% अच्छी है। अभी सिंचाई की जरूरत नहीं।`,
      irrigation_moderate: `मिट्टी की नमी ${data.moisture}% है। अगले 1-2 दिनों में सिंचाई पर विचार करें।`,
      labour_help: `आपके ${data.count} लंबित मजदूर अनुरोध हैं। क्या आप अधिक मजदूर ढूंढना चाहते हैं या अनुरोध की स्थिति जांचना चाहते हैं?`,
      price_info: "मैं आपको वर्तमान बाजार मूल्य जांचने में मदद कर सकता हूं। आपके लिए मंडी कीमतें खोल रहा हूं।",
      crop_advice: "मैं आपकी मिट्टी और मौसम के आधार पर सर्वोत्तम फसलें सुझा सकता हूं। फसल पूर्वानुमान दिखा रहा हूं।",
      fertilizer_advice: "मैं उर्वरक उपयोग को अनुकूलित करने में मदद कर सकता हूं। उर्वरक सिफारिशें खोल रहा हूं।",
      disease_help: "मैं फसल रोगों की पहचान में मदद कर सकता हूं। क्या आप रोग का पता लगाने के लिए फसल की छवि स्कैन करना चाहते हैं?",
      default_help: "मैं मौसम, सिंचाई, कीमतों, फसल सलाह, मजदूर अनुरोध और बहुत कुछ में मदद कर सकता हूं। आप क्या जानना चाहेंगे?",
      low_soil_moisture: "चेतावनी: कम मिट्टी की नमी",
      high_temperature: "अलर्ट: उच्च तापमान का पता चला",
      ph_imbalance: "pH स्तर अनुकूल नहीं है"
    },
    'kn-IN': {
      greeting: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕೃಷಿ ಸಖಾ ಸಹಾಯಕ. ಇಂದು ನಿಮ್ಮ ಕೃಷಿಯಲ್ಲಿ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
      weather: `ಪ್ರಸ್ತುತ ಹವಾಮಾನ: ${data.temp}°C, ${data.condition}. ತೇವಾಂಶ ${data.humidity}%. ${data.rainfall > 0 ? `ಮಳೆ: ${data.rainfall}mm.` : 'ಇಂದು ಮಳೆಯ ನಿರೀಕ್ಷೆ ಇಲ್ಲ.'}`,
      weather_unavailable: "ಹವಾಮಾನ ಮಾಹಿತಿ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಂತರ ಪರಿಶೀಲಿಸಿ.",
      sensor_status: `ನಿಮ್ಮ ಕ್ಷೇತ್ರದ ಸ್ಥಿತಿ: ತಾಪಮಾನ ${data.temp}°C, ತೇವಾಂಶ ${data.humidity}%, ಮಣ್ಣಿನ ತೇವಾಂಶ ${data.soil}%, pH ${data.ph}. ${data.alerts || 'ಎಲ್ಲವೂ ಚೆನ್ನಾಗಿದೆ!'}`,
      no_sensor_data: "ಇನ್ನೂ ಯಾವುದೇ ಸಂವೇದಕ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂವೇದಕಗಳು ಸಂಪರ್ಕಗೊಂಡಿವೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      irrigation_needed: `ತುರ್ತು! ಮಣ್ಣಿನ ತೇವಾಂಶ ${data.moisture}% ಕಡಿಮೆಯಾಗಿದೆ. ತಕ್ಷಣ ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ.`,
      irrigation_not_needed: `ಮಣ್ಣಿನ ತೇವಾಂಶ ${data.moisture}% ಉತ್ತಮವಾಗಿದೆ. ಇದೀಗ ನೀರಾವರಿ ಅಗತ್ಯವಿಲ್ಲ.`,
      irrigation_moderate: `ಮಣ್ಣಿನ ತೇವಾಂಶ ${data.moisture}%. ಮುಂದಿನ 1-2 ದಿನಗಳಲ್ಲಿ ನೀರಾವರಿ ಪರಿಗಣಿಸಿ.`,
      labour_help: `ನಿಮಗೆ ${data.count} ಬಾಕಿ ಇರುವ ಕಾರ್ಮಿಕ ವಿನಂತಿಗಳಿವೆ. ಹೆಚ್ಚಿನ ಕಾರ್ಮಿಕರನ್ನು ಹುಡುಕಲು ಅಥವಾ ವಿನಂತಿ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲು ಬಯಸುವಿರಾ?`,
      price_info: "ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನಿಮಗಾಗಿ ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.",
      crop_advice: "ನಿಮ್ಮ ಮಣ್ಣು ಮತ್ತು ಹವಾಮಾನದ ಆಧಾರದ ಮೇಲೆ ಉತ್ತಮ ಬೆಳೆಗಳನ್ನು ಸೂಚಿಸಬಲ್ಲೆ. ಬೆಳೆ ಮುನ್ಸೂಚನೆಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇನೆ.",
      fertilizer_advice: "ಗೊಬ್ಬರ ಬಳಕೆಯನ್ನು ಅತ್ಯುತ್ತಮಗೊಳಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಗೊಬ್ಬರ ಶಿಫಾರಸುಗಳನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.",
      disease_help: "ಬೆಳೆ ರೋಗಗಳನ್ನು ಗುರುತಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ರೋಗ ಪತ್ತೆಗಾಗಿ ಬೆಳೆ ಚಿತ್ರವನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಬಯಸುವಿರಾ?",
      default_help: "ನಾನು ಹವಾಮಾನ, ನೀರಾವರಿ, ಬೆಲೆಗಳು, ಬೆಳೆ ಸಲಹೆ, ಕಾರ್ಮಿಕ ವಿನಂತಿಗಳು ಮತ್ತು ಹೆಚ್ಚಿನದರಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನು ತಿಳಿದುಕೊಳ್ಳಲು ಬಯಸುವಿರಿ?",
      low_soil_moisture: "ಎಚ್ಚರಿಕೆ: ಕಡಿಮೆ ಮಣ್ಣಿನ ತೇವಾಂಶ",
      high_temperature: "ಅಲರ್ಟ್: ಹೆಚ್ಚಿನ ತಾಪಮಾನ ಪತ್ತೆಯಾಗಿದೆ",
      ph_imbalance: "pH ಮಟ್ಟ ಅನುಕೂಲವಾಗಿಲ್ಲ"
    }
  };

  return translations[language]?.[key] || translations['en-US'][key] || key;
}

export default router;
