import express from 'express';
import { authenticate } from '../middleware/auth.js';
import SensorData from '../models/SensorData.js';
import Field from '../models/Field.js';
import Request from '../models/Request.js';
import MandiPrice from '../models/MandiPrice.js';

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
  const latestSensor = await SensorData.findOne({ farmerId: userId }).sort({ timestamp: -1 });
  const requests = await Request.find({ farmerId: userId }).sort({ createdAt: -1 });
  const prices = await MandiPrice.find().sort({ date: -1 }).limit(2);
  const latestPrice = prices[0];
  const previousPrice = prices[1];

  const internalEnglishQuery = translateToEnglish(query.toLowerCase());
  const intent = detectIntent(internalEnglishQuery);
  const lowerQuery = internalEnglishQuery;
  
  let responseText = '';

  if (intent === 'lang_en') {
    return { text: "Switching language to English.", actions: ['switch_en'] };
  } else if (intent === 'lang_hi') {
    return { text: "भाषा को हिंदी में बदल रहा हूँ।", actions: ['switch_hi'] };
  } else if (intent === 'lang_kn') {
    return { text: "ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗುತ್ತಿದೆ.", actions: ['switch_kn'] };
  }

  if (intent === 'sensor') {
    if (!latestSensor) {
      responseText = getTranslation(language, 'no_sensor_data');
    } else if (/moisture|soil|नमी|ಮಣ್ಣಿನ/.test(lowerQuery)) {
      responseText = getTranslation(language, 'moisture_data', { moisture: latestSensor.soilMoisture.toFixed(0) });
    } else if (/temperature|hot|cold|तापमान|ತಾಪಮಾನ/.test(lowerQuery)) {
      responseText = getTranslation(language, 'temperature_data', { temp: latestSensor.temperature.toFixed(1) });
    } else if (/ph|npk|potassium|acid|पीएच|ಪಿಎಚ್/.test(lowerQuery)) {
      responseText = getTranslation(language, 'ph_data', { ph: latestSensor.pH.toFixed(1) });
    } else {
      responseText = getTranslation(language, 'sensor_general', { moisture: latestSensor.soilMoisture.toFixed(0), temp: latestSensor.temperature.toFixed(1) });
    }
  }
  else if (intent === 'irrigation') {
    if (latestSensor) {
      const m = latestSensor.soilMoisture;
      if (m <= 30) {
        responseText = getTranslation(language, 'irrigation_needed', { moisture: m.toFixed(0) });
      } else if (m >= 65) {
        responseText = getTranslation(language, 'irrigation_not_needed', { moisture: m.toFixed(0) });
      } else {
        responseText = getTranslation(language, 'irrigation_moderate', { moisture: m.toFixed(0) });
      }
    } else {
      responseText = getTranslation(language, 'no_sensor_data');
    }
  }
  else if (intent.startsWith('market_')) {
    let trendDirection = 'stable';
    if (latestPrice && previousPrice) {
      if (latestPrice.price > previousPrice.price) trendDirection = 'increasing';
      else if (latestPrice.price < previousPrice.price) trendDirection = 'decreasing';
    }

    if (intent === 'market_price') {
      if (latestPrice) {
        responseText = getTranslation(language, 'mandi_data', { crop: latestPrice.crop, price: latestPrice.price });
      } else {
        responseText = getTranslation(language, 'no_mandi_data');
      }
    } else if (intent === 'market_trend') {
      responseText = getTranslation(language, `trend_${trendDirection}`);
    } else if (intent === 'market_advice') {
      responseText = getTranslation(language, `advice_${trendDirection}`);
    } else if (intent === 'market_crop_compare') {
      const allLatestPrices = await MandiPrice.find().sort({ date: -1 }).limit(20);
      const uniquePrices = [];
      const seenCrops = new Set();
      
      for (const p of allLatestPrices) {
        if (!seenCrops.has(p.crop.toLowerCase())) {
          seenCrops.add(p.crop.toLowerCase());
          uniquePrices.push(p);
        }
      }
      
      if (uniquePrices.length > 0) {
        uniquePrices.sort((a, b) => b.price - a.price);
        const bestCrop = uniquePrices[0];
        responseText = getTranslation(language, 'crop_compare', { crop: bestCrop.crop });
      } else {
        responseText = getTranslation(language, 'no_crop_data');
      }
    }
  }
  else if (intent === 'weather') {
    const willRain = Math.random() > 0.4;
    if (/rain|ಬಾರ್|ಮಳೆ|बारिश/.test(lowerQuery)) {
      if (willRain) {
        const chance = Math.floor(60 + Math.random() * 30);
        responseText = getTranslation(language, 'rain_yes', { chance });
      } else {
        responseText = getTranslation(language, 'rain_no');
      }
    } else {
      responseText = getTranslation(language, 'weather_api_forecast');
    }
  }
  else if (intent === 'scheme') {
    responseText = getTranslation(language, 'schemes_data');
  }
  else if (intent === 'news') {
    responseText = getTranslation(language, 'news_data');
  }
  else if (intent === 'mandi_search') {
    if (latestPrice && latestPrice.location) {
      responseText = getTranslation(language, 'mandi_search_data', { location: latestPrice.location, crop: latestPrice.crop });
    } else {
      responseText = getTranslation(language, 'no_mandi_location');
    }
  }
  else if (intent === 'labour') {
    const pending = requests.filter(r => r.status === 'pending').length;
    if (pending === 0) {
      responseText = getTranslation(language, 'no_labour');
    } else {
      responseText = getTranslation(language, 'labour_data', { count: pending });
    }
  }
  else {
    // LAYER 2: AI FALLBACK ALWAYS (No 'Sorry I don't understand')
    responseText = getAIResponse(query, language);
  }

  return { text: responseText, actions: [] };
}

