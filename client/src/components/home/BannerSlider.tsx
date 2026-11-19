import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';

export interface BannerSlide {
  id: string;
  badge: string;
  badgeColor?: string;
  headline: string;
  subtitle: string;
  ctaText: string;
  image: string;
  fallbackImage: string;
  categoryFilter?: string;
  searchFilter?: string;
}

interface BannerSliderProps {
  onSelectBannerCta?: (slide: BannerSlide) => void;
}

export const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'electronics',
    badge: 'Latest Technology',
    badgeColor: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    headline: 'Upgrade Your Everyday',
    subtitle: 'Discover the latest technology, audio gear, and computers from trusted vendors.',
    ctaText: 'Explore Electronics',
    image: '/assets/banners/banner-electronics.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1920&h=600&q=80',
    categoryFilter: 'Audio & Headphones',
  },
  {
    id: 'fashion',
    badge: 'Trending Collections',
    badgeColor: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    headline: 'Style That Defines You',
    subtitle: 'Explore fashion, trending streetwear, and modern designer outfits.',
    ctaText: 'Shop Fashion',
    image: '/assets/banners/banner-fashion.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1920&h=600&q=80',
    categoryFilter: 'Fashion',
  },
  {
    id: 'lifestyle',
    badge: 'Home & Living Fest',
    badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    headline: 'Make Every Space Special',
    subtitle: 'Discover premium home appliances and aesthetic living essentials.',
    ctaText: 'Explore Collection',
    image: '/assets/banners/banner-lifestyle.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&h=600&q=80',
    categoryFilter: 'Home Appliances',
  },
  {
    id: 'marketplace',
    badge: 'Verified Merchants',
    badgeColor: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    headline: 'One Marketplace. Endless Choices.',
    subtitle: 'Shop directly from hundreds of independent, vetted sellers with transparent delivery.',
    ctaText: 'Shop Now',
    image: '/assets/banners/banner-marketplace.webp',
    fallbackImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1920&h=600&q=80',
    categoryFilter: '',
  },
];

export const BannerSlider: React.FC<BannerSliderProps> = ({ onSelectBannerCta }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSlides = BANNER_SLIDES.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // 5-second Autoplay with pause-on-hover
  useEffect(() => {
    if (isPaused) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isPaused, nextSlide]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      nextSlide(); // swipe left -> next
    } else if (diff < -45) {
      prevSlide(); // swipe right -> prev
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleCtaClick = (slide: BannerSlide) => {
    if (onSelectBannerCta) {
      onSelectBannerCta(slide);
    }
  };

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-gray-200/60 bg-gray-900 group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Carousel"
    >
      {/* ── Slide Track ── */}
      <div
        className="flex transition-transform duration-700 ease-out h-[280px] sm:h-[340px] md:h-[380px] lg:h-[400px]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {BANNER_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className="w-full flex-shrink-0 relative h-full overflow-hidden"
            aria-hidden={currentIndex !== idx}
          >
            {/* Background Image */}
            <img
              src={slide.image}
              alt={slide.headline}
              loading={idx === 0 ? 'eager' : 'lazy'}
              className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== slide.fallbackImage) {
                  target.src = slide.fallbackImage;
                }
              }}
            />

            {/* Dark Gradient Overlay for Maximum Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/60 to-black/20 sm:from-gray-950/85 sm:via-gray-950/45 sm:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />

            {/* Content Container */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 w-full">
                <div className="max-w-xl text-left space-y-3 sm:space-y-4">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wide uppercase backdrop-blur-md border shadow-sm ${slide.badgeColor || 'bg-white/20 text-white border-white/30'}">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{slide.badge}</span>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight drop-shadow-md">
                    {slide.headline}
                  </h2>

                  {/* Subtitle */}
                  <p className="text-xs sm:text-base text-gray-200 font-normal line-clamp-2 max-w-lg leading-relaxed drop-shadow">
                    {slide.subtitle}
                  </p>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => handleCtaClick(slide)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-gray-100 text-gray-950 font-bold text-xs sm:text-sm rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <span>{slide.ctaText}</span>
                      <ArrowRight className="w-4 h-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Navigation Arrows (Desktop / Tablet) ── */}
      <button
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md backdrop-blur-md flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next Slide"
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md backdrop-blur-md flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* ── Pagination Dots ── */}
      <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {BANNER_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`transition-all duration-300 rounded-full h-2 ${
              currentIndex === index
                ? 'w-7 sm:w-8 bg-white shadow-md'
                : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
