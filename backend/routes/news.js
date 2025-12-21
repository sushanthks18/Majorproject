import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Karnataka Agricultural News Data - Dynamic with daily updates
const getKarnatakaAgriculturalNews = (language = 'en') => {
  const today = new Date();
  const dayOffset = today.getDate(); // Use day of month for variation
  
  // Helper to generate dynamic dates
  const getDaysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Dynamic price variations based on current date
  const getDynamicPrice = (basePrice, variation) => {
    const dayFactor = (dayOffset % 7) / 10; // 0-0.7 range
    return Math.round(basePrice * (1 + (dayFactor - 0.35) * variation));
  };
  
  const newsData = {
    en: [
      {
        title: `Karnataka Announces New Subsidy for Ragi Farmers`,
        description: `State government introduces ₹${5000 + dayOffset * 100}/hectare subsidy for ragi cultivation to promote nutritious millets. Scheme covers Bangalore Rural, Tumkur, and Mysore districts.`,
        category: 'government',
        source: 'Karnataka Agricultural Dept.',
        date: getDaysAgo(dayOffset % 3),
        link: 'https://krishimaratavahini.karnataka.gov.in/'
      },
      {
        title: 'Southwest Monsoon Expected to be Normal This Year',
        description: `IMD forecasts normal rainfall (${94 + dayOffset % 10}-${104 + dayOffset % 5}% of LPA) for Karnataka. Farmers advised to prepare for kharif sowing by June ${10 + dayOffset % 20}th.`,
        category: 'weather',
        source: 'IMD Bangalore',
        date: getDaysAgo(1),
        link: 'https://mausam.imd.gov.in/'
      },
      {
        title: `Cotton Prices ${dayOffset % 2 === 0 ? 'Surge' : 'Rise'} ${10 + dayOffset % 10}% at Hubli APMC`,
        description: `Medium staple cotton prices reach ₹${getDynamicPrice(7200, 0.15)}/quintal at Hubli market due to ${dayOffset % 2 === 0 ? 'strong' : 'steady'} demand. Experts predict prices to remain ${dayOffset % 3 === 0 ? 'stable' : 'firm'}.`,
        category: 'market',
        source: 'AGMARKNET',
        date: getDaysAgo(2 + dayOffset % 2),
        link: 'https://agmarknet.gov.in/'
      },
      {
        title: `${dayOffset % 2 === 0 ? 'Fall Armyworm' : 'Pest'} Alert: ${dayOffset % 3 === 0 ? 'Maize' : 'Corn'} Farmers Stay Vigilant`,
        description: `Agriculture department warns of ${dayOffset % 2 === 0 ? 'Fall Armyworm' : 'pest'} infestation in maize fields across Hassan and Mandya districts. Immediate control measures recommended. Updated ${today.toLocaleDateString()}.`,
        category: 'alerts',
        source: 'Dept. of Agriculture',
        date: getDaysAgo(0),
        link: 'https://raitamitra.karnataka.gov.in/'
      },
      {
        title: `PM-KISAN ${15 + dayOffset % 5}th Installment Released`,
        description: `₹2000 deposited directly to bank accounts of ${54 + dayOffset % 10} lakh farmers in Karnataka. Check your account status on PM-KISAN portal.`,
        category: 'government',
        source: 'Ministry of Agriculture',
        date: getDaysAgo(4 + dayOffset % 3),
        link: 'https://pmkisan.gov.in/'
      },
      {
        title: `Record ${dayOffset % 2 === 0 ? 'Pomegranate' : 'Fruit'} Harvest in Bagalkot District`,
        description: `Farmers in Bagalkot achieve ${20 + dayOffset % 10} tons/hectare yield with drip irrigation. District officials plan training programs for other farmers.`,
        category: 'crops',
        source: 'Horticulture Dept.',
        date: getDaysAgo(3 + dayOffset % 2),
        link: 'https://horticulture.karnataka.gov.in/'
      },
      {
        title: `Tomato Prices ${dayOffset % 2 === 0 ? 'Crash' : 'Drop'} to ₹${6 + dayOffset % 5}/kg at Bangalore APMC`,
        description: `${dayOffset % 2 === 0 ? 'Oversupply' : 'High production'} from Kolar region leads to price drop. Farmers advised to ${dayOffset % 3 === 0 ? 'store produce' : 'process into value-added products'}.`,
        category: 'market',
        source: 'Bangalore APMC',
        date: getDaysAgo(1 + dayOffset % 2),
        link: 'https://bangaloreapmcmarket.nic.in/'
      },
      {
        title: `Banana Market Sees ${dayOffset % 2 === 0 ? 'Strong' : 'Good'} Demand in Mysore`,
        description: `Nendran variety fetches ₹${getDynamicPrice(2200, 0.1)}/quintal at Mysore market. Demand from Kerala and Tamil Nadu boosts prices.`,
        category: 'market',
        source: 'Mysore APMC',
        date: getDaysAgo(3),
        link: 'https://agmarknet.gov.in/'
      }
    ],
    kn: [
      {
        title: 'ರಾಗಿ ರೈತರಿಗೆ ಹೊಸ ಸಬ್ಸಿಡಿ ಘೋಷಣೆ',
        description: 'ಪೌಷ್ಟಿಕ ಮಿಲೆಟ್ಸ್ ಬೆಳೆಯನ್ನು ಉತ್ತೇಜಿಸಲು ರಾಜ್ಯ ಸರ್ಕಾರ ರಾಗಿ ಬೆಳೆಗೆ ಹೆಕ್ಟೇರ್‌ಗೆ ₹5000 ಸಬ್ಸಿಡಿ ನೀಡಲಿದೆ. ಈ ಯೋಜನೆ ಬೆಂಗಳೂರು ಗ್ರಾಮೀಣ, ತುಮಕೂರು ಮತ್ತು ಮೈಸೂರು ಜಿಲ್ಲೆಗಳನ್ನು ಒಳಗೊಂಡಿದೆ.',
        category: 'government',
        source: 'ಕರ್ನಾಟಕ ಕೃಷಿ ಇಲಾಖೆ',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        link: 'https://krishimaratavahini.karnataka.gov.in/'
      },
      {
        title: 'ನೈಋತ್ಯ ಮಾನ್ಸೂನ್ ಸಾಮಾನ್ಯವಾಗಿರುವ ನಿರೀಕ್ಷೆ',
        description: 'ಕರ್ನಾಟಕಕ್ಕೆ ಸಾಮಾನ್ಯ ಮಳೆ (LPA ಯ 96-104%) ಎಂದು IMD ಮುನ್ಸೂಚನೆ. ರೈತರು ಜೂನ್ 15ರೊಳಗೆ ಖರೀಫ್ ಬಿತ್ತನೆಗೆ ತಯಾರಾಗಬೇಕು.',
        category: 'weather',
        source: 'IMD ಬೆಂಗಳೂರು',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        link: 'https://mausam.imd.gov.in/'
      },
      {
        title: 'ಹುಬ್ಬಳ್ಳಿ APMC ನಲ್ಲಿ ಹತ್ತಿ ಬೆಲೆ 15% ಏರಿಕೆ',
        description: 'ಬಲವಾದ ಬೇಡಿಕೆಯಿಂದಾಗಿ ಮಧ್ಯಮ ಗುಣಮಟ್ಟದ ಹತ್ತಿ ಬೆಲೆ ಹುಬ್ಬಳ್ಳಿ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹7,200 ತಲುಪಿದೆ. ಬೆಲೆಗಳು ಸ್ಥಿರವಾಗಿರುತ್ತವೆ ಎಂದು ತಜ್ಞರು ಮುನ್ಸೂಚನೆ.',
        category: 'market',
        source: 'AGMARKNET',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        link: 'https://agmarknet.gov.in/'
      },
      {
        title: 'ಎಚ್ಚರಿಕೆ: ಜೋಳ ರೈತರಿಗೆ ಫಾಲ್ ಆರ್ಮಿವರ್ಮ್ ಎಚ್ಚರಿಕೆ',
        description: 'ಹಾಸನ ಮತ್ತು ಮಂಡ್ಯ ಜಿಲ್ಲೆಗಳಲ್ಲಿ ಜೋಳ ಹೊಲಗಳಲ್ಲಿ ಫಾಲ್ ಆರ್ಮಿವರ್ಮ್ ಸೋಂಕಿನ ಬಗ್ಗೆ ಕೃಷಿ ಇಲಾಖೆ ಎಚ್ಚರಿಕೆ ನೀಡಿದೆ. ತಕ್ಷಣದ ನಿಯಂತ್ರಣ ಕ್ರಮಗಳನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.',
        category: 'alerts',
        source: 'ಕೃಷಿ ಇಲಾಖೆ',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        link: 'https://raitamitra.karnataka.gov.in/'
      },
      {
        title: 'PM-KISAN 16ನೇ ಕಂತು ಬಿಡುಗಡೆ',
        description: 'ಕರ್ನಾಟಕದ 54 ಲಕ್ಷ ರೈತರ ಬ್ಯಾಂಕ್ ಖಾತೆಗಳಿಗೆ ನೇರವಾಗಿ ₹2000 ಜಮೆ ಮಾಡಲಾಗಿದೆ. PM-KISAN ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಖಾತೆಯ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.',
        category: 'government',
        source: 'ಕೃಷಿ ಸಚಿವಾಲಯ',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        link: 'https://pmkisan.gov.in/'
      },
      {
        title: 'ಬಾಗಲಕೋಟೆಯಲ್ಲಿ ದಾಳಿಂಬೆ ದಾಖಲೆ ಇಳುವರಿ',
        description: 'ಬಾಗಲಕೋಟೆಯ ರೈತರು ಡ್ರಿಪ್ ನೀರಾವರಿಯಿಂದ ಹೆಕ್ಟೇರ್‌ಗೆ 25 ಟನ್ ಇಳುವರಿ ಸಾಧಿಸಿದ್ದಾರೆ. ಇತರ ರೈತರಿಗೆ ತರಬೇತಿ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಜಿಲ್ಲಾಧಿಕಾರಿಗಳು ಯೋಜಿಸುತ್ತಿದ್ದಾರೆ.',
        category: 'crops',
        source: 'ತೋಟಗಾರಿಕೆ ಇಲಾಖೆ',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        link: 'https://horticulture.karnataka.gov.in/'
      },
      {
        title: 'ಕಾಫಿ ಬೆಳೆಗಾರರಿಗೆ ಸಾವಯವ ಪ್ರಮಾಣೀಕರಣ',
        description: 'ಚಿಕ್ಕಮಗಳೂರು ಮತ್ತು ಕೊಡಗಿನ ಸಣ್ಣ ಬೆಳೆಗಾರರಿಗೆ ಕಾಫಿ ಬೋರ್ಡ್ ಉಚಿತ ಸಾವಯವ ಪ್ರಮಾಣೀಕರಣ ಕಾರ್ಯಕ್ರಮ ಪ್ರಾರಂಭಿಸಿದೆ. ಜೂನ್ 30ರವರೆಗೆ ನೋಂದಣಿ ಮುಕ್ತ.',
        category: 'government',
        source: 'ಕಾಫಿ ಬೋರ್ಡ್',
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        link: 'https://coffeeboard.gov.in/'
      },
      {
        title: 'ಬೆಂಗಳೂರು APMC ನಲ್ಲಿ ಟೊಮೇಟೊ ಬೆಲೆ ಕುಸಿತ',
        description: 'ಕೋಲಾರ ಪ್ರದೇಶದಿಂದ ಅಧಿಕ ಪೂರೈಕೆಯಿಂದ ಬೆಲೆ ಕೆಜಿಗೆ ₹8ಕ್ಕೆ ಇಳಿದಿದೆ. ರೈತರು ಉತ್ಪನ್ನವನ್ನು ಸಂಗ್ರಹಿಸಲು ಅಥವಾ ಮೌಲ್ಯವರ್ಧಿತ ಉತ್ಪನ್ನಗಳಾಗಿ ಸಂಸ್ಕರಿಸಲು ಸಲಹೆ.',
        category: 'market',
        source: 'ಬೆಂಗಳೂರು APMC',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        link: 'https://bangaloreapmcmarket.nic.in/'
      },
      {
        title: 'ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ನೋಂದಣಿಗೆ ಹೊಸ ಮೊಬೈಲ್ ಆ್ಯಪ್',
        description: 'ಕರ್ನಾಟಕ "mKrishi Soil Health" ಆ್ಯಪ್ ಅನ್ನು ಸುಲಭ ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮತ್ತು ಗೊಬ್ಬರ ಶಿಫಾರಸುಗಳಿಗಾಗಿ ಪ್ರಾರಂಭಿಸಿದೆ. ಕನ್ನಡ ಮತ್ತು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಲಭ್ಯವಿದೆ.',
        category: 'government',
        source: 'ರಾಜ್ಯ ಸರ್ಕಾರ',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        link: 'https://raitamitra.karnataka.gov.in/'
      },
      {
        title: 'ಭತ್ತ ರೈತರಿಗೆ ಬ್ಲಾಸ್ಟ್ ರೋಗ ಎಚ್ಚರಿಕೆ',
        description: 'ಕರಾವಳಿ ಮತ್ತು ಮಲೆನಾಡು ಪ್ರದೇಶಗಳಲ್ಲಿ ಹೆಚ್ಚಿನ ಆರ್ದ್ರತೆಯು ರೈಸ್ ಬ್ಲಾಸ್ಟ್ ರೋಗಕ್ಕೆ ಅನುಕೂಲವಾಗಿದೆ. ಟಿಲ್ಲರಿಂಗ್ ಹಂತದಲ್ಲಿ ತಡೆಗಟ್ಟುವ ಸಿಂಪಡಣೆ ಶಿಫಾರಸು.',
        category: 'alerts',
        source: 'ICAR-IARI',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        link: 'https://krishimaratavahini.karnataka.gov.in/'
      },
      {
        title: 'ಮೈಸೂರಿನಲ್ಲಿ ಬಾಳೆಹಣ್ಣಿಗೆ ಬಲವಾದ ಬೇಡಿಕೆ',
        description: 'ನೇಂದ್ರನ್ ತಳಿ ಮೈಸೂರು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹2,200 ಗಳಿಸುತ್ತಿದೆ. ಕೇರಳ ಮತ್ತು ತಮಿಳುನಾಡಿನಿಂದ ಬೇಡಿಕೆ ಬೆಲೆಗಳನ್ನು ಹೆಚ್ಚಿಸುತ್ತಿದೆ.',
        category: 'market',
        source: 'ಮೈಸೂರು APMC',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        link: 'https://agmarknet.gov.in/'
      },
      {
        title: 'ಡ್ರಿಪ್ ನೀರಾವರಿ ಸಬ್ಸಿಡಿ ಮಾರ್ಚ್ 2026 ವರೆಗೆ ವಿಸ್ತರಣೆ',
        description: 'ಸಣ್ಣ ರೈತರಿಗೆ (2 ಹೆಕ್ಟೇರ್ ವರೆಗೆ) ಡ್ರಿಪ್ ನೀರಾವರಿ ವ್ಯವಸ್ಥೆಗಳಿಗೆ 90% ಸಬ್ಸಿಡಿಯನ್ನು ರಾಜ್ಯ ವಿಸ್ತರಿಸಿದೆ. ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಗಳ ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.',
        category: 'government',
        source: 'ಜಲಸಂಪನ್ಮೂಲ ಇಲಾಖೆ',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        link: 'https://raitamitra.karnataka.gov.in/'
      }
    ]
  };
  
  return newsData[language] || newsData.en;
};

// Get agricultural news
router.get('/agricultural', authenticate, async (req, res) => {
  try {
    const { category, language = 'en' } = req.query;
    
    let news = getKarnatakaAgriculturalNews(language);
    
    // Filter by category if provided
    if (category && category !== 'all') {
      news = news.filter(item => item.category === category);
    }
    
    // Sort by date (newest first)
    news.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      news,
      count: news.length,
      language,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get news by category
router.get('/category/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    
    const allNews = getKarnatakaAgriculturalNews();
    const filteredNews = allNews.filter(item => item.category === category);
    
    res.json({
      success: true,
      category,
      news: filteredNews,
      count: filteredNews.length
    });
  } catch (error) {
    console.error('Error fetching category news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export default router;
