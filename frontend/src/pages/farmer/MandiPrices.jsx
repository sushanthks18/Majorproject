import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { TrendingUp, TrendingDown, Calendar, MapPin, DollarSign, AlertCircle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/helpers';

const MandiPrices = () => {
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [days, setDays] = useState(30);
  const [priceData, setPriceData] = useState(null);
  const [locations, setLocations] = useState([]);

  const crops = ['Rice', 'Wheat', 'Cotton', 'Maize', 'Sugarcane', 'Mixed Vegetables'];

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedCrop) {
      fetchPriceTrends();
    }
  }, [selectedCrop, selectedLocation, days]);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/mandi/locations');
      setLocations(response.data.locations);
      if (response.data.locations.length > 0) {
        setSelectedLocation(response.data.locations[0]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchPriceTrends = async () => {
    try {
      setLoading(true);
      const params = { days };
      if (selectedLocation) {
        params.location = selectedLocation;
      }
      
      const response = await api.get(`/mandi/trends/${selectedCrop}`, { params });
      setPriceData(response.data);
    } catch (error) {
      toast.error('Failed to fetch mandi prices');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    if (!priceData || !priceData.prices) return [];
    
    return priceData.prices.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      price: p.price,
      minPrice: p.minPrice,
      maxPrice: p.maxPrice
    }));
  };

  const getTrendIcon = () => {
    if (!priceData) return null;
    return priceData.statistics.trend === 'increasing' ? (
      <TrendingUp className="w-6 h-6 text-green-600" />
    ) : priceData.statistics.trend === 'decreasing' ? (
      <TrendingDown className="w-6 h-6 text-red-600" />
    ) : (
      <TrendingUp className="w-6 h-6 text-gray-600" />
    );
  };

  const getTrendColor = () => {
    if (!priceData) return 'text-gray-600';
    return priceData.statistics.trend === 'increasing' ? 'text-green-600' : 
           priceData.statistics.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Mandi Price Trends</h1>
          <p className="text-gray-600">Check market prices and get selling recommendations</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Crop</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {crops.map(crop => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mandi Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={7}>Last 7 days</option>
                <option value={15}>Last 15 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <Loading message="Fetching mandi prices..." />
        ) : priceData ? (
          <>
            {/* Best Selling Day Recommendation */}
            {priceData.prediction && (
              <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-600 rounded-lg">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Best Time to Sell</h3>
                    <p className="text-2xl font-bold text-green-600 mb-2">
                      {priceData.prediction.recommendation}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Current Price</p>
                        <p className="text-lg font-bold text-gray-800">
                          {formatCurrency(priceData.prediction.currentPrice)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Expected Price</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(priceData.prediction.expectedPrice)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Confidence</p>
                        <p className="text-lg font-bold text-blue-600">
                          {priceData.prediction.confidence}%
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Action</p>
                        <p className="text-lg font-bold text-purple-600">
                          {priceData.prediction.daysToWait}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Price</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(priceData.statistics.current)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average Price</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(priceData.statistics.average)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Highest</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(priceData.statistics.highest)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lowest</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(priceData.statistics.lowest)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </Card>
            </div>

            {/* Price Trend */}
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Price Trend</h3>
                <div className="flex items-center gap-2">
                  {getTrendIcon()}
                  <span className={`font-semibold ${getTrendColor()}`}>
                    {priceData.statistics.trend.toUpperCase()}
                    {priceData.statistics.trendPercentage !== 0 && 
                      ` (${priceData.statistics.trendPercentage > 0 ? '+' : ''}${priceData.statistics.trendPercentage}%)`
                    }
                  </span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={formatChartData()}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorPrice)"
                    name="Price (₹/quintal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Min-Max Price Range */}
            <Card>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Price Range (Min-Max)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="maxPrice" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Max Price"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Market Price"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="minPrice" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Min Price"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Info Box */}
            <Card className="mt-6 bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">About Mandi Prices</h4>
                  <p className="text-sm text-gray-700">
                    Prices are based on real-time market data from nearby agricultural markets (mandis). 
                    The recommendation is calculated using historical price patterns, seasonal trends, and market analysis. 
                    For best results, monitor prices regularly and consult with local traders before making selling decisions.
                  </p>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card>
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No data available</h3>
              <p className="text-gray-600">Select a crop and location to view price trends</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MandiPrices;
