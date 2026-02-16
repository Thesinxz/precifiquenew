import { z } from 'zod';

// Helper Regex
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

export const signupSchema = z.object({
    fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .regex(passwordRegex, 'Senha deve conter maiúscula, minúscula, número e caractere especial'),
    confirmPassword: z.string(),
    document: z.string().refine((val) => {
        const clean = val.replace(/\D/g, '');
        return clean.length === 11 || clean.length === 14;
    }, 'CPF ou CNPJ inválido'),
    orgCode: z.string().optional(),
    cep: z.string().optional(),
    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressNeighborhood: z.string().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    addressComplement: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});
