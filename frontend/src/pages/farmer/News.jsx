import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Newspaper, Calendar, ExternalLink, Globe, TrendingUp, Sprout, CloudRain, DollarSign, AlertTriangle, Info } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const News = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All News', icon: Newspaper },
    { id: 'market', label: 'Market Updates', icon: TrendingUp },
    { id: 'weather', label: 'Weather & Climate', icon: CloudRain },
    { id: 'crops', label: 'Crop Updates', icon: Sprout },
    { id: 'government', label: 'Government Schemes', icon: Info },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
  ];

  useEffect(() => {
    fetchNews();
  }, [language]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/news/agricultural?language=${language}`);
      setNews(response.data.news || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Failed to load agricultural news');
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(item => item.category === selectedCategory);

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : Newspaper;
  };

  const getCategoryColor = (category) => {
    const colors = {
      market: 'bg-blue-100 text-blue-700',
      weather: 'bg-sky-100 text-sky-700',
      crops: 'bg-green-100 text-green-700',
      government: 'bg-purple-100 text-purple-700',
      alerts: 'bg-red-100 text-red-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-green-600" />
            Agricultural News
          </h1>
          <p className="text-gray-600">Stay updated with latest agricultural news and updates for Karnataka</p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  selectedCategory === cat.id
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* News Grid */}
        {filteredNews.length === 0 ? (
          <Card className="py-12 text-center">
            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No news available</p>
            <p className="text-gray-400 text-sm mt-2">Check back later for updates</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((item, index) => {
              const Icon = getCategoryIcon(item.category);
              return (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-all cursor-pointer group"
                >
                  {/* Category Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getCategoryColor(item.category)}`}>
                      <Icon className="w-3 h-3" />
                      {categories.find(c => c.id === item.category)?.label || 'News'}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-green-600 transition line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {item.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {item.source || 'Agricultural Dept.'}
                    </span>
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>

                  {/* Read More */}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      {language === 'kn' ? 'ಹೆಚ್ಚು ಓದಿ' : 'Read More'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default News;
