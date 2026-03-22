import { useNavigate } from 'react-router-dom'

/** Shared top navigation bar — matches the design across all pages */
export function TopNav({ activePage = '' }) {
    const navigate = useNavigate()
    const link = (label, to) => (
        <button
            onClick={() => navigate(to)}
            className={
                activePage === label
                    ? 'text-white font-bold border-b-2 border-white pb-1 font-body tracking-[-0.02em] text-[0.875rem] leading-[1.6] bg-transparent border-x-0 border-t-0 cursor-pointer'
                    : 'text-secondary hover:text-white transition-colors duration-300 font-body tracking-[-0.02em] font-bold text-[0.875rem] leading-[1.6] bg-transparent border-0 cursor-pointer'
            }
        >
            {label}
        </button>
    )

    return (
        <header className="fixed top-0 w-full z-50 bg-[#131313]/40 backdrop-blur-3xl bg-gradient-to-b from-white/10 to-transparent shadow-[0px_24px_48px_rgba(0,0,0,0.4)]">
            <div className="flex justify-between items-center px-8 h-20 w-full max-w-[1440px] mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="text-2xl font-black tracking-tighter text-white uppercase bg-transparent border-0 cursor-pointer"
                >
                    Deep Work Concierge
                </button>
                <nav className="hidden md:flex items-center space-x-12">
                    {link('Home', '/')}
                    {link('Focus', '/dashboard')}
                    {link('Integration', '/setup')}
                </nav>
                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => navigate('/setup')}
                        className="text-white hover:bg-white/10 transition-all duration-300 p-2 rounded-full active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                    <button className="text-white hover:bg-white/10 transition-all duration-300 p-2 rounded-full active:scale-[0.98]">
                        <span className="material-symbols-outlined">account_circle</span>
                    </button>
                </div>
            </div>
        </header>
    )
}

/** Shared footer */
export function Footer({ systemStatus = 'Optimal' }) {
    return (
        <footer className="w-full py-6 mt-auto bg-[#0e0e0e] border-t border-white/5">
            <div className="flex flex-col md:flex-row justify-between items-center px-10 w-full gap-4">
                <div className="text-[0.6875rem] uppercase tracking-[0.1em] font-medium text-[#474747]">
                    Deep Work Concierge © 2025
                </div>
                <div className="flex space-x-8">
                    <span className="text-white text-[0.6875rem] uppercase tracking-[0.1em] font-medium">
                        System: {systemStatus}
                    </span>
                    <span className="text-[#474747] hover:text-secondary text-[0.6875rem] uppercase tracking-[0.1em] font-medium cursor-pointer transition-colors">
                        Syncing
                    </span>
                    <span className="text-[#474747] hover:text-secondary text-[0.6875rem] uppercase tracking-[0.1em] font-medium cursor-pointer transition-colors">
                        Cloud Active
                    </span>
                </div>
            </div>
        </footer>
    )
}
