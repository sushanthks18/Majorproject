import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { User, Mail, Phone, MapPin, Camera, Save } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: {
      address: '',
      lat: 0,
      lng: 0
    },
    profilePic: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || { address: '', lat: 0, lng: 0 },
        profilePic: user.profilePic || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'address') {
      setProfileData(prev => ({
        ...prev,
        location: { ...prev.location, address: value }
      }));
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, profilePic: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      // API call to update profile would go here
      console.log('Saving profile:', profileData);
      setIsEditing(false);
      // Show success message
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">My Profile</h1>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden">
                  {profileData.profilePic ? (
                    <img 
                      src={profileData.profilePic} 
                      alt={profileData.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-5xl font-bold text-white">
                      {profileData.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full cursor-pointer hover:bg-green-700 transition">
                    <Camera className="w-5 h-5" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePicChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mt-4">{profileData.name}</h2>
              <p className="text-sm text-gray-500 capitalize">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full mt-2">
                  Farmer
                </span>
              </p>
            </div>

            {/* Profile Information */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  name="address"
                  value={profileData.location?.address || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your address"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="bg-white rounded-xl shadow-md mt-6 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Account Type</p>
              <p className="font-medium text-gray-800">Farmer Account</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="font-medium text-gray-800">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
