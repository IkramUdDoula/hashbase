import React, { useState } from 'react';
import { X, ArrowRight, Hash, CheckCircle2, Loader2 } from 'lucide-react';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';
import dashboardImage from '../public/image.png';
import { submitFormAsIssue, isFormSubmissionConfigured } from '@/services/landingFormService';

export function LandingPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Check if GitHub submission is configured
      if (isFormSubmissionConfigured()) {
        // Submit as GitHub issue
        await submitFormAsIssue(formData);
        setSubmitSuccess(true);
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setIsFormOpen(false);
          setSubmitSuccess(false);
          setFormData({ name: '', email: '', message: '' });
        }, 3000);
      } else {
        // Fallback to mailto if not configured
        const subject = encodeURIComponent(`Hashbase Interest - ${formData.name}`);
        const body = encodeURIComponent(
          `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
        );
        window.location.href = `mailto:doula.ikram@gmail.com?subject=${subject}&body=${body}`;
        
        // Close form and reset
        setIsFormOpen(false);
        setFormData({ name: '', email: '', message: '' });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError(error.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-600/10 to-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Scrollbar Styles - Apply globally */}
      <style>{`
        html::-webkit-scrollbar {
          width: 6px;
        }
        html::-webkit-scrollbar-track {
          background: transparent;
        }
        html::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        html::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hashbase</h2>
        </div>

        {/* Hero Text */}
        <div className="max-w-5xl mx-auto text-center mb-8 space-y-4">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 leading-tight animate-fade-in-up">
            Your Command Center
            <br />
            <span className="text-5xl md:text-6xl lg:text-7xl">For Everything That Matters</span>
          </h1>
        </div>

        {/* Dashboard Preview Image */}
        <div className="max-w-6xl w-full mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
            
            {/* Image container */}
            <div className="relative bg-slate-900/50 backdrop-blur-sm rounded-2xl p-2 border border-slate-700/50 shadow-2xl">
              <img 
                src={dashboardImage} 
                alt="Hashbase Dashboard Preview" 
                className="w-full h-auto rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Description and CTA */}
        <div className="max-w-5xl mx-auto text-center mb-8 space-y-4">
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Unify your digital workspace with customizable widgets for Gmail, GitHub, AI Chat, News, and more. 
            <span className="text-blue-400 font-semibold"> Drag. Drop. Done.</span>
          </p>
          
          <p className="text-base text-slate-400 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <span className="text-purple-400 font-semibold">SaaP, not SaaS.</span> Software as a Product — Own your dashboard, control your data, no subscriptions.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 animate-fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          <span className="flex items-center gap-2">
            Access Your Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
        </button>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          {[
            { title: 'Drag & Drop', desc: 'Customize your layout with intuitive drag-and-drop' },
            { title: 'AI-Powered', desc: 'Chat with GPT-4 and Claude right from your dashboard' },
            { title: 'All-in-One', desc: 'Gmail, GitHub, News, Netlify - everything in one place' }
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/50 transition-all hover:scale-105">
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Popup Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scale-in">
            {/* Close button */}
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Get Early Access</h2>
              <p className="text-slate-400">Join the waitlist and be the first to experience Hashbase</p>
            </div>

            {/* Success Message */}
            {submitSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-slate-400">Your request has been submitted successfully.</p>
                <p className="text-slate-500 text-sm mt-2">We'll be in touch soon!</p>
              </div>
            ) : (
              <>
                {/* Error Message */}
                {submitError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Tell us what you're excited about..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all hover:scale-105 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
