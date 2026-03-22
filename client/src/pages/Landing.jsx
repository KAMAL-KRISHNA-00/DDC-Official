import { useNavigate } from 'react-router-dom'
import { TopNav, Footer } from '../components/Layout'

/** Landing / Home page — based on home.html design */
export default function Landing() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-surface text-on-surface font-body overflow-x-hidden flex flex-col">
            <TopNav activePage="Home" />

            <main className="flex-grow">
                {/* ── Hero Section ──────────────────────────────────────── */}
                <section className="relative min-h-screen flex items-center justify-center px-8 pt-20 overflow-hidden">
                    {/* Light leak */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

                    <div className="relative z-10 max-w-[1440px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-start-2 lg:col-span-6 flex flex-col items-start">
                            <span className="text-[0.6875rem] uppercase tracking-[0.1em] font-medium text-secondary mb-6">
                                Cognitive Performance Protocol
                            </span>
                            <h1 className="text-[3.5rem] md:text-[5rem] lg:text-[6.5rem] font-black tracking-[-0.04em] leading-[0.9] text-white mb-10">
                                Focus more,<br />manage less
                            </h1>
                            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl leading-[1.6] mb-12">
                                Automate the architectural friction of your workflow. The Deep Work Concierge acts as your cognitive layer, buffering distractions before they reach your focus.
                            </p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group relative px-10 py-5 rounded-full liquid-glass glass-edge transition-all duration-300 hover:bg-primary/20 active:scale-[0.96]"
                            >
                                <span className="relative z-10 text-white font-bold tracking-tight text-lg">Get Started</span>
                                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 blur-xl bg-primary/20 transition-opacity duration-300" />
                            </button>
                        </div>

                        {/* Abstract liquid glass element */}
                        <div className="hidden lg:block lg:col-span-4 relative h-[600px]">
                            <div className="absolute inset-0 rounded-3xl liquid-glass ghost-shadow border border-white/5 rotate-3 transform-gpu flex items-center justify-center">
                                <span className="material-symbols-filled text-white/20" style={{ fontSize: '180px' }}>self_improvement</span>
                            </div>
                            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full liquid-glass backdrop-blur-2xl border border-white/10 -rotate-12" />
                        </div>
                    </div>
                </section>

                {/* ── Bento Grid ────────────────────────────────────────── */}
                <section className="py-32 px-8 bg-surface-container-low">
                    <div className="max-w-[1440px] mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                            <div className="max-w-2xl">
                                <h2 className="text-[2.5rem] font-bold tracking-tight text-white mb-4">Structural Purity</h2>
                                <p className="text-on-surface-variant text-lg">Every feature is carved from the void, ensuring zero cognitive load and maximum presence.</p>
                            </div>
                            <div className="hidden md:block">
                                <span className="material-symbols-outlined text-primary/20" style={{ fontSize: '96px' }}>blur_on</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:h-[800px]">
                            {/* Large card */}
                            <div className="md:col-span-8 relative rounded-3xl bg-surface-container-high/40 backdrop-blur-3xl overflow-hidden group">
                                <div className="absolute inset-0 p-12 flex flex-col justify-end z-10">
                                    <h3 className="text-3xl font-bold text-white mb-4">Focus Buffer</h3>
                                    <p className="text-on-surface-variant max-w-md">Dynamic interceptors that catch digital noise before it breaks your flow state.</p>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                                    <span className="material-symbols-outlined text-white" style={{ fontSize: '300px' }}>headphones</span>
                                </div>
                            </div>

                            {/* Tall card */}
                            <div className="md:col-span-4 rounded-3xl bg-surface-container-highest p-12 flex flex-col justify-between border-t border-white/5">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '36px' }}>analytics</span>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-4">Deep Stats</h3>
                                    <p className="text-on-surface-variant">Real-time feedback loops to optimize your peak performance hours.</p>
                                </div>
                            </div>

                            {/* Wide bottom card */}
                            <div className="md:col-span-5 rounded-3xl bg-surface-container-lowest p-12 border-l border-white/5">
                                <h3 className="text-2xl font-bold text-white mb-4">Neural Sync</h3>
                                <p className="text-on-surface-variant">Synchronization across your entire hardware stack.</p>
                                <div className="mt-8 flex gap-2">
                                    <div className="w-12 h-1 rounded-full bg-primary/20" />
                                    <div className="w-4 h-1 rounded-full bg-primary/20" />
                                    <div className="w-4 h-1 rounded-full bg-primary/40" />
                                </div>
                            </div>

                            {/* Final bento card */}
                            <div className="md:col-span-7 relative rounded-3xl liquid-glass glass-edge p-12 flex flex-col justify-center items-center text-center">
                                <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-widest">Optimized</h3>
                                <p className="text-on-surface-variant max-w-sm">The architecture of silence.</p>
                                <div className="absolute bottom-12 right-12 opacity-10">
                                    <span className="material-symbols-outlined text-white" style={{ fontSize: '96px' }}>all_inclusive</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Quote ─────────────────────────────────────────────── */}
                <section className="py-48 px-8 flex justify-center">
                    <div className="max-w-[1440px] w-full grid grid-cols-1 lg:grid-cols-12">
                        <div className="lg:col-start-4 lg:col-span-7">
                            <blockquote className="text-[1.5rem] md:text-[2.25rem] font-light leading-relaxed text-white italic">
                                "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable. The Concierge is not just an app; it is an executive assistant for your soul."
                            </blockquote>
                            <cite className="block mt-10 not-italic">
                                <span className="text-primary font-bold block text-lg tracking-tight">Dr. Aris Vond</span>
                                <span className="text-on-surface-variant uppercase tracking-widest text-[0.6875rem]">Director of Cognitive Research</span>
                            </cite>
                        </div>
                    </div>
                </section>

                {/* ── CTA Section ───────────────────────────────────────── */}
                <section className="py-32 px-8 bg-surface-container-lowest">
                    <div className="max-w-[1440px] mx-auto flex flex-col items-center">
                        <div className="w-full max-w-2xl text-center mb-16">
                            <h2 className="text-4xl font-bold text-white mb-6">Ready to Focus?</h2>
                            <p className="text-on-surface-variant">Connect your ESP32 and start protecting your deep work sessions today.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group relative px-10 py-5 rounded-full liquid-glass glass-edge transition-all duration-300 hover:bg-primary/20 active:scale-[0.96] flex items-center justify-center"
                            >
                                <span className="relative z-10 text-white font-bold tracking-tight text-lg">Open Dashboard</span>
                                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 blur-xl bg-primary/20 transition-opacity duration-300" />
                            </button>
                            <button
                                onClick={() => navigate('/setup')}
                                className="group relative px-10 py-5 rounded-full liquid-glass glass-edge border border-white/10 transition-all duration-300 hover:bg-white/10 active:scale-[0.96] flex items-center justify-center"
                            >
                                <span className="relative z-10 text-white font-bold tracking-tight text-lg">Setup ESP32</span>
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
