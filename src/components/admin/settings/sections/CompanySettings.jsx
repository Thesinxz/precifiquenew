import { InputGroup } from './_Shared';

export function CompanySettings({ data, onChange }) {
    const handleChange = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Dados da Empresa</h3>
                <div className="space-y-4">
                    <InputGroup
                        label="Nome da Loja"
                        value={data?.name || ''}
                        onChange={v => handleChange('name', v)}
                        placeholder="Ex: Minha Loja Tech"
                    />
                    <InputGroup
                        label="CNPJ (Opcional)"
                        value={data?.cnpj || ''}
                        onChange={v => handleChange('cnpj', v)}
                        placeholder="00.000.000/0000-00"
                    />
                    <InputGroup
                        label="Endereço / Cidade"
                        value={data?.address || ''}
                        onChange={v => handleChange('address', v)}
                        placeholder="São Paulo, SP"
                    />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Identidade Visual</h3>
                <div className="space-y-4">
                    <InputGroup
                        label="URL da Logomarca"
                        value={data?.logoUrl || ''}
                        onChange={v => handleChange('logoUrl', v)}
                        placeholder="https://exemplo.com/logo.png"
                    />
                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-center gap-4">
                        {data?.logoUrl ? (
                            <img src={data.logoUrl} alt="Logo Preview" className="h-12 w-auto object-contain rounded-md shadow-sm" />
                        ) : (
                            <div className="h-12 w-12 bg-slate-100 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">Logo</div>
                        )}
                        <p className="text-xs text-slate-400 font-medium">Use uma imagem quadrada ou horizontal com fundo transparente para melhor resultado no recibo.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
