import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Upload, BarChart3, MessageSquareText, ClipboardCheck,
  ChevronRight, Shield, Clock, DollarSign, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { UserExt } from '../lib/types';

interface LandingPageProps {
  user: UserExt | null;
}

export function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      
      setMessage('Check your email for the login link!');
    } catch (error) {
      console.error('Sign in error:', error);
      setMessage('Error sending login link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: Upload,
      title: 'Upload Bids',
      description: 'Drop in your contractor bid PDFs - we extract the data automatically',
    },
    {
      icon: BarChart3,
      title: 'Compare Side-by-Side',
      description: 'See specs, pricing, warranty, and contractor credentials in one view',
    },
    {
      icon: MessageSquareText,
      title: 'Know What to Ask',
      description: 'Get personalized questions for each contractor based on missing info',
    },
    {
      icon: ClipboardCheck,
      title: 'Quality Checklist',
      description: 'Verify installation quality with our industry-standard QII checklist',
    },
  ];

  const benefits = [
    { icon: DollarSign, text: 'Save thousands by choosing the right contractor' },
    { icon: Clock, text: 'Compare bids in minutes, not hours' },
    { icon: Shield, text: 'Avoid common heat pump installation mistakes' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-switch-green-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-xl text-gray-900">BidSmart</span>
            </div>
            <a
              href="https://theswitchison.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <span className="text-sm text-gray-500">by</span>
              <img src="/sio_logo.png" alt="The Switch Is On" className="h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-switch-green-100 text-switch-green-800 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Bid Analysis
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Compare Heat Pump Bids<br />
            <span className="text-switch-green-600">With Confidence</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your contractor bids and get instant side-by-side comparison on specs, 
            pricing, warranty, and credentials. Know exactly what questions to ask.
          </p>

          {/* Sign In Form */}
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email to get started"
                  className="input text-center"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3"
              >
                {loading ? (
                  <span className="animate-pulse">Sending link...</span>
                ) : (
                  <>
                    Get Started Free
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
              {message && (
                <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </p>
              )}
            </form>
            <p className="text-xs text-gray-500 mt-4">
              No password needed. We'll email you a secure login link.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 bg-switch-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-switch-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Why Use BidSmart?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-switch-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-switch-green-600" />
                  </div>
                  <p className="text-gray-700 font-medium">{benefit.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What We Compare */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            What We Compare
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Equipment Specs</h3>
              <ul className="space-y-2">
                {['SEER / SEER2 efficiency', 'HSPF / HSPF2 heating efficiency', 'Capacity (BTU/tons)', 'Variable speed vs staged', 'Sound levels (dB)', 'ENERGY STAR certification'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-switch-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Contractor Credentials</h3>
              <ul className="space-y-2">
                {['Years in business', 'License verification', 'Insurance status', 'Professional certifications', 'Google reviews & ratings', 'Total installations completed'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-switch-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Powered by</span>
            <a href="https://theswitchison.org" target="_blank" rel="noopener noreferrer">
              <img src="/sio_logo.png" alt="The Switch Is On" className="h-5 hover:opacity-80 transition-opacity" />
            </a>
          </div>
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} BidSmart
          </div>
        </div>
      </footer>
    </div>
  );
}
