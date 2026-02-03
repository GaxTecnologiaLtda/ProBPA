import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type Container, type ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { useApp } from "../context";

export const ParticlesBackground = () => {
    const [init, setInit] = useState(false);
    const { theme } = useApp();

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesLoaded = async (container?: Container): Promise<void> => {
        // console.log(container);
    };

    const options: ISourceOptions = useMemo(
        () => ({
            background: {
                color: {
                    value: "transparent", // Use container background
                },
            },
            fpsLimit: 60, // Optimize for performance
            interactivity: {
                events: {
                    onClick: {
                        enable: true,
                        mode: "push",
                    },
                    onHover: {
                        enable: true,
                        mode: "grab",
                    },
                },
                modes: {
                    push: {
                        quantity: 4,
                    },
                    grab: {
                        distance: 140,
                        links: {
                            opacity: 0.5,
                        },
                    },
                },
            },
            particles: {
                color: {
                    value: theme === 'dark' ? "#10b981" : "#059669", // Emerald colors
                },
                links: {
                    color: theme === 'dark' ? "#34d399" : "#059669",
                    distance: 150,
                    enable: true,
                    opacity: 0.3,
                    width: 1,
                },
                move: {
                    direction: "none",
                    enable: true,
                    outModes: {
                        default: "bounce",
                    },
                    random: false,
                    speed: 1.5, // Gentle speed
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        area: 800,
                    },
                    value: 80,
                },
                opacity: {
                    value: 0.5,
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 2.5 },
                },
            },
            detectRetina: true,
        }),
        [theme],
    );

    // Background gradient similar to previous design but without manual SVG
    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-40 mix-blend-overlay z-0 pointer-events-none"></div>

            <div className="absolute inset-0 z-0 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0)',
                backgroundSize: '40px 40px'
            }}></div>

            {init && (
                <Particles
                    id="tsparticles"
                    particlesLoaded={particlesLoaded}
                    options={options}
                    className="absolute inset-0 z-0"
                />
            )}
        </div>
    );
};
