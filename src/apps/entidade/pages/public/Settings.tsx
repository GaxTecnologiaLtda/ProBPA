import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/ui/Components';
import { Building2, Camera, Save, Info, Shield, Bell, UploadCloud } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEntityData } from '../../hooks/useEntityData';

const Settings: React.FC = () => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { claims } = useAuth();
  const { entity, loading } = useEntityData(claims?.entityId);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full p-10">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Configurações</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            Personalize os dados da entidade e preferências do sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ambiente Seguro</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Coluna Esquerda: Identidade Visual */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center relative overflow-hidden border-t-4 border-t-blue-500">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Identidade Visual</h3>

            <div className="relative w-32 h-32 mx-auto mb-6 group">
              <div className="w-full h-full rounded-full border-4 border-blue-100 dark:border-blue-900 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-inner">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110">
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
              </label>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-left">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  Este logotipo será utilizado automaticamente no cabeçalho de todos os relatórios (PDF) gerados pelo sistema e no ícone de perfil da entidade.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" /> Preferências
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <span className="text-sm text-gray-700 dark:text-gray-300">Notificar fechamento de BPA</span>
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <span className="text-sm text-gray-700 dark:text-gray-300">Alertas de Metas em Risco</span>
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" defaultChecked />
              </label>
            </div>
          </Card>
        </div>

        {/* Coluna Direita: Dados Institucionais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                Dados Institucionais
              </h2>
              <Button variant="outline" className="text-xs">Atualizar do CNES</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Nome Oficial da Entidade"
                  defaultValue={entity?.name || ""}
                  placeholder="Nome da Entidade"
                />
              </div>
              <Input
                label="CNPJ"
                defaultValue={entity?.cnpj || ""}
                placeholder="00.000.000/0000-00"
              />
              <Input
                label="Responsável"
                defaultValue={entity?.responsible || ""}
                placeholder="Nome do Responsável"
              />
              <div className="md:col-span-2">
                <Input
                  label="Endereço Completo"
                  defaultValue={entity?.address ? `${entity.address} - ${entity.cep}` : ""}
                  placeholder="Endereço, Número, Bairro - CEP"
                />
              </div>
              <Input
                label="Telefone Oficial"
                defaultValue={entity?.phone || ""}
                placeholder="(00) 0000-0000"
              />
              <Input
                label="E-mail Institucional"
                defaultValue={entity?.email || ""}
                placeholder="email@entidade.com.br"
              />
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <Button variant="primary" className="px-8 py-2.5 shadow-lg shadow-blue-500/20">
                <Save className="w-4 h-4 mr-2" /> Salvar Alterações
              </Button>
            </div>
          </Card>

          {/* System Info Footer */}
          <div className="text-center pt-8 border-t border-gray-200 dark:border-gray-700/50">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ProBPA - Painel da Entidade Pública</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Versão 2.5.0 (Build 20240825) • GAX Tecnologia</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;