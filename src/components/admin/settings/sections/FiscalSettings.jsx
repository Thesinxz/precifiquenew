import React, { useState } from 'react';
import { ShieldCheck, Upload, FileText, Smartphone } from 'lucide-react';
import { InputGroup } from './_Shared';
import { storage } from '../../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '../../../ui/Toast';

export function FiscalSettings({ data, onChange }) {
    const { showToast } = useToast();
    const [uploading, setUploading] = useState(false);

    const handleUpdate = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
            showToast('Por favor, selecione um arquivo .pfx ou .p12', 'error');
            return;
        }

        if (!data?.certificatePassword) {
            showToast('Por favor, defina a senha do certificado antes de fazer upload', 'warning');
            return;
        }

        setUploading(true);
        try {
            // Upload to Firebase Storage
            const storageRef = ref(storage, `certificates/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update settings with certificate info
            handleUpdate('certificateName', file.name);
            handleUpdate('certificateUrl', downloadURL);
            handleUpdate('certificatePath', storageRef.fullPath);
            handleUpdate('certificateExpiry', '2025-12-31'); // TODO: Extract from certificate

            showToast('Certificado enviado com sucesso!', 'success');
        } catch (error) {
            console.error('Error uploading certificate:', error);
            showToast('Erro ao enviar certificado: ' + error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Environment */}
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Ambiente de Emissão</h3>
                    <p className="text-xs text-slate-500">Define se as notas têm validade jurídica.</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button
                        onClick={() => handleUpdate('environment', 'homologation')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${data?.environment === 'homologation' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Homologação (Teste)
                    </button>
                    <button
                        onClick={() => handleUpdate('environment', 'production')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${data?.environment === 'production' ? 'bg-emerald-500 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Produção (Valendo)
                    </button>
                </div>
            </div>

            {/* Company Tax Info */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Dados Tributários
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                        label="CNPJ"
                        value={data?.cnpj || ''}
                        onChange={v => handleUpdate('cnpj', v)}
                        placeholder="00.000.000/0000-00"
                    />
                    <InputGroup
                        label="Inscrição Estadual (IE)"
                        value={data?.ie || ''}
                        onChange={v => handleUpdate('ie', v)}
                        placeholder="Ex: 123.456.789.111"
                    />
                    <InputGroup
                        label="Inscrição Municipal (IM)"
                        value={data?.im || ''}
                        onChange={v => handleUpdate('im', v)}
                        placeholder="Opcional"
                    />
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Regime Tributário (CRT)</label>
                        <select
                            value={data?.crt || '1'}
                            onChange={e => handleUpdate('crt', e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                        >
                            <option value="1">Simples Nacional</option>
                            <option value="2">Simples Nacional (Excesso Sublimite)</option>
                            <option value="3">Regime Normal (Lucro Presumido/Real)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* NFC-e Token (CSC) */}
            <div className="pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    Token NFC-e (CSC)
                </h3>
                <p className="text-sm text-slate-500 mb-6">Necessário para emitir cupom fiscal (NFC-e). Obtenha no site da Sefaz do seu estado.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <InputGroup
                            label="ID do Token (CSC ID)"
                            value={data?.cscId || ''}
                            onChange={v => handleUpdate('cscId', v)}
                            placeholder="Ex: 000001"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <InputGroup
                            label="Código de Segurança (CSC)"
                            value={data?.csc || ''}
                            onChange={v => handleUpdate('csc', v)}
                            placeholder="Ex: ABC123DEF456..."
                            type="password"
                        />
                    </div>
                </div>
            </div>

            {/* Digital Certificate */}
            <div className="pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Certificado Digital A1
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div>
                            {data?.certificateName ? (
                                <div className="space-y-1">
                                    <p className="font-black text-emerald-600 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Certificado Ativo
                                    </p>
                                    <p className="text-xs text-slate-500 font-bold">{data.certificateName}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Validade: {data.certificateExpiry}</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <p className="font-black text-slate-400">Nenhum certificado instalado</p>
                                    <p className="text-xs text-slate-500">Envie o arquivo .pfx ou .p12</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 items-center w-full md:w-auto">
                            <div className="w-32">
                                <InputGroup
                                    label="Senha"
                                    value={data?.certificatePassword || ''}
                                    onChange={v => handleUpdate('certificatePassword', v)}
                                    type="password"
                                    compactLabel
                                />
                            </div>
                            <label className={`cursor-pointer bg-white border-2 border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-slate-500 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Upload className="w-4 h-4" />
                                {uploading ? 'Enviando...' : 'Upload'}
                                <input
                                    type="file"
                                    accept=".pfx,.p12"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
