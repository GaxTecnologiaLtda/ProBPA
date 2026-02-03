import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/ui/Components';
import { Globe, Camera, Save, Info, Shield, Bell, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface EntityData {
  address: string;
  cep: string;
  cnpj: string;
  email: string;
  entityKind: string;
  location: string;
  managerRole: string;
  name: string;
  phone: string;
  privateType: string;
  responsible: string;
  status: string;
  type: string;
  logoUrl?: string;
  watermarkEnabled?: boolean;
}

const Settings: React.FC = () => {
  const { claims } = useAuth();
  const isCoordenacao = !!claims?.coordenation;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [entityData, setEntityData] = useState<EntityData>({
    address: '',
    cep: '',
    cnpj: '',
    email: '',
    entityKind: '',
    location: '',
    managerRole: '',
    name: '',
    phone: '',
    privateType: '',
    responsible: '',
    status: '',
    type: '',
    logoUrl: '',
    watermarkEnabled: true,
  });

  useEffect(() => {
    const fetchEntityData = async () => {
      if (!claims?.entityId) return;

      try {
        const docRef = doc(db, 'entities', claims.entityId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as EntityData;
          setEntityData({
            ...data,
            watermarkEnabled: data.watermarkEnabled !== undefined ? data.watermarkEnabled : true
          });
          if (data.logoUrl) {
            setLogoPreview(data.logoUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching entity data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntityData();
  }, [claims?.entityId]);

  const handleInputChange = (field: keyof EntityData, value: any) => {
    setEntityData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && claims?.entityId) {
      const file = e.target.files[0];
      setUploadingLogo(true);

      try {
        // Create local preview and get Base64
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error("Failed to read file"));
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });

        setLogoPreview(base64String);

        // Upload to Firebase Storage
        // Path: entities/{entityId}/logos/logo.png (always overwrite 'logo' to handle replacement automatically)
        // Or preserve extension if critical, but standardizing to 'logo' usually simpler for cleanup.
        // User asked to "remove previous", overwriting same path achieves this efficiently.
        const storageRef = ref(storage, `entities/${claims.entityId}/logos/logo_${Date.now()}`); // Adding timestamp to force cache bust if needed, or stick to static.
        // User asked: "substituir um logotipo ... inclusive removendo o anterior".
        // Using a unique name allows tracking, but requires explicit delete.
        // Simplest "Replace" strategy: Use a static filename like 'logo_main'.
        const steadyRef = ref(storage, `entities/${claims.entityId}/logos/logo_main`);

        await uploadBytes(steadyRef, file);
        const url = await getDownloadURL(steadyRef);

        setEntityData(prev => ({ ...prev, logoUrl: url }));
        setLogoPreview(url); // Ensure preview is set (redundant but safe)

        // Save URL and Base64 immediately to Firestore
        // We save Base64 to bypass CORS issues when generating PDF
        const docRef = doc(db, 'entities', claims.entityId);

        await updateDoc(docRef, {
          logoUrl: url,
          logoBase64: base64String
        });

        // Log Action
        try {
          // @ts-ignore
          const { logAction } = await import('../../services/logsService');
          await logAction({
            action: 'CONFIG',
            target: 'SYSTEM',
            description: 'Atualizou logotipo da entidade',
            entityId: claims.entityId
          });
        } catch (e) { console.error(e); }

      } catch (error) {
        console.error("Error uploading logo:", error);
        alert("Erro ao fazer upload do logotipo.");
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  const handleSave = async () => {
    if (!claims?.entityId) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'entities', claims.entityId);
      await updateDoc(docRef, { ...entityData });

      // Log Action
      try {
        // @ts-ignore
        const { logAction } = await import('../../services/logsService');
        await logAction({
          action: 'CONFIG',
          target: 'SYSTEM',
          description: 'Atualizou configurações da entidade',
          entityId: claims.entityId
        });
      } catch (e) { console.error(e); }

      alert("Dados atualizados com sucesso! Se você enviou um novo logotipo, ele já está pronto para uso nos relatórios.");
    } catch (error) {
      console.error("Error updating entity:", error);
      alert("Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Configurações da Instituição</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            Gerencie a identidade e os dados da organização matriz.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {entityData.status === 'Ativa' ? 'Conta Verificada' : 'Status: ' + entityData.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Coluna Esquerda: Identidade Visual */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center relative overflow-hidden border-t-4 border-t-emerald-500">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Logotipo Institucional</h3>

            <div className="relative w-32 h-32 mx-auto mb-6 group">
              <div className="w-full h-full rounded-full border-4 border-emerald-100 dark:border-emerald-900 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-inner relative">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                )}

                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label className={`absolute bottom-0 right-0 bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110 ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo || isCoordenacao} />
              </label>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-left">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  Este logotipo representará sua organização em todos os sub-painéis municipais e relatórios gerenciais unificados.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Relatórios
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <span className="text-sm text-gray-700 dark:text-gray-300">Incluir marca d'água</span>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  checked={entityData.watermarkEnabled}
                  onChange={(e) => handleInputChange('watermarkEnabled', e.target.checked)}
                  disabled={isCoordenacao}
                />
              </label>
            </div>
          </Card>
        </div>

        {/* Coluna Direita: Dados Institucionais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                Dados da Organização
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Razão Social / Nome da Instituição"
                  value={entityData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isCoordenacao}
                />
              </div>
              <Input
                label="CNPJ Matriz"
                value={entityData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                disabled={isCoordenacao}
              />
              <Input
                label="Tipo da Entidade"
                value={entityData.entityKind || entityData.privateType || entityData.type}
                onChange={(e) => handleInputChange('entityKind', e.target.value)}
                disabled // Usually type is immutable or managed elsewhere
              />
              <div className="md:col-span-2">
                <Input
                  label="Endereço da Sede"
                  value={entityData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={isCoordenacao}
                />
              </div>
              <Input
                label="CEP"
                value={entityData.cep}
                onChange={(e) => handleInputChange('cep', e.target.value)}
                disabled={isCoordenacao}
              />
              <Input
                label="Localização"
                value={entityData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={isCoordenacao}
              />
              <Input
                label="Telefone Administrativo"
                value={entityData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={isCoordenacao}
              />
              <Input
                label="E-mail de Contato"
                value={entityData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isCoordenacao}
              />
              <div className="md:col-span-2">
                <Input
                  label="Responsável Legal"
                  value={entityData.responsible}
                  onChange={(e) => handleInputChange('responsible', e.target.value)}
                  disabled={isCoordenacao}
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              {!isCoordenacao && (
                <Button
                  variant="secondary"
                  className="px-8 py-2.5 shadow-lg shadow-emerald-500/20"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Alterações
                </Button>
              )}
            </div>
          </Card>

          {/* System Info Footer */}
          <div className="text-center pt-8 border-t border-gray-200 dark:border-gray-700/50">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ProBPA - Painel da Entidade Privada</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Versão 2.5.0 (Build 20240825) • GAX Tecnologia</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;