import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, MessageCircle, Loader, Power, PowerOff } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US'); // Track current language
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isAlwaysListening, setIsAlwaysListening] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [listeningForCommand, setListeningForCommand] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const wakeWordTimerRef = useRef(null);

  useEffect(() => {
    // Load voices for speech synthesis
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      console.log('Available voices:', voices.length);
      console.log('Hindi voices:', voices.filter(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi')));
    };
    
    // Voices might not be loaded immediately
    if (synthRef.current.getVoices().length > 0) {
      loadVoices();
    } else {
      synthRef.current.addEventListener('voiceschanged', loadVoices);
    }
    
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Keep listening continuously
      recognitionRef.current.interimResults = true;
      
      // Start with English, will switch based on detection
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript.toLowerCase();
        setTranscript(transcriptText);
        
        // Debug logging
        if (isAlwaysListening) {
          console.log('Heard:', transcriptText, '| Listening for command:', listeningForCommand);
        }
        
        // Check for wake word "Bhoovan" or variations
        if (isAlwaysListening && !listeningForCommand) {
          const hasWakeWord = 
            transcriptText.includes('bhoovan') || 
            transcriptText.includes('भूवन') || 
            transcriptText.includes('bhovan') ||
            transcriptText.includes('boowan') ||
            transcriptText.includes('hey bhoovan') ||
            transcriptText.includes('ok bhoovan') ||
            transcriptText.includes('hello bhoovan') ||
            transcriptText.includes('hi bhoovan') ||
            /\bbhoovan\b/.test(transcriptText) ||
            /\bbhovan\b/.test(transcriptText);
          
          if (hasWakeWord) {
            
            setWakeWordDetected(true);
            setListeningForCommand(true);
            
            // Play wake sound and show visual feedback
            playWakeSound();
            toast.success('Yes, how can I help you?', {
              icon: '👂',
              duration: 2000
            });
            
            // Speak acknowledgment
            speak('Yes, I am listening. How can I help you?', 'en-US');
            
            // Clear transcript for next command
            setTimeout(() => {
              setTranscript('');
            }, 500);
            
            // Auto-reset after 10 seconds if no command
            wakeWordTimerRef.current = setTimeout(() => {
              if (listeningForCommand) {
                setListeningForCommand(false);
                setWakeWordDetected(false);
                speak('I did not hear anything. Say Bhoovan when you need me.', 'en-US');
              }
            }, 10000);
          }
        }
        
        // Process command after wake word
        if (event.results[current].isFinal && listeningForCommand) {
          clearTimeout(wakeWordTimerRef.current);
          
          // Clean the transcript - remove wake word variations
          let cleanedCommand = transcriptText
            .replace(/hey bhoovan/gi, '')
            .replace(/ok bhoovan/gi, '')
            .replace(/hello bhoovan/gi, '')
            .replace(/hi bhoovan/gi, '')
            .replace(/bhoovan/gi, '')
            .replace(/bhovan/gi, '')
            .replace(/boowan/gi, '')
            .replace(/भूवन/gi, '')
            .trim();
          
          console.log('Command detected:', cleanedCommand);
          
          // Process if there's actual content after removing wake word
          if (cleanedCommand.length > 2) {
            setListeningForCommand(false);
            setWakeWordDetected(false);
            handleVoiceCommand(cleanedCommand);
          }
        }
        
        // Manual mode (button press)
        if (!isAlwaysListening && event.results[current].isFinal) {
          handleVoiceCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast.error('Microphone access denied. Please enable microphone permissions.');
            setIsAlwaysListening(false);
          }
        }
        
        // Restart if in always-listening mode
        if (isAlwaysListening && event.error !== 'aborted') {
          setTimeout(() => {
            if (recognitionRef.current && isAlwaysListening) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Recognition already started');
              }
            }
          }, 1000);
        }
      };

      recognitionRef.current.onend = () => {
        // Restart if in always-listening mode
        if (isAlwaysListening) {
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Recognition already started');
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
      if (wakeWordTimerRef.current) {
        clearTimeout(wakeWordTimerRef.current);
      }
    };
  }, [isAlwaysListening, listeningForCommand]);

  const toggleAlwaysListening = () => {
    if (!isAlwaysListening) {
      // Start always-listening mode
      setIsAlwaysListening(true);
      setIsOpen(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          toast.success('Bhoovan is now listening! Say "Bhoovan" to activate.', {
            icon: '🎤',
            duration: 4000
          });
          speak('Hello! I am Bhoovan, your farming assistant. Say Bhoovan when you need help.', 'en-US');
        } catch (e) {
          console.log('Recognition already started');
        }
      }
    } else {
      // Stop always-listening mode
      setIsAlwaysListening(false);
      setListeningForCommand(false);
      setWakeWordDetected(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      toast('Bhoovan is sleeping. Click to wake up.', {
        icon: '😴'
      });
    }
  };

  const playWakeSound = () => {
    // Play a short beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };
  
  const switchLanguage = (lang) => {
    setCurrentLanguage(lang);
    if (recognitionRef.current) {
      const wasListening = isListening;
      if (wasListening) {
        recognitionRef.current.stop();
      }
      recognitionRef.current.lang = lang;
      if (wasListening) {
        setTimeout(() => {
          recognitionRef.current.start();
        }, 100);
      }
    }
    const langName = lang === 'en-US' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Kannada';
    toast.success(`Language switched to ${langName}`, { icon: '🌐' });
    console.log('Switched to language:', lang);
  };

  const startListening = () => {
    if (recognitionRef.current && !isAlwaysListening) {
      setTranscript('');
      setResponse('');
      recognitionRef.current.start();
    } else {
      toast.error('Voice recognition not supported in this browser');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && !isAlwaysListening) {
      recognitionRef.current.stop();
    }
  };

  const handleVoiceCommand = async (text) => {
    setLoading(true);
    
    try {
      // Detect language from input
      const detectedLanguage = detectLanguage(text);
      
      // Add to conversation history
      const userMessage = {
        type: 'user',
        text: text,
        timestamp: new Date()
      };
      setConversationHistory(prev => [...prev, userMessage]);

      // Send to AI backend
      const result = await api.post('/assistant/query', {
        query: text,
        language: detectedLanguage
      });

      const assistantResponse = result.data.response;
      setResponse(assistantResponse);

      // Add assistant response to history
      const assistantMessage = {
        type: 'assistant',
        text: assistantResponse,
        timestamp: new Date()
      };
      setConversationHistory(prev => [...prev, assistantMessage]);

      // Speak the response in the SAME language as the query
      const responseLanguage = result.data.language || detectedLanguage;
      speak(assistantResponse, responseLanguage);
      
    } catch (error) {
      console.error('Error processing voice command:', error);
      const errorMsg = 'Sorry, I could not process your request. Please try again.';
      setResponse(errorMsg);
      speak(errorMsg, 'en-US');
    } finally {
      setLoading(false);
    }
  };

  const detectLanguage = (text) => {
    // Simple language detection based on character sets
    const hindiPattern = /[\u0900-\u097F]/;
    const kannadaPattern = /[\u0C80-\u0CFF]/;
    const teluguPattern = /[\u0C00-\u0C7F]/;
    const tamilPattern = /[\u0B80-\u0BFF]/;
    const marathiPattern = /[\u0900-\u097F]/;

    if (hindiPattern.test(text)) return 'hi-IN';
    if (kannadaPattern.test(text)) return 'kn-IN';
    if (teluguPattern.test(text)) return 'te-IN';
    if (tamilPattern.test(text)) return 'ta-IN';
    if (marathiPattern.test(text)) return 'mr-IN';
    
    return 'en-US'; // Default to English
  };

  const speak = (text, language = 'en-US') => {
    if (!text || text.trim().length === 0) {
      console.warn('⚠️ No text to speak');
      return;
    }
    
    console.log('📢 Attempting to speak:', { text: text.substring(0, 50), language });
    
    // Cancel any ongoing speech
    try {
      synthRef.current.cancel();
    } catch (e) {
      console.error('Error canceling speech:', e);
    }
    
    // Wait for cancel to complete, then speak
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Get voices - ensure they're loaded
        let voices = synthRef.current.getVoices();
        
        // If voices not loaded, wait and try again
        if (voices.length === 0) {
          console.warn('Voices not loaded, waiting...');
          synthRef.current.addEventListener('voiceschanged', () => {
            voices = synthRef.current.getVoices();
            console.log('Voices loaded:', voices.length);
          });
        }
        
        let selectedVoice = null;
        
        // Select voice based on language
        if (language === 'hi-IN') {
          // Hindi voice
          selectedVoice = voices.find(v => 
            v.lang === 'hi-IN' || 
            v.lang.startsWith('hi') || 
            v.name.toLowerCase().includes('hindi') ||
            v.name.toLowerCase().includes('lekha')
          );
          console.log('🇮🇳 Hindi voice:', selectedVoice?.name || 'default');
        } else if (language === 'kn-IN') {
          // Kannada voice
          selectedVoice = voices.find(v => 
            v.lang === 'kn-IN' || 
            v.lang.startsWith('kn') || 
            v.name.toLowerCase().includes('kannada')
          );
          console.log('🇮🇳 Kannada voice:', selectedVoice?.name || 'default');
        } else {
          // English voice
          selectedVoice = voices.find(v => 
            v.lang === 'en-US' || 
            v.lang === 'en-GB' ||
            v.lang.startsWith('en')
          );
          console.log('🇬🇧 English voice:', selectedVoice?.name || 'default');
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        } else {
          console.warn(`No specific voice for ${language}, using default`);
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          console.log(`🔊 SPEAKING NOW in ${language}:`, text.substring(0, 100));
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
          console.log('✅ Speech completed successfully');
        };
        
        utterance.onerror = (e) => {
          console.error('❌ Speech error:', e.error);
          console.error('Error details:', e);
          setIsSpeaking(false);
          
          // Don't retry - just log
          if (e.error === 'not-allowed') {
            toast.error('Please allow audio permissions in browser settings');
          } else if (e.error === 'network') {
            toast.error('Network error - speech failed');
          }
        };

        // Speak immediately
        console.log('🎤 Calling synthRef.current.speak()...');
        synthRef.current.speak(utterance);
        
        // Double-check if speaking started
        setTimeout(() => {
          if (!synthRef.current.speaking) {
            console.error('❌ Speech did not start!');
            console.log('Pending:', synthRef.current.pending);
            console.log('Paused:', synthRef.current.paused);
          } else {
            console.log('✅ Speech is active');
          }
        }, 200);
        
      } catch (error) {
        console.error('💥 Speech synthesis error:', error);
        setIsSpeaking(false);
        toast.error('Speech failed: ' + error.message);
      }
    }, 50);
  };

  const stopSpeaking = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setTranscript('');
    setResponse('');
  };
  
  const testSpeak = () => {
    const testText = currentLanguage === 'hi-IN' 
      ? 'नमस्ते, मैं भूवन हूं। मैं आपकी सहायता के लिए यहां हूं।'
      : currentLanguage === 'kn-IN'
      ? 'ನಮಸ್ಕಾರ, ನಾನು ಭೂವನ್. ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.'
      : 'Hello, I am Bhoovan. I am here to help you with your farming needs.';
    
    console.log('🧪 Testing speech with:', testText);
    speak(testText, currentLanguage);
  };

  return (
    <>
      {/* Floating Assistant Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 z-50"
        aria-label="Voice Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Assistant Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border-2 border-green-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-bold">Bhoovan - भूवन</h3>
                  <p className="text-xs opacity-90">Your AI Farming Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Always Listening Toggle */}
            <div className="mt-3 flex items-center justify-between bg-white/20 rounded-lg p-2">
              <div className="flex items-center gap-2">
                {isAlwaysListening ? (
                  <Power className="w-4 h-4 text-green-300" />
                ) : (
                  <PowerOff className="w-4 h-4 text-gray-300" />
                )}
                <span className="text-sm font-semibold">
                  {isAlwaysListening ? 'Always Listening' : 'Manual Mode'}
                </span>
              </div>
              <button
                onClick={toggleAlwaysListening}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  isAlwaysListening
                    ? 'bg-green-300 text-green-900'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {isAlwaysListening ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Language Selector */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => switchLanguage('en-US')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  currentLanguage === 'en-US'
                    ? 'bg-white text-green-600'
                    : 'bg-white/30 text-white hover:bg-white/40'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => switchLanguage('hi-IN')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  currentLanguage === 'hi-IN'
                    ? 'bg-white text-green-600'
                    : 'bg-white/30 text-white hover:bg-white/40'
                }`}
              >
                🇮🇳 हिंदी
              </button>
              <button
                onClick={() => switchLanguage('kn-IN')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  currentLanguage === 'kn-IN'
                    ? 'bg-white text-green-600'
                    : 'bg-white/30 text-white hover:bg-white/40'
                }`}
              >
                🇮🇳 ಕನ್ನಡ
              </button>
            </div>
            
            {/* Wake Word Status */}
            {isAlwaysListening && (
              <div className="mt-2 text-center">
                {wakeWordDetected || listeningForCommand ? (
                  <div className="flex items-center justify-center gap-2 animate-pulse">
                    <span className="w-2 h-2 bg-green-300 rounded-full"></span>
                    <span className="text-xs font-semibold">Listening for command...</span>
                  </div>
                ) : (
                  <div className="text-xs opacity-75">
                    Say "Bhoovan", "Hey Bhoovan" or "भूवन" to activate
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conversation History */}
          <div className="h-96 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {conversationHistory.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {isAlwaysListening ? (
                  <>
                    <p className="text-green-600 text-lg font-bold mb-2">🎙️ Bhoovan is Listening!</p>
                    <p className="text-gray-600 text-sm mb-3">Say <span className="font-bold text-green-600">"Bhoovan"</span>, <span className="font-bold text-green-600">"Hey Bhoovan"</span> or <span className="font-bold text-green-600">"भूवन"</span> to activate</p>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mt-4 max-w-xs mx-auto">
                      <p className="text-xs text-blue-800 font-semibold mb-2">💡 Try saying:</p>
                      <p className="text-xs text-blue-700">
                        “Hey Bhoovan, what's the weather?”<br />
                        “भूवन, मेरी फसल कैसी है?”<br />
                        “Bhoovan, do I need irrigation?”
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-sm mb-2">Ask me anything!</p>
                    <p className="text-xs text-gray-400">
                      "What's the weather today?"<br />
                      "मेरी फसल के लिए क्या करूं?"<br />
                      "ನನ್ನ ಕ್ಷೇತ್ರದ ಬಗ್ಗೆ ಹೇಳಿ"
                    </p>
                  </>
                )}
              </div>
            ) : (
              conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.type === 'user'
                        ? 'bg-green-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 shadow-md rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl shadow-md rounded-bl-none">
                  <Loader className="w-5 h-5 animate-spin text-green-500" />
                </div>
              </div>
            )}

            {/* Current transcript */}
            {isListening && transcript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-4 py-2 rounded-2xl bg-green-300 text-gray-700 rounded-br-none border-2 border-green-400">
                  <p className="text-sm italic">{transcript}</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 bg-white border-t">
            {!isAlwaysListening && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading || isSpeaking}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Listen
                    </>
                  )}
                </button>

                <button
                  onClick={testSpeak}
                  disabled={loading || isSpeaking}
                  className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                  title="Test Audio"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                )}

                {conversationHistory.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            
            {isAlwaysListening && (
              <div className="text-center">
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2 mx-auto mb-3"
                  >
                    <Volume2 className="w-5 h-5" />
                    Stop Speaking
                  </button>
                )}
                {conversationHistory.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition text-sm"
                  >
                    Clear Conversation
                  </button>
                )}
              </div>
            )}

            {/* Status indicator */}
            <div className="mt-3 text-center">
              {!isAlwaysListening && isListening && (
                <p className="text-sm text-green-600 font-semibold flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Listening...
                </p>
              )}
              {isSpeaking && (
                <p className="text-sm text-blue-600 font-semibold flex items-center justify-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Speaking...
                </p>
              )}
              {loading && (
                <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </p>
              )}
              {isAlwaysListening && !loading && !isSpeaking && (
                <p className="text-xs text-gray-500 italic">
                  🎤 Always listening for "Bhoovan"
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
