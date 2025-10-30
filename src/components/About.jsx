export default function About() {
  const stats = [
    { number: "500+", label: "Happy Clients" },
    { number: "1000+", label: "Projects Completed" },
    { number: "50M+", label: "Users Served" },
    { number: "98%", label: "Client Satisfaction" },
  ];

  return (
    <section id="about" className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Why Choose{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
                Clarity
              </span>
              ?
            </h2>

            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              We've been crafting digital experiences for over a decade. Our
              team of experts combines cutting-edge technology with creative
              excellence to deliver results that exceed expectations.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                "Industry-leading expertise and innovation",
                "Dedicated support and consultation",
                "Transparent pricing with no hidden fees",
                "Scalable solutions for any size business",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-gray-300">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                  {item}
                </li>
              ))}
            </ul>

            <button className="px-8 py-4 bg-linear-to-r from-cyan-400 to-blue-500 text-black font-semibold rounded-full hover:shadow-2xl hover:shadow-cyan-500/50 transition duration-300 transform hover:scale-105">
              Explore Our Work
            </button>
          </div>

          {/* Right Column - Stats */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="p-8 rounded-xl bg-linear-to-br from-gray-900/50 to-gray-900/30 border border-gray-800 text-center hover:border-cyan-500/50 transition duration-300"
              >
                <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500 mb-3">
                  {stat.number}
                </div>
                <p className="text-gray-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