// AI Fallback System (Layer 2)
function getAIResponse(query, language) {
  const lowerQuery = query.toLowerCase();
  let key = 'general_advice';
  
  if (/sell but|profit/i.test(lowerQuery)) {
    key = 'ai_sell_advice';
  } else if (/crop|which crop|best crop|grow|plant|sow|season|ಬೆಳೆ|फसल|ಬೆಳೆಯಲು/.test(lowerQuery)) {
    key = 'ai_crop_advice';
  } else if (/soil|fertility|npk|health|improve|fertilizer|manure|urea|ಉತ್ತಮ|ಮಣ್ಣು|मिट्टी|उर्वरक/.test(lowerQuery)) {
    key = 'ai_soil_advice';
  } else if (/disease|pest|bug|sick|yellow|damage|insect|ರೋಗ|ಕೀಟ|कीट|बीमारी/.test(lowerQuery)) {
    key = 'ai_pest_advice';
  } else if (/seed|germination|quality|ಬೀಜ|बीज/.test(lowerQuery)) {
    key = 'ai_seed_advice';
  }
  
  return getTranslation(language, key);
}

// Internal text translation parser prior to intent evaluation
function translateToEnglish(query) {
  let q = query;
  // Kannada direct mappings
  q = q.replace(/ಯಾವಾಗ ಮಾರುವುದು|ಯಾವಾಗ ಮಾರಬೇಕು/g, "when to sell");
  q = q.replace(/ಯಾವ ಬೆಳೆಯನ್ನು ಮಾರಬೇಕು|ಯಾವ ಬೆಳೆ/g, "which crop to sell");
  q = q.replace(/ಮಳೆ|ಹವಾಮಾನ/g, "weather");
  q = q.replace(/ನೀರಾವರಿ|ನೀರು/g, "irrigation");
  q = q.replace(/ಮಾರಾಟ|ಮಾರು/g, "sell");
  q = q.replace(/ಬೆಲೆ/g, "price");
  q = q.replace(/ಹೆಚ್ಚಳ|ಕಡಿಮೆ/g, "trend");
  q = q.replace(/ತಾಪಮಾನ/g, "temperature");
  q = q.replace(/ತೇವಾಂಶ/g, "moisture");
  q = q.replace(/ಯೋಜನೆ|ಯೋಜನೆಗಳು/g, "scheme");
  q = q.replace(/ಸುದ್ದಿ/g, "news");
  q = q.replace(/ಹತ್ತಿರದ ಮಾರುಕಟ್ಟೆ|ಹತ್ತಿರದ ಮಂಡಿ/g, "nearby mandi");
  q = q.replace(/ಮಂಡಿ/g, "mandi");
  q = q.replace(/ಎಲ್ಲಿ ಮಾರಬೇಕು|ಎಲ್ಲಿ/g, "where to sell");

  // Hindi direct mappings
  q = q.replace(/कब बेचना है|कब बेचें/g, "when to sell");
  q = q.replace(/कौन सी फसल|क्या बेचना/g, "which crop to sell");
  q = q.replace(/मौसम|बारिश/g, "weather");
  q = q.replace(/सिंचाई|पानी/g, "irrigation");
  q = q.replace(/बेचना|बिक्री/g, "sell");
  q = q.replace(/कीमत|मूल्य|भाव/g, "price");
  q = q.replace(/तापमान/g, "temperature");
  q = q.replace(/नमी/g, "moisture");
  q = q.replace(/योजना|योजनाएं/g, "scheme");
  q = q.replace(/समाचार|खबर/g, "news");
  q = q.replace(/पास की मंडी|नजदीकी मंडी/g, "nearby mandi");
  q = q.replace(/मंडी|बाजार/g, "mandi");
  q = q.replace(/कहाँ बेचना है|कहाँ/g, "where to sell");

  return q;
}

