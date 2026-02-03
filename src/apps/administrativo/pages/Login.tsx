import React, { useEffect, useRef, useState } from 'react';
import { Building2, Lock, Mail, ArrowRight, Activity } from 'lucide-react';
import { Button, Input } from '../components/Common';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onLogin: () => void;
}

// --- COMPONENTE DE ANIMAÇÃO 3D (CANVAS) ---
const DataNetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Configuração das Partículas (Nós de dados)
    const particles: Particle[] = [];
    const particleCount = 85; // Aumentado levemente
    const connectionDistance = 160;

    // Cores mais vibrantes
    const colors = ['#4ade80', '#38bdf8', '#ffffff']; // Green-400, Sky-400, White

    class Particle {
      x: number;
      y: number;
      z: number; // Simulação de profundidade
      vx: number;
      vy: number;
      vz: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 2 + 0.5; // Profundidade
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.vz = (Math.random() - 0.5) * 0.005;
        this.size = Math.random() * 2 + 1.5;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        // Rebatimento nas bordas
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Limite Z para manter visível
        if (this.z < 0.2 || this.z > 3) this.vz *= -1;
      }

      draw() {
        if (!ctx) return;
        const scale = Math.max(0.1, this.z / 1.5); // Escala baseada na profundidade
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.min(0.8, 0.4 * scale + 0.2); // Mais visível
        ctx.fill();
      }
    }

    // Inicializar
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // 1. Fundo Rico (Não apenas preto)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#0f172a'); // Slate 900 (Topo)
      bgGradient.addColorStop(1, '#020617'); // Slate 950 (Fundo)
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Glows Ambientais (Luzes de fundo para remover o aspecto "preto chapado")
      // Glow Verde (Inferior Esquerdo)
      const greenGlow = ctx.createRadialGradient(width * 0.2, height * 0.8, 0, width * 0.2, height * 0.8, width * 0.6);
      greenGlow.addColorStop(0, 'rgba(34, 197, 94, 0.12)'); // Green-500 low opacity
      greenGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = greenGlow;
      ctx.fillRect(0, 0, width, height);

      // Glow Azul (Superior Direito)
      const blueGlow = ctx.createRadialGradient(width * 0.8, height * 0.2, 0, width * 0.8, height * 0.2, width * 0.6);
      blueGlow.addColorStop(0, 'rgba(14, 165, 233, 0.12)'); // Sky-500 low opacity
      blueGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = blueGlow;
      ctx.fillRect(0, 0, width, height);

      // Atualizar e desenhar partículas e conexões
      particles.forEach((p, index) => {
        p.update();
        p.draw();

        // Conexões (Linhas)
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            // Opacidade baseada na distância e profundidade média
            const opacity = (1 - distance / connectionDistance) * 0.35;

            ctx.beginPath();
            ctx.strokeStyle = p.color === '#ffffff' ? 'rgba(255,255,255,0.4)' : p.color;
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = opacity;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

// --- TELA DE LOGIN PRINCIPAL ---
const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('admin@gax.com');
  const [password, setPassword] = useState('password');

  const { signIn } = useAuth();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      onLogin(); // This might be redundant if we redirect based on user state, but kept for compatibility if needed
    } catch (err) {
      console.error(err);
      setError('Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-dark-950">

      {/* Lado Esquerdo - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 bg-white dark:bg-dark-950 lg:bg-opacity-100">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">

          {/* Header do Form */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-gax-500 to-corp-500 text-white font-bold text-2xl mb-6 shadow-lg shadow-gax-500/30">
              G
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Bem-vindo ao ProBPA
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Acesse o painel administrativo da GAX Soluções.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-corp-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-dark-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-corp-500 focus:border-corp-500 transition-all sm:text-sm"
                  placeholder="Seu e-mail corporativo"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-corp-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-dark-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-corp-500 focus:border-corp-500 transition-all sm:text-sm"
                  placeholder="Sua senha"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-corp-600 focus:ring-corp-500 border-slate-300 rounded dark:border-slate-700 dark:bg-dark-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Lembrar dispositivo
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-corp-600 hover:text-corp-500 dark:text-corp-400">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-corp-600 to-corp-500 hover:from-corp-700 hover:to-corp-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corp-500 shadow-lg shadow-corp-500/30 transition-all ${loading ? 'opacity-75 cursor-wait' : ''}`}
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <ArrowRight className="h-5 w-5 text-corp-300 group-hover:text-corp-200" />
                </span>
              )}
              {loading ? 'Autenticando...' : 'Acessar Painel'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-950 text-slate-500">Acesso restrito para colaboradores GAX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer simples */}
        <div className="absolute bottom-6 text-center w-full lg:w-1/2 left-0 text-xs text-slate-400">
          &copy; 2024 GAX Soluções Tecnológicas. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado Direito - Animação 3D */}
      <div className="hidden lg:block relative w-1/2 bg-slate-900 overflow-hidden">
        <DataNetworkBackground />

        {/* Overlay de Conteúdo sobre a animação */}
        {/* Opacidade reduzida para não esconder o background (from-slate-900/40 ao invés de /80) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-gradient-to-t from-slate-900/40 via-transparent to-slate-900/20">
          <div className="max-w-lg text-center px-6">
            <div className="inline-flex p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6 animate-bounce-slow">
              <Activity className="w-8 h-8 text-gax-500" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Inteligência em Gestão Pública</h3>
            <p className="text-lg text-slate-200 leading-relaxed drop-shadow-md">
              Monitore licenças, gerencie entidades e visualize dados críticos de saúde pública em tempo real com nossa tecnologia proprietária.
            </p>

            {/* Cards Flutuantes (Decorativos) */}
            <div className="absolute top-20 right-20 p-4 bg-dark-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl transform rotate-6 animate-float">
              <div className="flex gap-3 items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                <div className="h-2 w-24 bg-slate-600/50 rounded"></div>
              </div>
              <div className="mt-3 h-16 w-32 bg-gradient-to-tr from-slate-700/50 to-slate-600/50 rounded"></div>
            </div>

            <div className="absolute bottom-40 left-20 p-4 bg-dark-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl transform -rotate-3 animate-float-delayed">
              <div className="flex gap-3 items-center mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <div className="text-xs text-white font-mono">Status: Ativo</div>
              </div>
              <div className="flex gap-1">
                <div className="h-8 w-2 bg-emerald-500 rounded-sm shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                <div className="h-5 w-2 bg-emerald-600 rounded-sm"></div>
                <div className="h-10 w-2 bg-emerald-400 rounded-sm shadow-[0_0_5px_rgba(52,211,153,0.5)]"></div>
                <div className="h-6 w-2 bg-emerald-500 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;