import React, { useState } from 'react';
import { Card, Button, Input, Select, Switch, Badge, Tooltip } from '../components/Common';
import { Save, Lock, Globe, ShieldCheck, Bell, Server, Key, Eye, EyeOff, Copy, RefreshCw, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // State for all settings
  const [settings, setSettings] = useState({
    // General
    language: 'pt-BR',
    timezone: 'sp',
    maintenanceMode: false,
    
    // Security
    passwordExpiration: true,
    passwordDays: '90',
    twoFactor: false,
    sessionTimeout: '30', // minutes

    // Notifications
    emailAlerts: true,
    weeklyReport: false,
    systemUpdates: true,

    // Integration
    webhookUrl: 'https://api.cliente.com.br/webhooks/probpa',
    apiKey: 'sk_live_gax_8392839283928_sec_9912'
  });

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setHasChanges(false);
      alert("Configurações salvas com sucesso!");
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado para a área de transferência!");
  };

  const handleRegenerateKey = () => {
    if(window.confirm("Tem certeza? A chave anterior deixará de funcionar imediatamente.")) {
        handleChange('apiKey', `sk_live_gax_${Math.random().toString(36).substring(2)}_${Date.now()}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações do Sistema</h1>
                <p className="text-slate-500">Gerencie preferências globais, segurança e integrações.</p>
            </div>
            <div className="flex items-center gap-3">
                 {hasChanges && (
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                        Alterações não salvas
                    </span>
                 )}
                 <Button 
                    icon={Save} 
                    onClick={handleSave} 
                    disabled={isLoading || !hasChanges}
                    className={!hasChanges ? 'opacity-50' : ''}
                 >
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                 </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: General & Security */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* --- GENERAL PREFERENCES --- */}
                <Card title="Preferências Gerais" className="border-t-4 border-t-corp-500">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Globe className="w-5 h-5 text-slate-400 mb-2" />
                                <Select 
                                    label="Idioma Padrão" 
                                    value={settings.language}
                                    onChange={(e) => handleChange('language', e.target.value)}
                                    options={[
                                        {value: 'pt-BR', label: 'Português (Brasil)'}, 
                                        {value: 'en', label: 'English (US)'},
                                        {value: 'es', label: 'Español'}
                                    ]} 
                                />
                            </div>
                            <div>
                                <div className="w-5 h-5 mb-2"></div> {/* Spacer to align */}
                                <Select 
                                    label="Fuso Horário" 
                                    value={settings.timezone}
                                    onChange={(e) => handleChange('timezone', e.target.value)}
                                    options={[
                                        {value: 'sp', label: 'Brasília (GMT-3)'}, 
                                        {value: 'manaus', label: 'Manaus (GMT-4)'},
                                        {value: 'utc', label: 'UTC (GMT+0)'}
                                    ]} 
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-dark-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${settings.maintenanceMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Modo de Manutenção</h4>
                                    <p className="text-xs text-slate-500 max-w-md">
                                        Quando ativo, impede o acesso de usuários comuns ao sistema, permitindo apenas Super Admins. Útil para atualizações críticas.
                                    </p>
                                </div>
                            </div>
                            <Switch 
                                checked={settings.maintenanceMode}
                                onChange={(val) => handleChange('maintenanceMode', val)}
                            />
                        </div>
                    </div>
                </Card>

                {/* --- SECURITY --- */}
                <Card title="Segurança e Acesso" className="border-t-4 border-t-slate-500">
                    <div className="space-y-6">
                        {/* Password Policy */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex gap-3">
                                <Lock className="w-5 h-5 text-slate-400 mt-1" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Rotação de Senhas</h4>
                                    <p className="text-xs text-slate-500">Obrigar usuários a redefinirem a senha periodicamente.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {settings.passwordExpiration && (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            className="w-16 text-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-950 text-sm py-1"
                                            value={settings.passwordDays}
                                            onChange={(e) => handleChange('passwordDays', e.target.value)}
                                        />
                                        <span className="text-sm text-slate-500">dias</span>
                                    </div>
                                )}
                                <Switch 
                                    checked={settings.passwordExpiration}
                                    onChange={(val) => handleChange('passwordExpiration', val)}
                                />
                            </div>
                        </div>

                        {/* 2FA */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex gap-3">
                                <ShieldCheck className="w-5 h-5 text-slate-400 mt-1" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Autenticação de Dois Fatores (2FA)</h4>
                                    <p className="text-xs text-slate-500">Forçar uso de 2FA para todos os administradores.</p>
                                </div>
                            </div>
                            <Switch 
                                checked={settings.twoFactor}
                                onChange={(val) => handleChange('twoFactor', val)}
                            />
                        </div>

                        {/* Session Timeout */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Timeout da Sessão (Minutos)</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="120" 
                                    step="5"
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-corp-600"
                                    value={settings.sessionTimeout}
                                    onChange={(e) => handleChange('sessionTimeout', e.target.value)}
                                />
                                <span className="w-12 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                                    {settings.sessionTimeout}m
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right Column: Integration & Notifications */}
            <div className="space-y-8">
                
                {/* --- API & INTEGRATION --- */}
                <Card title="Integração e API" className="border-t-4 border-t-purple-500">
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <Key className="w-4 h-4" /> Token de Acesso Global
                            </label>
                            <div className="relative">
                                <input 
                                    type={showApiKey ? "text" : "password"}
                                    className="w-full pr-20 pl-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-dark-900 text-slate-600 dark:text-slate-300 font-mono text-sm focus:ring-2 focus:ring-corp-500"
                                    value={settings.apiKey}
                                    readOnly
                                />
                                <div className="absolute right-2 top-2 flex items-center gap-1">
                                    <Tooltip content={showApiKey ? "Ocultar" : "Mostrar"}>
                                        <button onClick={() => setShowApiKey(!showApiKey)} className="p-1.5 text-slate-400 hover:text-corp-500 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800">
                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Copiar Chave">
                                        <button onClick={() => copyToClipboard(settings.apiKey)} className="p-1.5 text-slate-400 hover:text-corp-500 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button 
                                    onClick={handleRegenerateKey}
                                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                                >
                                    <RefreshCw className="w-3 h-3" /> Regenerar Token
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <Server className="w-4 h-4" /> Webhook de Eventos
                            </label>
                            <Input 
                                placeholder="https://"
                                value={settings.webhookUrl}
                                onChange={(e) => handleChange('webhookUrl', e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                URL para receber notificações POST de eventos do sistema (ex: licença expirada).
                            </p>
                        </div>
                    </div>
                </Card>

                {/* --- NOTIFICATIONS --- */}
                <Card title="Notificações" className="border-t-4 border-t-emerald-500">
                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <div className="flex gap-3 items-center">
                                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Alertas Críticos por Email</span>
                            </div>
                            <Switch checked={settings.emailAlerts} onChange={(val) => handleChange('emailAlerts', val)} />
                         </div>

                         <div className="flex items-center justify-between">
                            <div className="flex gap-3 items-center">
                                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Relatório Semanal de Gestão</span>
                            </div>
                            <Switch checked={settings.weeklyReport} onChange={(val) => handleChange('weeklyReport', val)} />
                         </div>

                         <div className="flex items-center justify-between">
                            <div className="flex gap-3 items-center">
                                <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    <Bell className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Notificações de Sistema</span>
                            </div>
                            <Switch checked={settings.systemUpdates} onChange={(val) => handleChange('systemUpdates', val)} />
                         </div>
                    </div>
                </Card>

                {/* --- SYSTEM STATUS --- */}
                <div className="bg-slate-800 dark:bg-black rounded-xl p-6 text-white shadow-lg">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Status do Servidor</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Versão do Sistema</span>
                            <span className="font-mono text-sm font-bold text-emerald-400">v2.4.0-stable</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Banco de Dados</span>
                            <div className="flex items-center gap-2 text-emerald-400">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-xs font-bold uppercase">Conectado</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Último Backup</span>
                            <span className="text-sm text-slate-400">Hoje, 03:00 AM</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default Settings;