export const fetchAddressByCEP = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (data.erro) return null;

        return {
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
            complement: data.complemento || ''
        };
    } catch (error) {
        console.error("ViaCEP Error:", error);
        return null;
    }
};