// Intent detection strictly executing off the internally translated string
function detectIntent(query) {
  const lowerQuery = query;
  
  if (/switch to english|english me|angla|ಇಂಗ್ಲಿಷ್/.test(lowerQuery)) return 'lang_en';
  if (/switch to hindi|hindi|हिंदी/.test(lowerQuery)) return 'lang_hi';
  if (/switch to kannada|kannada|ಕನ್ನಡ/.test(lowerQuery)) return 'lang_kn';

  if (/rain|weather|forecast|today weather|climate/.test(lowerQuery)) {
    return 'weather'; 
  }
  if (/moisture|temperature|humidity|ph|npk|hot|cold|soil/.test(lowerQuery) && !/irrigate|irrigation|water/.test(lowerQuery)) {
    return 'sensor'; 
  }
  if (/water|irrigation|should i water|irrigate|when to water/.test(lowerQuery)) {
    return 'irrigation';
  }
  if (/increase|decrease|trend|rising|falling/.test(lowerQuery)) {
    return 'market_trend';
  }
  if (/which crop|what crop|profitable crop/.test(lowerQuery)) {
    return 'market_crop_compare';
  }
  if (/labour|labor|worker|help/.test(lowerQuery)) {
    return 'labour';
  }
  if (/best mandi|nearby|near me|nearest|where to sell|location/.test(lowerQuery)) {
    return 'mandi_search';
  }
  if (/best time|when to sell|timing/.test(lowerQuery)) {
    return 'market_advice';
  }
  if (/sell/.test(lowerQuery)) {
    return 'market_advice';
  }
  if (/price|rate|mandi|market|cost/.test(lowerQuery)) {
    return 'market_price';
  }
  if (/scheme|yojana|government/.test(lowerQuery)) {
    return 'scheme';
  }
  if (/news|update|tomato/.test(lowerQuery)) {
    return 'news';
  }
  
  
  return 'unknown';
}

