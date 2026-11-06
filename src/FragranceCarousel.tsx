import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

type FragranceSlide = {
  image: string;
  video?: string;
  alt: string;
  title: string;
  action: string;
  to: string;
  position: string;
};

const slides: FragranceSlide[] = [
  {
    image: '/images/ritual-presence.jpg',
    video: '/videos/ritual-presence.mp4',
    alt: 'A Black woman applies perfume at her vanity in natural daylight',
    title: 'The finishing touch.',
    action: 'Find your scent',
    to: '/shop',
    position: '35% 40%',
  },
  {
    image: '/images/ritual-essence.jpg',
    video: '/videos/ritual-essence.mp4',
    alt: 'A Black woman carefully pours fragrant liquid into a glass bottle',
    title: 'Scent, in the details.',
    action: 'Explore oil perfumes',
    to: '/shop?category=oil-perfumes',
    position: 'center 40%',
  },
  {
    image: '/images/fragrance-ritual-v2.jpg',
    alt: 'Deep brown hands apply perfume to a wrist beside ivory linen and warm stone',
    title: 'Your everyday ritual.',
    action: 'Explore the collection',
    to: '/shop',
    position: 'center 52%',
  },
];

export function FragranceCarousel() {
  const section = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const rotationIntent = useRef<boolean | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [saveData, setSaveData] = useState(true);
  const [manualPlayback, setManualPlayback] = useState(false);
  const [loadedVideo, setLoadedVideo] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<number | null>(null);
  const [buffering, setBuffering] = useState(false);
  const current = slides[active];
  const allowMotion = (!reducedMotion && !saveData) || manualPlayback;
  const mediaPlaying =
    playing && allowMotion && inView && pageVisible && videoError !== active;
  const rotating = mediaPlaying && !hovered;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    const visibilityChanged = () => setPageVisible(!document.hidden);
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    setSaveData(Boolean(connection?.saveData));
    if (connection?.saveData) setPlaying(false);
    motionChanged();
    visibilityChanged();
    preference.addEventListener('change', motionChanged);
    document.addEventListener('visibilitychange', visibilityChanged);

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.intersectionRatio >= 0.3),
      { threshold: [0, 0.3] },
    );
    if (section.current) observer.observe(section.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', motionChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, []);

  useEffect(() => {
    if (!rotating || current.video) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, [rotating, active, current.video]);

  useEffect(() => {
    if (mediaPlaying && current.video) setLoadedVideo(active);
  }, [mediaPlaying, active, current.video]);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;
    if (mediaPlaying) {
      element.muted = true;
      if (element.ended) element.currentTime = 0;
      void element.play().catch((error: Error) => {
        if (!cancelled && error.name !== 'AbortError') {
          setPlaying(false);
          setBuffering(false);
        }
      });
    } else {
      element.pause();
      setBuffering(false);
    }
    return () => {
      cancelled = true;
      element.pause();
    };
  }, [mediaPlaying, active, loadedVideo]);

  function select(index: number) {
    setPlaying(false);
    setVideoError(null);
    setBuffering(false);
    setActive((index + slides.length) % slides.length);
  }

  function swipe(event: PointerEvent<HTMLDivElement>) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy))
      select(active + (dx < 0 ? 1 : -1));
  }

  function startPlayback() {
    setManualPlayback(true);
    setVideoError(null);
    setPlaying(true);
  }
  return (
    <section
      ref={section}
      className={`section container fragrance-section${rotating ? ' is-playing' : ''}`}
      aria-labelledby="fragrance-ritual-title"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPlaying(false)}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          select(active + (event.key === 'ArrowRight' ? 1 : -1));
        }
      }}
    >
      <div className="section-heading fragrance-heading">
        <div>
          <p className="eyebrow">Fragrance, up close</p>
          <h2 id="fragrance-ritual-title">
            The everyday <em>ritual.</em>
          </h2>
        </div>
        <div className="fragrance-heading-tools">
          <span className="fragrance-counter" aria-hidden="true">
            {String(active + 1).padStart(2, '0')} / 03
          </span>
          {(!reducedMotion && !saveData) || current.video ? (
            <button
              className="icon-button"
              aria-label={playing ? 'Pause carousel' : 'Play carousel'}
              onPointerDown={() => (rotationIntent.current = !playing)}
              onPointerCancel={() => (rotationIntent.current = null)}
              onBlur={() => (rotationIntent.current = null)}
              onClick={() => {
                const intent = rotationIntent.current;
                rotationIntent.current = null;
                const next = intent ?? !playing;
                if (next) startPlayback();
                else setPlaying(false);
              }}
            >
              {playing ? (
                <Pause size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      </div>
      <div
        className="fragrance-stage"
        onPointerDown={(event) => {
          if (
            event.pointerType === 'touch' &&
            !(event.target as Element).closest('a, button')
          ) {
            setPlaying(false);
            touch.current = { x: event.clientX, y: event.clientY };
          }
        }}
        onPointerUp={swipe}
        onPointerCancel={() => (touch.current = null)}
      >
        {slides.map((slide, index) => (
          <figure
            key={slide.image}
            className={`fragrance-slide${slide.video ? ' has-video' : ''}${active === index ? ' active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={active !== index}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              width={slide.video ? 960 : 1536}
              height={slide.video ? 540 : 1024}
              loading="lazy"
              decoding="async"
              aria-hidden={Boolean(slide.video && loadedVideo === index)}
              style={{ objectPosition: slide.position }}
            />
            {slide.video && active === index && loadedVideo === index && (
              <video
                ref={video}
                src={slide.video}
                poster={slide.image}
                width="960"
                height="540"
                muted
                playsInline
                loop={hovered}
                preload="none"
                aria-label={slide.alt}
                style={{ objectPosition: slide.position }}
                onWaiting={() => setBuffering(true)}
                onPlaying={() => setBuffering(false)}
                onCanPlay={() => setBuffering(false)}
                onEnded={() => {
                  if (rotating)
                    setActive((index) => (index + 1) % slides.length);
                }}
                onError={() => {
                  setVideoError(index);
                  setBuffering(false);
                  setPlaying(false);
                }}
              />
            )}
          </figure>
        ))}
        {current.video && !playing && videoError !== active && (
          <button
            className="fragrance-play-overlay"
            aria-label="Play fragrance video"
            onClick={startPlayback}
          >
            <Play size={24} aria-hidden="true" />
          </button>
        )}
        {current.video && buffering && mediaPlaying && (
          <span className="fragrance-buffering" role="status">
            <LoaderCircle size={20} aria-hidden="true" /> Loading video
          </span>
        )}
        {videoError === active && (
          <button
            className="fragrance-retry"
            onClick={() => {
              video.current?.load();
              startPlayback();
            }}
          >
            <RotateCcw size={18} aria-hidden="true" /> Retry video
          </button>
        )}
        <div
          className="fragrance-caption"
          aria-live={playing ? 'off' : 'polite'}
          aria-atomic="true"
        >
          <h3>{current.title}</h3>
          <Link className="text-link" to={current.to}>
            {current.action} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="fragrance-navigation">
        <div
          className="fragrance-pagination"
          role="group"
          aria-label="Choose a slide"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              className="fragrance-dot"
              aria-label={`Show slide ${index + 1}: ${slide.title}`}
              aria-current={active === index ? 'true' : undefined}
              aria-disabled={active === index}
              onClick={() => {
                if (active !== index) select(index);
              }}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="fragrance-actions">
          <button
            className="icon-button"
            aria-label="Previous fragrance slide"
            onClick={() => select(active - 1)}
          >
            <ChevronLeft size={19} aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            aria-label="Next fragrance slide"
            onClick={() => select(active + 1)}
          >
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
