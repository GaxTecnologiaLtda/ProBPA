import React from 'react';
import { PlayCircle, Video } from 'lucide-react';

const TutorialsSubsede: React.FC = () => {
    const tutorials = [
        {
            id: 'intro',
            title: 'Introdução',
            videoUrl: 'https://firebasestorage.googleapis.com/v0/b/probpa-025.firebasestorage.app/o/tutoriais%2Fsubsede%2FIntroduc%CC%A7a%CC%83o!.mp4?alt=media&token=5f9185a9-ad5e-4bc3-ab18-d46775ef84d9',
            description: 'Visão geral do sistema e primeiros passos no painel da Subsede.',
        },
        {
            id: 'export',
            title: 'Como exportar relatórios',
            videoUrl: null,
            description: 'Aprenda a gerar exportações, PDFs e planilhas dos seus relatórios.',
        },
        {
            id: 'production',
            title: 'Como Lançar producões',
            videoUrl: 'https://firebasestorage.googleapis.com/v0/b/probpa-025.firebasestorage.app/o/tutoriais%2Fsubsede%2FComo%20lanc%CC%A7ar%20produc%CC%A7o%CC%83es!.mp4?alt=media&token=a43e0cd3-df5b-4c65-bfa2-ff13605e65d9',
            description: 'Guia passo a passo para registrar a produção ambulatorial local.',
        }
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center mb-8">
                <PlayCircle className="w-8 h-8 text-orange-600 mr-3" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tutoriais</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aprenda a utilizar todos os recursos da Subsede</p>
                </div>
            </div>

            <div className="space-y-12">
                {tutorials.map((tutorial, index) => (
                    <div key={tutorial.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">{index + 1}</span>
                                    {tutorial.title}
                                </h2>
                                <p className="text-gray-500 mt-2 ml-11">{tutorial.description}</p>
                            </div>
                        </div>
                        <div className="p-6 md:p-8 bg-gray-900 flex justify-center items-center">
                            {tutorial.videoUrl ? (
                                <video 
                                    controls 
                                    className="w-full max-w-4xl rounded-lg shadow-xl"
                                    preload="metadata"
                                >
                                    <source src={tutorial.videoUrl} type="video/mp4" />
                                    Seu navegador não suporta a reprodução de vídeos.
                                </video>
                            ) : (
                                <div className="py-24 text-center w-full">
                                    <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-300">Em Breve</h3>
                                    <p className="text-gray-500">Este tutorial estará disponível futuramente.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TutorialsSubsede;
