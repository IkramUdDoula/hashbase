import React, { useState } from 'react';
import { X, ArrowRight, Hash, CheckCircle2, Loader2, Sparkles, Newspaper, CheckSquare, Timer } from 'lucide-react';
import { SiGmail, SiNetlify, SiGithub } from 'react-icons/si';
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
  const [currentSection, setCurrentSection] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const containerRef = React.useRef(null);
  const autoScrollTimerRef = React.useRef(null);
  const totalSections = 3; // Hero, Screenshot, Widgets

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

  // Auto-scroll functionality
  const scrollToSection = (index) => {
    if (containerRef.current) {
      const section = containerRef.current.children[index];
      if (section) {
        setIsAutoScrolling(true);
        section.scrollIntoView({ behavior: 'smooth' });
        setCurrentSection(index);
        setTimeout(() => setIsAutoScrolling(false), 1000);
      }
    }
  };

  // Auto-scroll timer
  React.useEffect(() => {
    const startAutoScroll = () => {
      autoScrollTimerRef.current = setInterval(() => {
        setCurrentSection((prev) => {
          const next = (prev + 1) % totalSections;
          scrollToSection(next);
          return next;
        });
      }, 5000); // Change section every 5 seconds
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, []);

  // Handle wheel/touch events for manual scrolling
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let isScrolling = false;

    const handleWheel = (e) => {
      if (isScrolling || isAutoScrolling) return;
      
      e.preventDefault();
      isScrolling = true;

      // Clear auto-scroll timer on manual interaction
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }

      if (e.deltaY > 0 && currentSection < totalSections - 1) {
        scrollToSection(currentSection + 1);
      } else if (e.deltaY < 0 && currentSection > 0) {
        scrollToSection(currentSection - 1);
      }

      setTimeout(() => {
        isScrolling = false;
      }, 1000);
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (isScrolling || isAutoScrolling) return;
      
      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY - touchEndY;

      if (Math.abs(diff) > 50) {
        isScrolling = true;

        // Clear auto-scroll timer on manual interaction
        if (autoScrollTimerRef.current) {
          clearInterval(autoScrollTimerRef.current);
        }

        if (diff > 0 && currentSection < totalSections - 1) {
          scrollToSection(currentSection + 1);
        } else if (diff < 0 && currentSection > 0) {
          scrollToSection(currentSection - 1);
        }

        setTimeout(() => {
          isScrolling = false;
        }, 1000);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentSection, isAutoScrolling]);

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-600/10 to-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Hide scrollbar */}
      <style>{`
        html, body {
          overflow: hidden;
        }
        .scroll-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Scroll Container */}
      <div ref={containerRef} className="relative z-10 h-screen overflow-y-auto scroll-container snap-y snap-mandatory">
        {/* Section 1: Hero with Background Image */}
        <section className="h-screen flex flex-col items-center justify-center px-4 md:px-8 snap-start relative">
          {/* Background Image with low opacity */}
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={dashboardImage} 
              alt="" 
              className="w-full h-full object-cover opacity-[0.05]"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/50 pointer-events-none"></div>
          
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 animate-fade-in relative z-10">
            <Hash className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
            <h2 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hashbase</h2>
          </div>

          {/* Hero Text */}
          <div className="max-w-5xl mx-auto text-center space-y-4 md:space-y-6 relative z-10 mb-6 md:mb-8 px-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 leading-tight animate-fade-in-up">
              Your Command Center
              <br />
              <span className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl">For Everything That Matters</span>
            </h1>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setIsFormOpen(true)}
            className="group relative px-6 py-3 md:px-10 md:py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-base md:text-xl font-bold rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 relative z-10"
          >
            <span className="flex items-center gap-2">
              Access Your Dashboard
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
          </button>
        </section>

        {/* Section 2: Dashboard Preview & Description */}
        <section className="h-screen flex flex-col items-center justify-center px-4 md:px-8 snap-start relative">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950/50 pointer-events-none"></div>
          
          <div className="max-w-6xl w-full mx-auto relative z-10 space-y-6 md:space-y-12">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
              
              {/* Image container */}
              <div className="relative bg-slate-900/50 backdrop-blur-sm rounded-xl md:rounded-2xl p-1 md:p-2 border border-slate-700/50 shadow-2xl">
                <img 
                  src={dashboardImage} 
                  alt="Hashbase Dashboard Preview" 
                  className="w-full h-auto rounded-lg md:rounded-xl shadow-2xl"
                />
              </div>
            </div>

            {/* Description below screenshot */}
            <div className="max-w-5xl mx-auto text-center space-y-3 md:space-y-4 px-4">
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Unify your digital workspace with customizable widgets. Drag. Drop. Done.
              </p>
              
              <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
                <span className="text-purple-400 font-semibold">SaaP, not SaaS.</span> Software as a Product — Own your dashboard, control your data, no subscriptions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Widget Cards - Grid Layout */}
        <section className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 snap-start relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="w-full h-full flex flex-col justify-center relative z-10 py-8 md:py-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white text-center mb-6 md:mb-12">Available Widgets</h2>
            
            {/* Grid of Widget Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-[95vw] mx-auto flex-1 content-center">
              {[
                {
                  title: 'Gmail',
                  description: 'Email Management',
                  details: 'OAuth2 authentication, unread count, quick preview',
                  icon: SiGmail,
                  gradient: 'from-red-500/20 to-red-600/20',
                  borderColor: 'border-red-500/30',
                  hoverBorder: 'hover:border-red-500',
                  iconColor: 'text-red-400'
                },
                {
                  title: 'GitHub',
                  description: 'Repository Activity',
                  details: 'Track commits, issues, and pull requests in real-time',
                  icon: SiGithub,
                  gradient: 'from-purple-500/20 to-purple-600/20',
                  borderColor: 'border-purple-500/30',
                  hoverBorder: 'hover:border-purple-500',
                  iconColor: 'text-purple-400'
                },
                {
                  title: 'AI Chat',
                  description: 'AI Assistants',
                  details: 'GPT-4 integration with conversation history',
                  icon: Sparkles,
                  gradient: 'from-blue-500/20 to-cyan-600/20',
                  borderColor: 'border-blue-500/30',
                  hoverBorder: 'hover:border-blue-500',
                  iconColor: 'text-blue-400'
                },
                {
                  title: 'News',
                  description: 'Latest Headlines',
                  details: 'Customizable feeds with country and topic filters',
                  icon: Newspaper,
                  gradient: 'from-orange-500/20 to-amber-600/20',
                  borderColor: 'border-orange-500/30',
                  hoverBorder: 'hover:border-orange-500',
                  iconColor: 'text-orange-400'
                },
                {
                  title: 'Netlify',
                  description: 'Deployment Status',
                  details: 'Monitor builds, deployments, and site analytics',
                  icon: SiNetlify,
                  gradient: 'from-teal-500/20 to-cyan-600/20',
                  borderColor: 'border-teal-500/30',
                  hoverBorder: 'hover:border-teal-500',
                  iconColor: 'text-teal-400'
                },
                {
                  title: 'BD24Live',
                  description: 'Bangladesh News',
                  details: 'RSS feed with auto-refresh every 30 minutes',
                  icon: Newspaper,
                  gradient: 'from-green-500/20 to-emerald-600/20',
                  borderColor: 'border-green-500/30',
                  hoverBorder: 'hover:border-green-500',
                  iconColor: 'text-green-400'
                },
                {
                  title: 'Checklist',
                  description: 'Task Management',
                  details: 'Auto-sorting with checked items moving to bottom',
                  icon: CheckSquare,
                  gradient: 'from-pink-500/20 to-rose-600/20',
                  borderColor: 'border-pink-500/30',
                  hoverBorder: 'hover:border-pink-500',
                  iconColor: 'text-pink-400'
                },
                {
                  title: 'Timer',
                  description: 'Time Tracking',
                  details: 'Stopwatch with laps and countdown timer features',
                  icon: Timer,
                  gradient: 'from-indigo-500/20 to-violet-600/20',
                  borderColor: 'border-indigo-500/30',
                  hoverBorder: 'hover:border-indigo-500',
                  iconColor: 'text-indigo-400'
                }
              ].map((widget, idx) => {
                const IconComponent = widget.icon;
                return (
                  <div 
                    key={idx} 
                    className={`group relative bg-gradient-to-br ${widget.gradient} backdrop-blur-sm border ${widget.borderColor} rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-300 hover:scale-105 md:hover:scale-110 ${widget.hoverBorder} cursor-pointer overflow-hidden h-full min-h-[180px] sm:min-h-[200px] md:min-h-[240px] flex items-center justify-center`}
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-3 md:space-y-4">
                      {/* Icon */}
                      <div className={`p-3 sm:p-4 md:p-5 rounded-xl md:rounded-2xl bg-slate-900/50 ${widget.iconColor}`}>
                        <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">{widget.title}</h3>
                      
                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-300 font-medium">{widget.description}</p>
                      
                      {/* Details - Hidden on mobile */}
                      <p className="hidden sm:block text-xs text-slate-500 leading-relaxed">{widget.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Section Indicators */}
      <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 md:gap-3">
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            onClick={() => scrollToSection(index)}
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
              currentSection === index 
                ? 'bg-blue-500 scale-125' 
                : 'bg-slate-600 hover:bg-slate-500'
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      {/* Popup Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Form Header */}
            <div className="mb-4 md:mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Get Early Access</h2>
              <p className="text-sm md:text-base text-slate-400">Join the waitlist and be the first to experience Hashbase</p>
            </div>

            {/* Success Message */}
            {submitSuccess ? (
              <div className="text-center py-6 md:py-8">
                <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-green-500 mx-auto mb-3 md:mb-4" />
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-sm md:text-base text-slate-400">Your request has been submitted successfully.</p>
                <p className="text-slate-500 text-xs md:text-sm mt-2">We'll be in touch soon!</p>
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
