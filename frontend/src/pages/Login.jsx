import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  Sprout, Users, Phone, Lock, ArrowRight, ShieldCheck, 
  RotateCcw, Sparkles, CheckCircle2, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login, sendOtp, verifyOtp } = useAuth();
  const { t, isKannada } = useLanguage();

  // Role state: 'farmer' or 'agent' (labour)
  const [role, setRole] = useState('farmer');

  // Login mode: 'otp' or 'password'
  const [loginMode, setLoginMode] = useState('otp');

  // OTP flow state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Password flow state
  const [passwordData, setPasswordData] = useState({
    identifier: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Clean and format phone number (numbers only, max 10 digits)
  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 10) {
      setPhone(raw);
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (phone.length !== 10) {
      toast.error(t('enterMobile') || 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(phone, role);
      if (res.success) {
        setOtpSent(true);
        setCountdown(30);
        if (res.otp) {
          setDemoOtp(res.otp);
        }
        toast.success(`${t('otpSentTo') || 'OTP sent to'} +91 ${phone}`);
      } else {
        toast.error(res.error || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Network error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error('Please enter the verification OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(phone, otp, role);
      if (res.success) {
        toast.success(t('loginSuccessful') || 'Login successful!');
        setTimeout(() => {
          navigate(role === 'farmer' ? '/farmer/dashboard' : '/agent/dashboard', { replace: true });
        }, 150);
      } else {
        toast.error(res.error || 'Invalid OTP');
        setLoading(false);
      }
    } catch (err) {
      toast.error('Verification failed');
      setLoading(false);
    }
  };

  // Password Login Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.identifier || !passwordData.password) {
      toast.error('Please enter your mobile/email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await login(passwordData.identifier, passwordData.password, role);
      if (res.success) {
        toast.success(t('loginSuccessful') || 'Login successful!');
        setTimeout(() => {
          navigate(role === 'farmer' ? '/farmer/dashboard' : '/agent/dashboard', { replace: true });
        }, 150);
      } else {
        toast.error(res.error || t('loginFailed') || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      toast.error('Login error');
      setLoading(false);
    }
  };

  const isFarmer = role === 'farmer';

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2000&q=80')`
      }}
    >
      {/* Agriculture Nature Backdrop Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-black/60 to-emerald-950/85 backdrop-blur-[2px]" />

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8 overflow-hidden">
        
        {/* Top Header & Language Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-emerald-600 to-green-500 text-white p-2.5 rounded-2xl shadow-md shadow-emerald-500/30">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-1.5">
                {t('appName')}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  IoT Farm
                </span>
              </h1>
              <p className="text-xs text-emerald-700 font-medium">
                {t('tagline')}
              </p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Role Separation Selector: Farmer vs Labour */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {isKannada ? 'ಖಾತೆ ಪ್ರಕಾರ ಆಯ್ಕೆಮಾಡಿ' : 'Select Account Type'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Farmer Option */}
            <button
              type="button"
              onClick={() => {
                setRole('farmer');
                setOtpSent(false);
                setOtp('');
              }}
              className={`p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between relative ${
                isFarmer
                  ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-gray-200 bg-gray-50/60 text-gray-600 hover:bg-gray-100/80'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-2xl">👨‍🌾</span>
                {isFarmer && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">{t('farmer')}</p>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{t('farmerDesc')}</p>
              </div>
            </button>

            {/* Labour / Agent Option */}
            <button
              type="button"
              onClick={() => {
                setRole('agent');
                setOtpSent(false);
                setOtp('');
              }}
              className={`p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between relative ${
                !isFarmer
                  ? 'border-blue-600 bg-blue-50/90 text-blue-950 shadow-md ring-2 ring-blue-500/20'
                  : 'border-gray-200 bg-gray-50/60 text-gray-600 hover:bg-gray-100/80'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-2xl">👷</span>
                {!isFarmer && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">{t('labourAgent')}</p>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{t('labourDesc')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Mode Forms (OTP vs Password) */}
        <div className="mt-6">
          {loginMode === 'otp' ? (
            /* =================== OTP LOGIN FLOW =================== */
            <div>
              {!otpSent ? (
                /* Step 1: Enter Phone Number */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>{t('mobileNumber')}</span>
                      <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {isKannada ? '10 ಅಂಕಿಗಳು' : '10-digit number'}
                      </span>
                    </label>
                    <div className="relative flex rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent overflow-hidden shadow-sm bg-white">
                      <div className="flex items-center gap-1.5 bg-gray-50 border-r border-gray-200 px-3.5 text-gray-600 font-semibold text-sm select-none">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="98765 43210"
                        className="w-full px-4 py-3 text-base font-semibold tracking-wider text-gray-900 focus:outline-none placeholder-gray-400"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                      isFarmer 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('sendingOtp')}</span>
                      </div>
                    ) : (
                      <>
                        <span>{t('sendOtp')}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter OTP */
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{t('otpSentTo')}: <strong>+91 {phone}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                      }}
                      className="text-emerald-700 font-bold underline hover:text-emerald-900"
                    >
                      {t('changeMobile')}
                    </button>
                  </div>

                  {/* Demo OTP Helper Pill */}
                  {demoOtp && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>{t('demoOtpNotice')}: <strong>{demoOtp}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtp(demoOtp)}
                        className="bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded text-[11px] font-bold text-amber-950 transition"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('enterOtp')}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {countdown > 0 ? (
                        `${t('resendIn')} ${countdown}s`
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {t('resendOtp')}
                        </button>
                      )}
                    </span>
                    <span className="text-gray-400">Master code: 123456</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 4}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                      isFarmer 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('verifyingOtp')}</span>
                      </div>
                    ) : (
                      <>
                        <span>{t('verifyOtp')}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* =================== PASSWORD LOGIN FLOW =================== */
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {isKannada ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಥವಾ ಇಮೇಲ್' : 'Mobile Number or Email'}
                </label>
                <input
                  type="text"
                  name="identifier"
                  value={passwordData.identifier}
                  onChange={(e) => setPasswordData({ ...passwordData, identifier: e.target.value })}
                  placeholder={isFarmer ? '9876543210 or farmer@example.com' : '9876543210 or agent@example.com'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isFarmer 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                } disabled:opacity-50`}
              >
                {loading ? t('loggingIn') : t('login')}
              </button>
            </form>
          )}

          {/* Toggle Between OTP and Password Mode */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setLoginMode(loginMode === 'otp' ? 'password' : 'otp');
                setOtpSent(false);
              }}
              className="text-gray-600 hover:text-emerald-700 font-semibold underline transition"
            >
              {loginMode === 'otp' ? t('usePassword') : t('useOtp')}
            </button>

            <Link
              to="/signup"
              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
            >
              {t('signUp')} ➜
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
