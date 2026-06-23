import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { SignInButton, SignUpButton, useAuth } from "@clerk/clerk-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    num: "01",
    title: "Scan the bill",
    body: "Snap a photo of any restaurant receipt. Our AI reads every line item in seconds.",
  },
  {
    num: "02",
    title: "Tap what you ate",
    body: "Friends join with a link, check off their items, and shares calculate automatically.",
  },
  {
    num: "03",
    title: "Pay your share",
    body: "One tap opens UPI with the exact amount. No awkward math at the table.",
  },
];

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current, {
        backgroundColor: "#f5f5f5",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(bgRef.current, {
        backgroundColor: "#0a0a0a",
        scrollTrigger: {
          trigger: ".steps-section",
          start: "top 80%",
          end: "bottom 60%",
          scrub: true,
        },
      });

      gsap.from(".hero-line", {
        y: 120,
        opacity: 0,
        rotateX: 40,
        transformOrigin: "50% 100%",
        stagger: 0.12,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.2,
      });

      gsap.from(".hero-sub", {
        y: 40,
        opacity: 0,
        duration: 1,
        delay: 0.7,
        ease: "power2.out",
      });

      gsap.from(".hero-cta", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 1,
        ease: "power2.out",
      });

      gsap.to(".float-card-1", {
        y: -80,
        rotateY: 25,
        rotateX: -12,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });

      gsap.to(".float-card-2", {
        y: -140,
        rotateY: -30,
        rotateX: 18,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      gsap.to(".float-card-3", {
        y: -60,
        rotateZ: 8,
        rotateX: -20,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });

      gsap.to(sceneRef.current, {
        rotateX: 8,
        rotateY: -6,
        scale: 0.92,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.utils.toArray<HTMLElement>(".step-card").forEach((card, i) => {
        gsap.from(card, {
          y: 100,
          opacity: 0,
          rotateX: 35,
          transformOrigin: "50% 100%",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "top 55%",
            scrub: 1,
          },
          delay: i * 0.05,
        });
      });

      gsap.from(".cta-block", {
        scale: 0.9,
        opacity: 0,
        rotateX: 20,
        transformOrigin: "50% 100%",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top 75%",
          end: "top 40%",
          scrub: 1,
        },
      });

      gsap.to(".marquee-inner", {
        xPercent: -50,
        ease: "none",
        scrollTrigger: {
          trigger: ".marquee-section",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useGSAP(
    () => {
      gsap.to(".orb-1", {
        x: 60,
        y: -40,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".orb-2", {
        x: -50,
        y: 30,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="landing-root relative">
      <div
        ref={bgRef}
        className="fixed inset-0 -z-10 transition-colors duration-300"
        style={{ backgroundColor: "#0a0a0a" }}
      />

      <div className="fixed inset-0 -z-[9] overflow-hidden pointer-events-none">
        <div className="orb-1 absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neutral-800/30 blur-3xl" />
        <div className="orb-2 absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-neutral-600/20 blur-3xl" />
      </div>

      <nav className="fixed top-0 inset-x-0 z-50 mix-blend-difference">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="font-serif text-xl text-white tracking-tight">
            SplitSnap
          </span>
          <div className="flex items-center gap-4">
            {!isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm text-white/80 hover:text-white transition-colors">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-sm px-4 py-2 bg-white text-black rounded-full hover:bg-neutral-200 transition-colors">
                    Get started
                  </button>
                </SignUpButton>
              </>
            ) : (
              <Link
                to="/app"
                className="text-sm px-4 py-2 bg-white text-black rounded-full hover:bg-neutral-200 transition-colors"
              >
                Open app
              </Link>
            )}
          </div>
        </div>
      </nav>

      <section
        ref={heroRef}
        className="relative min-h-[110vh] flex flex-col justify-center px-6 pt-24"
      >
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 z-10">
            <p className="hero-sub text-xs uppercase tracking-[0.35em] text-neutral-500">
              Bill splitting, refined
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-white">
              <span className="hero-line block">Scan.</span>
              <span className="hero-line block">Split.</span>
              <span className="hero-line block text-neutral-400">Settle up.</span>
            </h1>
            <p className="hero-sub text-lg text-neutral-400 max-w-md leading-relaxed">
              Upload a receipt, let everyone pick their items, and pay the host
              instantly via UPI. No spreadsheets. No confusion.
            </p>
            <div className="hero-cta flex flex-wrap gap-4">
              {isSignedIn ? (
                <Link
                  to="/app"
                  className="inline-flex items-center px-8 py-3.5 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-all hover:scale-[1.02]"
                >
                  Start scanning
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center px-8 py-3.5 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-all hover:scale-[1.02]">
                    Get started free
                  </button>
                </SignUpButton>
              )}
              <a
                href="#how-it-works"
                className="inline-flex items-center px-8 py-3.5 border border-neutral-600 text-neutral-300 rounded-full hover:border-neutral-400 hover:text-white transition-colors"
              >
                See how it works
              </a>
            </div>
          </div>

          <div
            ref={sceneRef}
            className="relative h-[420px] sm:h-[480px] hidden sm:block"
            style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
          >
            <div
              className="float-card-1 absolute top-8 left-4 w-56 h-72 rounded-2xl border border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-2xl p-5"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-4">
                Receipt
              </div>
              <div className="space-y-2">
                {["Butter chicken", "Naan x2", "Lassi", "Biryani"].map((item) => (
                  <div
                    key={item}
                    className="flex justify-between text-xs text-neutral-400"
                  >
                    <span>{item}</span>
                    <span>₹•••</span>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-5 left-5 right-5 border-t border-neutral-700 pt-3 flex justify-between text-sm text-white">
                <span>Total</span>
                <span>₹1,240</span>
              </div>
            </div>

            <div
              className="float-card-2 absolute top-16 right-0 w-52 h-64 rounded-2xl border border-neutral-600 bg-white text-black shadow-2xl p-5"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">
                Your share
              </div>
              <p className="font-serif text-4xl mt-6">₹312</p>
              <p className="text-xs text-neutral-500 mt-2">3 items selected</p>
              <div className="mt-8 py-2 px-3 bg-black text-white text-xs rounded-lg text-center">
                Pay with UPI
              </div>
            </div>

            <div
              className="float-card-3 absolute bottom-0 left-1/3 w-44 h-44 rounded-full border border-neutral-700 bg-neutral-900/90 backdrop-blur flex items-center justify-center shadow-xl"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="text-center">
                <p className="text-3xl font-serif text-white">4</p>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">
                  Friends joined
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marquee-section py-16 border-y border-neutral-800 overflow-hidden">
        <div className="marquee-inner flex whitespace-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={`${copy}-${i}`}
                  className="mx-8 text-6xl sm:text-8xl font-serif text-neutral-800"
                >
                  Split fairly
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="steps-section py-32 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.35em] text-neutral-500 mb-4">
            How it works
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl text-white mb-20 max-w-xl">
            Three steps from receipt to settled
          </h2>

          <div
            className="grid md:grid-cols-3 gap-8"
            style={{ perspective: "1000px" }}
          >
            {STEPS.map((step) => (
              <article
                key={step.num}
                className="step-card rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 hover:border-neutral-600 transition-colors"
                style={{ transformStyle: "preserve-3d" }}
              >
                <span className="text-sm font-mono text-neutral-600">
                  {step.num}
                </span>
                <h3 className="font-serif text-2xl text-white mt-4 mb-3">
                  {step.title}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="cta-block rounded-3xl border border-neutral-700 bg-gradient-to-b from-neutral-900 to-neutral-950 p-12 sm:p-16">
            <h2 className="font-serif text-4xl sm:text-5xl text-white mb-6">
              Dinner shouldn&apos;t end in math class
            </h2>
            <p className="text-neutral-400 mb-10 max-w-md mx-auto">
              Join hosts who split bills in under a minute. Guests don&apos;t even
              need an account.
            </p>
            {isSignedIn ? (
              <Link
                to="/app"
                className="inline-flex px-10 py-4 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-all hover:scale-[1.02]"
              >
                Open SplitSnap
              </Link>
            ) : (
              <SignUpButton mode="modal">
                <button className="inline-flex px-10 py-4 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-all hover:scale-[1.02]">
                  Create free account
                </button>
              </SignUpButton>
            )}
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-600">
          <span className="font-serif text-neutral-400">SplitSnap</span>
          <p>Scan the bill. Tap what you ate. Pay your share.</p>
        </div>
      </footer>
    </div>
  );
}
