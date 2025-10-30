export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen pt-20 flex items-center justify-center overflow-hidden bg-[#030711]"
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-br from-[#040713] via-[#07152a] to-[#03060d]" />
        <div className="absolute -left-28 top-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(58,121,255,0.28),transparent_70%)] blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(19,208,255,0.22),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(10,19,42,0.65),transparent_62%)]" />
        <div className="absolute inset-x-16 top-1/3 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-x-20 bottom-1/4 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent"></div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight tracking-tight">
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600">
            Clarity
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Experience crystal-clear design and exceptional performance. We
          transform your vision into reality with cutting-edge technology and
          creative excellence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
          <button className="px-8 py-4 bg-linear-to-r from-cyan-400 to-blue-500 text-black font-semibold rounded-full hover:shadow-2xl hover:shadow-cyan-500/50 transition duration-300 transform hover:scale-105">
            Get Started Now
          </button>
          <button className="px-8 py-4 border-2 border-cyan-400 text-cyan-400 font-semibold rounded-full hover:bg-cyan-400/10 transition duration-300 transform hover:scale-105">
            Learn More
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="animate-bounce mt-12">
          <svg
            className="w-6 h-6 mx-auto text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
