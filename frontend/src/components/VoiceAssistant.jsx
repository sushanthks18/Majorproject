import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, MessageCircle, Loader } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Force load voices to be available quickly
    if (synthRef.current.getVoices().length === 0) {
      synthRef.current.addEventListener('voiceschanged', () => {
        console.log('Voices loaded');
      });
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Simple single-shot mode
      recognitionRef.current.interimResults = false; // Only final result
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcriptText = event.results[0][0].transcript;
        handleVoiceCommand(transcriptText);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable microphone permissions.');
        } else if (event.error !== 'no-speech') {
          toast.error('Error with speech recognition. Try again.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      synthRef.current.cancel();
    };
  }, []);

  const switchLanguage = (lang) => {
    setCurrentLanguage(lang);
    toast.success(`Language switched to ${lang === 'en-US' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Kannada'}`, { icon: '🌐' });
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = currentLanguage;
      recognitionRef.current.start();
    } else {
      toast.error('Voice recognition not supported in this browser');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const detectLanguage = (text) => {
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    return 'en-US';
  };

  const speak = (text, language = 'en-US') => {
    if (!text) return;
    synthRef.current.cancel();
    
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        
        const voices = synthRef.current.getVoices();
        let selectedVoice = null;
        
        if (language === 'hi-IN') {
          selectedVoice = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
        } else if (language === 'kn-IN') {
          selectedVoice = voices.find(v => v.lang.includes('kn') || v.name.toLowerCase().includes('kannada'));
        } else {
          selectedVoice = voices.find(v => v.lang.includes('en'));
        }
        
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
      } catch (error) {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
      }
    }, 50);
  };

  const stopSpeaking = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  const clearConversation = () => {
    setConversationHistory([]);
  };

  const handleVoiceCommand = async (text) => {
    setLoading(true);
    const detectedLanguage = detectLanguage(text);
    
    const userMessage = { type: 'user', text, timestamp: new Date() };
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const result = await api.post('/assistant/query', {
        query: text,
        language: detectedLanguage
      });

      const assistantResponse = result.data.response;
      const responseLanguage = result.data.language || detectedLanguage;

      if (result.data.actions && result.data.actions.length > 0) {
        result.data.actions.forEach(action => {
          if (action === 'switch_en') switchLanguage('en-US');
          if (action === 'switch_hi') switchLanguage('hi-IN');
          if (action === 'switch_kn') switchLanguage('kn-IN');
        });
      }

      setConversationHistory(prev => [...prev, { type: 'assistant', text: assistantResponse, timestamp: new Date() }]);
      speak(assistantResponse, responseLanguage);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMsg = 'Sorry, I could not connect to the server right now.';
      setConversationHistory(prev => [...prev, { type: 'assistant', text: errorMsg, timestamp: new Date() }]);
      speak(errorMsg, 'en-US');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border-2 border-green-200 flex flex-col h-[500px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                <div>
                  <h3 className="font-bold">Krishi Voice Assistant</h3>
                  <p className="text-xs opacity-90">Simple click-to-speak interface</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Language Selector */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => switchLanguage('en-US')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${currentLanguage === 'en-US' ? 'bg-white text-green-600' : 'bg-white/30 hover:bg-white/40'}`}>🇬🇧 English</button>
              <button onClick={() => switchLanguage('hi-IN')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${currentLanguage === 'hi-IN' ? 'bg-white text-green-600' : 'bg-white/30 hover:bg-white/40'}`}>🇮🇳 हिंदी</button>
              <button onClick={() => switchLanguage('kn-IN')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${currentLanguage === 'kn-IN' ? 'bg-white text-green-600' : 'bg-white/30 hover:bg-white/40'}`}>🇮🇳 ಕನ್ನಡ</button>
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3 flex flex-col-reverse">
            <div className="space-y-3">
              {conversationHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Mic className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Click the microphone to start speaking.</p>
                  <p className="text-xs mt-2">Example: "Soil moisture?" or "Temperature?"</p>
                </div>
              ) : (
                conversationHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${msg.type === 'user' ? 'bg-green-500 text-white rounded-br-none' : 'bg-white text-gray-800 shadow-md rounded-bl-none border'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl shadow-md rounded-bl-none inline-block">
                    <Loader className="w-5 h-5 animate-spin text-green-500" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 bg-white border-t shrink-0">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={loading || isSpeaking}
                className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-white transition ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500 hover:bg-green-600'} disabled:opacity-50`}
              >
                {isListening ? <><MicOff className="w-5 h-5" /> Stop / Analyzing...</> : <><Mic className="w-5 h-5" /> Click to Speak</>}
              </button>

              {isSpeaking && (
                <button onClick={stopSpeaking} className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition">
                  <Volume2 className="w-5 h-5" />
                </button>
              )}

              {conversationHistory.length > 0 && (
                <button onClick={clearConversation} className="p-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition text-sm">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
