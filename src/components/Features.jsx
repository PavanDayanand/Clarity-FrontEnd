export default function Features() {
  const features = [
    {
      icon: "⚡",
      title: "Lightning Fast",
      description:
        "Optimized performance that loads in milliseconds. Experience blazing-fast speeds across all devices.",
    },
    {
      icon: "🎨",
      title: "Beautiful Design",
      description:
        "Stunning visual design with attention to detail. Every pixel is crafted for perfection.",
    },
    {
      icon: "🔒",
      title: "Secure & Reliable",
      description:
        "Enterprise-grade security with 99.9% uptime. Your data is always protected.",
    },
    {
      icon: "📱",
      title: "Fully Responsive",
      description:
        "Works seamlessly on all devices. Desktop, tablet, or mobile – always perfect.",
    },
    {
      icon: "🚀",
      title: "Easy Integration",
      description:
        "Simple API and clear documentation. Get started in minutes, not days.",
    },
    {
      icon: "💡",
      title: "24/7 Support",
      description:
        "Dedicated support team ready to help. We're here for you whenever you need us.",
    },
  ];

  return (
    <section id="services" className="py-24 bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Powerful Features
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Everything you need to succeed, all in one platform
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-linear-to-br from-gray-900/50 to-gray-900/30 border border-gray-800 hover:border-cyan-500/50 transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20"
            >
              {/* Icon */}
              <div className="text-5xl mb-6 group-hover:scale-110 transition duration-300">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-4">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>

              {/* Bottom Accent */}
              <div className="mt-6 h-1 w-12 bg-linear-to-r from-cyan-400 to-blue-500 rounded-full group-hover:w-full transition-all duration-300"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
