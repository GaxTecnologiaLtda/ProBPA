import { ArrowRight, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-8">
                <Database className="text-white w-10 h-10" />
            </div>

            <h1 className="text-5xl font-bold mb-4">ProBPA</h1>
            <p className="text-slate-400 text-xl max-w-lg mb-12">
                Soluções inteligentes para a gestão de saúde pública.
                <br />
                O novo portal está em desenvolvimento.
            </p>

            <Link
                to="/conector"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-slate-200 hover:text-white border border-slate-700"
            >
                Acessar Conector ProBPA
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    )
}