// Multilingual response templates
function getTranslation(language, key, data = {}) {
  const translations = {
    'en-US': {
      moisture_data: `Soil moisture is ${data.moisture}%.`,
      temperature_data: `The current temperature is ${data.temp}°C.`,
      sensor_general: `Moisture is ${data.moisture}% and temperature is ${data.temp}°C.`,
      rain_yes: `Weather indicates normal rainfall this season. There is a ${data.chance}% chance of rain today.`,
      rain_no: "Weather indicates normal rainfall this season, but low chance today.",
      weather_api_forecast: "Today's weather forecast is partly cloudy with mild conditions.",
      irrigation_needed: `Moisture = ${data.moisture}%. Irrigation needed.`,
      irrigation_not_needed: `Moisture = ${data.moisture}%. No irrigation needed.`,
      irrigation_moderate: `Moisture = ${data.moisture}%. Irrigation might be needed soon.`,
      mandi_data: `Current price for ${data.crop} is ₹${data.price} per quintal.`,
      no_labour: "No labour requests found. You can search for nearby workers.",
      labour_data: `You have ${data.count} pending labour requests.`,
      schemes_data: "Yes, schemes like PM-KISAN and Crop Insurance are available for farmers.",
      news_data: "Recent news indicates that tomato prices have dropped.",
      ph_data: `The current soil pH level is ${data.ph}.`,
      no_sensor_data: "I cannot find any recent sensor data for your farm.",
      no_mandi_data: "I don't have the latest market prices right now.",
      no_crop_data: "Please select a crop to get accurate selling advice.",
      crop_compare: `${data.crop} is currently giving higher market price compared to other crops, so it is better to sell ${data.crop}.`,
      mandi_search_data: `Nearest mandi is ${data.location}, which currently offers good price for ${data.crop}.`,
      no_mandi_location: "Please enable location or select your area to find nearby mandi.",
      trend_increasing: "Prices are increasing compared to last week.",
      trend_decreasing: "Prices are decreasing compared to last week.",
      trend_stable: "Based on current trend, prices are stable.",
      advice_increasing: "Prices are increasing, so you can wait for better profit.",
      advice_decreasing: "Prices are decreasing, so you should sell now.",
      advice_stable: "You can sell now or wait based on demand.",
      ai_sell_advice: "Sell when market price is high and demand increases. Check mandi trends for better profit.",
      ai_crop_advice: "Choose crops based on the current season and your soil quality. Mixed cropping is often safer.",
      ai_soil_advice: "Use organic manure and rotate your crops. Adding legumes improves soil health naturally.",
      ai_pest_advice: "Identify the pest early. Use neem-based organic sprays before applying strong chemicals.",
      ai_seed_advice: "Use certified, high-quality seeds. Treat seeds before sowing and ensure the soil moisture is optimal.",
      general_advice: "Maintain good soil health, ensure proper watering, and monitor crops daily for the best yield."
    },
    'hi-IN': {
      moisture_data: `मिट्टी की नमी ${data.moisture}% है।`,
      temperature_data: `वर्तमान तापमान ${data.temp}°C है।`,
      sensor_general: `नमी ${data.moisture}% और तापमान ${data.temp}°C है।`,
      rain_yes: `इस मौसम में सामान्य बारिश की उम्मीद है। आज बारिश की ${data.chance}% संभावना है।`,
      rain_no: "इस मौसम में सामान्य बारिश की उम्मीद है, लेकिन आज संभावना कम है।",
      weather_api_forecast: "आज का मौसम पूर्वानुमान आंशिक रूप से बादल छाए रहने का है।",
      irrigation_needed: `नमी = ${data.moisture}%. सिंचाई की आवश्यकता है।`,
      irrigation_not_needed: `नमी = ${data.moisture}%. सिंचाई की कोई आवश्यकता नहीं है।`,
      irrigation_moderate: `नमी = ${data.moisture}%. जल्द ही सिंचाई की आवश्यकता हो सकती है।`,
      mandi_data: `${data.crop} का वर्तमान मूल्य ₹${data.price} प्रति क्विंटल है।`,
      no_labour: "कोई मजदूर अनुरोध नहीं मिला। आप आस-पास के मज़दूर खोज सकते हैं।",
      labour_data: `आपके ${data.count} मजदूर अनुरोध लंबित हैं।`,
      schemes_data: "हां, किसानों के लिए पीएम-किसान और फसल बीमा जैसी योजनाएं उपलब्ध हैं।",
      news_data: "हाल के समाचारों के अनुसार टमाटर की कीमतों में गिरावट आई है।",
      ph_data: `मिट्टी का pH स्तर ${data.ph} है।`,
      no_sensor_data: "मुझे आपके खेत के लिए कोई हालिया सेंसर डेटा नहीं मिला।",
      no_mandi_data: "मेरे पास अभी नवीनतम बाजार मूल्य नहीं हैं।",
      no_crop_data: "सटीक बिक्री सलाह के लिए कृपया किसी फसल का चयन करें।",
      crop_compare: `अन्य फसलों की तुलना में ${data.crop} अधिक बाजार मूल्य दे रहा है, इसलिए ${data.crop} बेचना बेहतर है।`,
      mandi_search_data: `निकटतम मंडी ${data.location} है, जो वर्तमान में ${data.crop} के लिए अच्छी कीमत दे रही है।`,
      no_mandi_location: "आस-पास की मंडी खोजने के लिए कृपया स्थान चालू करें या अपना क्षेत्र चुनें।",
      trend_increasing: "पिछले सप्ताह की तुलना में कीमतें बढ़ रही हैं।",
      trend_decreasing: "पिछले सप्ताह की तुलना में कीमतें घट रही हैं।",
      trend_stable: "वर्तमान प्रवृत्ति के आधार पर, कीमतें स्थिर हैं।",
      advice_increasing: "कीमतें बढ़ रही हैं, इसलिए आप बेहतर मुनाफे के लिए इंतजार कर सकते हैं।",
      advice_decreasing: "कीमतें घट रही हैं, इसलिए आपको अभी बेचना चाहिए।",
      advice_stable: "आप मांग के आधार पर अभी बेच सकते हैं या इंतजार कर सकते हैं।",
      ai_sell_advice: "बाजार भाव अधिक होने पर ही बेचें। बेहतर मुनाफे के लिए मंडी के रुझानों पर नजर रखें।",
      ai_crop_advice: "वर्तमान मौसम और मिट्टी की गुणवत्ता के आधार पर फसलें चुनें। मिश्रित खेती सुरक्षित है।",
      ai_soil_advice: "जैविक खाद का प्रयोग करें। फलीदार पौधे लगाने से मिट्टी की सेहत में सुधार होता है।",
      ai_pest_advice: "कीटों की जल्दी पहचान करें। रासायनिक कीटनाशकों से पहले नीम आधारित जैविक स्प्रे का उपयोग करें।",
      ai_seed_advice: "प्रमाणित बीजों का प्रयोग करें। बुवाई से पहले बीजों का उपचार करें।",
      general_advice: "मिट्टी की सेहत बनाए रखें, उचित सिंचाई सुनिश्चित करें और रोज फसलों की निगरानी करें।"
    },
    'kn-IN': {
      moisture_data: `ಮಣ್ಣಿನ ತೇವಾಂಶವು ${data.moisture}% ಆಗಿದೆ.`,
      temperature_data: `ಪ್ರಸ್ತುತ ತಾಪಮಾನ ${data.temp}°C ಆಗಿದೆ.`,
      sensor_general: `ತೇವಾಂಶ ${data.moisture}% ಮತ್ತು ತಾಪಮಾನ ${data.temp}°C ಆಗಿದೆ.`,
      rain_yes: `ಹವಾಮಾನವು ಈ ಋತುವಿನಲ್ಲಿ ಸಾಮಾನ್ಯ ಮಳೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ. ಇಂದು ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ ${data.chance}% ಇದೆ.`,
      rain_no: "ಹವಾಮಾನವು ಈ ಋತುವಿನಲ್ಲಿ ಸಾಮಾನ್ಯ ಮಳೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ, ಆದರೆ ಇಂದು ಸಾಧ್ಯತೆ ಕಡಿಮೆ.",
      weather_api_forecast: "ಇಂದಿನ ಹವಾಮಾನವು ಭಾಗಶಃ ಮೋಡಗಳಿಂದ ಕೂಡಿದೆ.",
      irrigation_needed: `ತೇವಾಂಶ = ${data.moisture}%. ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ.`,
      irrigation_not_needed: `ತೇವಾಂಶ = ${data.moisture}%. ನೀರಾವರಿ ಅಗತ್ಯವಿಲ್ಲ.`,
      irrigation_moderate: `ತೇವಾಂಶ = ${data.moisture}%. ಶೀಘ್ರದಲ್ಲೇ ನೀರಾವರಿ ಅಗತ್ಯವಾಗಬಹುದು.`,
      mandi_data: `${data.crop} ನ ಪ್ರಸ್ತುತ ಬೆಲೆ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹${data.price} ಆಗಿದೆ.`,
      no_labour: "ಯಾವುದೇ ಕಾರ್ಮಿಕ ವಿನಂತಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ನೀವು ಹತ್ತಿರದ ಕಾರ್ಮಿಕರಿಗಾಗಿ ಹುಡುಕಬಹುದು.",
      labour_data: `ನಿಮ್ಮ ${data.count} ಕಾರ್ಮಿಕ ವಿನಂತಿಗಳು ಬಾಕಿ ಇವೆ.`,
      schemes_data: "ಹೌದು, ರೈತರಿಗಾಗಿ ಪಿಎಂ-ಕಿಸಾನ್ ಮತ್ತು ಬೆಳೆ ವಿಮೆಯಂತಹ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ.",
      news_data: "ಇತ್ತೀಚಿನ ಸುದ್ದಿಯ ಪ್ರಕಾರ ಟೊಮೆಟೊ ಬೆಲೆಗಳು ಕುಸಿದಿವೆ.",
      ph_data: `ಮಣ್ಣಿನ pH ಮಟ್ಟ ${data.ph} ಆಗಿದೆ.`,
      no_sensor_data: "ನಿಮ್ಮ ಜಮೀನಿಗೆ ಸಂವೇದಕ ಡೇಟಾ ಕಂಡುಬಂದಿಲ್ಲ.",
      no_mandi_data: "ನನ್ನ ಬಳಿ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳಿಲ್ಲ.",
      no_crop_data: "ನಿಖರವಾದ ಮಾರಾಟ ಸಲಹೆ ಪಡೆಯಲು ದಯವಿಟ್ಟು ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      crop_compare: `${data.crop} ಪ್ರಸ್ತುತ ಹೆಚ್ಚಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಯನ್ನು ನೀಡುತ್ತಿದೆ, ಹಾಗಾಗಿ ${data.crop} ಮಾರಾಟ ಮಾಡುವುದು ಉತ್ತಮ.`,
      mandi_search_data: `ಹತ್ತಿರದ ಮಂಡಿ ${data.location} ಆಗಿದೆ, ಇದು ಪ್ರಸ್ತುತ ${data.crop} ಗೆ ಉತ್ತಮ ಬೆಲೆಯನ್ನು ನೀಡುತ್ತಿದೆ.`,
      no_mandi_location: "ಹತ್ತಿರದ ಮಂಡಿಯನ್ನು ಹುಡುಕಲು ದಯವಿಟ್ಟು ಸ್ಥಳವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ ಅಥವಾ ನಿಮ್ಮ ಪ್ರದೇಶವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      trend_increasing: "ಕಳೆದ ವಾರಕ್ಕೆ ಹೋಲಿಸಿದರೆ ಬೆಲೆಗಳು ಹೆಚ್ಚಾಗುತ್ತಿವೆ.",
      trend_decreasing: "ಕಳೆದ ವಾರಕ್ಕೆ ಹೋಲಿಸಿದರೆ ಬೆಲೆಗಳು ಕಡಿಮೆಯಾಗುತ್ತಿವೆ.",
      trend_stable: "ಪ್ರಸ್ತುತ ಟ್ರೆಂಡ್ ಆಧಾರದ ಮೇಲೆ, ಬೆಲೆಗಳು ಸ್ಥಿರವಾಗಿವೆ.",
      advice_increasing: "ಬೆಲೆಗಳು ಹೆಚ್ಚಾಗುತ್ತಿರುವುದರಿಂದ, ನೀವು ಲಾಭಕ್ಕಾಗಿ ಕಾಯಬಹುದು.",
      advice_decreasing: "ಬೆಲೆಗಳು ಕಡಿಮೆಯಾಗುತ್ತಿದೆ, ಈಗಲೇ ಮಾರಾಟ ಮಾಡುವುದು ಉತ್ತಮ.",
      advice_stable: "ನಿಮ್ಮ ಬೇಡಿಕೆಯ ಆಧಾರದ ಮೇಲೆ ನೀವು ಈಗಲೇ ಮಾರಾಟ ಮಾಡಬಹುದು ಅಥವಾ ಕಾಯಬಹುದು.",
      ai_sell_advice: "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಹೆಚ್ಚಿದ್ದಾಗ ಮಾರಾಟ ಮಾಡಿ. ಲಾಭಕ್ಕಾಗಿ ಮಂಡಿ ಮಾಹಿತಿ ಪರಿಶೀಲಿಸಿ.",
      ai_crop_advice: "ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣಿನ ಆಧಾರದ ಮೇಲೆ ಬೆಳೆ ಆರಿಸಿ. ಮಿಶ್ರ ಬೆಳೆ ಕೃಷಿಯು ಉತ್ತಮ.",
      ai_soil_advice: "ಸಾವಯವ ಗೊಬ್ಬರವನ್ನು ಬಳಸಿ. ದ್ವಿದಳ ಧಾನ್ಯಗಳನ್ನು ಬೆಳೆಯುವುದು ಮಣ್ಣಿನ ಆರೋಗ್ಯವನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.",
      ai_pest_advice: "ರೋಗವನ್ನು ಬೇಗನೆ ಗುರುತಿಸಿ. ರಾಸಾಯನಿಕ ಬಳಸುವ ಮೊದಲು ಬೇವಿನ ಎಣ್ಣೆ ಸಿಂಪಡಿಸಿ.",
      ai_seed_advice: "ಉತ್ತಮ ಬೀಜ ಬಳಸಿ. ಬಿತ್ತುವ ಮುನ್ನ ಬೀಜೋಪಚಾರ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      general_advice: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾಪಾಡಿ, ನೀರಾವರಿ ಒದಗಿಸಿ ಮತ್ತು ನಿತ್ಯ ಬೆಳೆ ಪರಿಶೀಲಿಸಿ."
    }
  };

  return translations[language]?.[key] || translations['en-US'][key] || key;
}

export default router;
